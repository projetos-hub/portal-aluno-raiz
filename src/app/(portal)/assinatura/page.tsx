'use client'

import { useContext, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { totvs } from '@/lib/totvs/client'
import type { EduAluno, EduContrato } from '@/lib/totvs/types'
import { BrandThemeContext } from '@/lib/brand-theme'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FORMA_LABELS: Record<string, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto bancário',
  DEBITO: 'Débito automático',
}

export default function AssinaturaPage() {
  const router = useRouter()
  const params = useSearchParams()
  const ra = params.get('ra') ?? ''
  const codColigada = Number(params.get('codColigada') ?? 0)
  const codFilial = Number(params.get('codFilial') ?? 0)
  const formaPagamento = params.get('formaPagamento') ?? 'PIX'

  const theme = useContext(BrandThemeContext)

  const [aluno, setAluno] = useState<EduAluno | null>(null)
  const [contrato, setContrato] = useState<EduContrato | null>(null)
  const [aceiteTermos, setAceiteTermos] = useState(false)
  const [aceiteDebito, setAceiteDebito] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!ra || !codColigada) return
    async function load() {
      try {
        const [alunoRes, contRes] = await Promise.all([
          totvs.get<EduAluno>('EduAlunoData', { RA: ra, codColigada, codFilial }),
          totvs.get<EduContrato>('EduContratoData', { RA: ra, codColigada, codFilial }),
        ])
        setAluno(alunoRes.data?.[0] ?? null)
        setContrato(contRes.data?.[0] ?? null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [ra, codColigada, codFilial])

  // Foca o botão "Confirmar" do modal ao abrir
  useEffect(() => {
    if (modalOpen) confirmBtnRef.current?.focus()
  }, [modalOpen])

  // Fechar modal com Escape
  useEffect(() => {
    if (!modalOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [modalOpen])

  async function handleConfirmar() {
    if (!aceiteTermos || !aluno || !contrato) return
    setModalOpen(false)
    setSubmitting(true)
    setErro(null)

    try {
      const urlParams = { codColigada, codFilial }
      const matRes = await totvs.post<{ IDMATRICULA?: string }>(
        'EduMatriculaData',
        { RA: ra, CODCOLIGADA: codColigada, CODFILIAL: codFilial, CODPERIODO: contrato.CODPERIODO, TIPOINGRESSO: 'REMATRICULA' },
        urlParams,
      )
      const idMatricula = matRes.data?.[0]?.IDMATRICULA ?? ''

      await totvs.post(
        'EduContratoData',
        { RA: ra, CODCOLIGADA: codColigada, CODFILIAL: codFilial, IDCONTRATO: contrato.IDCONTRATO, FORMAPAGAMENTO: formaPagamento, ACEITEAUTORIZADEBITO: aceiteDebito },
        urlParams,
      )

      const qs = new URLSearchParams({ status: 'sucesso' })
      if (idMatricula) qs.set('idMatricula', idMatricula)
      router.push(`/conclusao?${qs.toString()}`)
    } catch {
      setErro('Erro ao confirmar matrícula. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="relative max-w-lg mx-auto space-y-4 pb-8">
      {submitting && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Confirmando matrícula"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Confirmando matrícula…</p>
        </div>
      )}

      {/* Modal de confirmação — aparece antes do POST */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-4 sm:p-6 space-y-4 animate-fade-up"
          >
            <div>
              <h2 id="modal-title" className="text-lg font-semibold">
                Confirmar rematrícula?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Revise os dados antes de finalizar.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aluno</span>
                <span className="font-medium">{aluno?.NOME ?? ra}</span>
              </div>
              {theme && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escola</span>
                  <span className="font-medium">{theme.nomeEscola}</span>
                </div>
              )}
              {contrato && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor final</span>
                    <span className="font-semibold" style={{ color: 'var(--cor-primaria, #1e40af)' }}>
                      {moeda(contrato.VALORFINAL)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagamento</span>
                    <span>{FORMA_LABELS[formaPagamento] ?? formaPagamento}</span>
                  </div>
                </>
              )}
            </div>

            {/* min-h-[44px] para touch targets em 375px */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                ref={confirmBtnRef}
                className="flex-1 min-h-[44px]"
                style={{ background: 'linear-gradient(135deg, var(--cor-primaria, #1e40af), var(--cor-secundaria, #1e3a8a))' }}
                onClick={() => void handleConfirmar()}
                disabled={submitting}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-lg font-semibold">Assinatura Digital</h1>

      {/* Resumo */}
      <Card>
        <CardContent className="pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aluno</span>
            <span className="font-medium">{aluno?.NOME ?? ra}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Período</span>
            <span>{contrato?.CODPERIODO ?? '2026/1'}</span>
          </div>
          {contrato && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor final</span>
                <span className="font-semibold">{moeda(contrato.VALORFINAL)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forma de pagamento</span>
                <span>{formaPagamento}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Checkboxes */}
      <div className="space-y-3" role="group" aria-label="Termos de aceite">
        <div className="flex items-start gap-3">
          <Checkbox
            id="aceite-termos"
            checked={aceiteTermos}
            onCheckedChange={v => setAceiteTermos(v === true)}
            aria-describedby="aceite-termos-desc"
            aria-required="true"
          />
          <Label htmlFor="aceite-termos" className="text-sm leading-relaxed cursor-pointer">
            <span id="aceite-termos-desc">
              Li e aceito os termos do contrato de matrícula
              <span className="sr-only"> (obrigatório para confirmar)</span>
            </span>
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="aceite-debito"
            checked={aceiteDebito}
            onCheckedChange={v => setAceiteDebito(v === true)}
            aria-describedby="aceite-debito-desc"
          />
          <Label htmlFor="aceite-debito" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">
            <span id="aceite-debito-desc">
              Autorizo desconto em folha / débito automático
              <span className="sr-only"> (opcional)</span>
            </span>
          </Label>
        </div>
      </div>

      {/* Mensagem positiva */}
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: 'var(--cor-primaria-10, rgba(30,64,175,0.08))',
          border: '1px solid var(--cor-primaria-20, rgba(30,64,175,0.15))',
        }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--cor-primaria, #1e40af)' }}>
          🎓 Ao confirmar, a vaga do seu filho no próximo ano letivo estará garantida.
        </p>
      </div>

      {erro && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{erro}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
          Voltar
        </Button>
        <Button
          className="flex-1"
          disabled={!aceiteTermos || submitting}
          style={{ backgroundColor: 'var(--cor-primaria, #1e40af)' }}
          onClick={() => setModalOpen(true)}
        >
          {submitting ? 'Confirmando…' : 'Confirmar Matrícula'}
        </Button>
      </div>
    </div>
  )
}
