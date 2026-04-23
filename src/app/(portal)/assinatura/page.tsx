'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { totvs } from '@/lib/totvs/client'
import type { EduAluno, EduContrato } from '@/lib/totvs/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AssinaturaPage() {
  const router = useRouter()
  const params = useSearchParams()
  const ra = params.get('ra') ?? ''
  const codColigada = Number(params.get('codColigada') ?? 0)
  const codFilial = Number(params.get('codFilial') ?? 0)
  const formaPagamento = params.get('formaPagamento') ?? 'PIX'

  const [aluno, setAluno] = useState<EduAluno | null>(null)
  const [contrato, setContrato] = useState<EduContrato | null>(null)
  const [aceiteTermos, setAceiteTermos] = useState(false)
  const [aceiteDebito, setAceiteDebito] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

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

  // Workaround: DataServerParamsSchema exige codColigada em URL params para POST
  // mas totvs.post() só adiciona params na URL para GET (bug no client.ts do Agente 1).
  async function totvsSend(endpoint: string, data: unknown) {
    const qs = new URLSearchParams({ codColigada: String(codColigada), codFilial: String(codFilial) })
    const res = await fetch(`/api/totvs/rest/${endpoint}?${qs.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`${endpoint} POST falhou: ${res.status}`)
  }

  async function handleConfirmar() {
    if (!aceiteTermos || !aluno || !contrato) return
    setSubmitting(true)
    setErro(null)

    try {
      await totvsSend('EduMatriculaData', {
        RA: ra,
        CODCOLIGADA: codColigada,
        CODFILIAL: codFilial,
        CODPERIODO: contrato.CODPERIODO,
        TIPOINGRESSO: 'REMATRICULA',
      })

      await totvsSend('EduContratoData', {
        RA: ra,
        CODCOLIGADA: codColigada,
        CODFILIAL: codFilial,
        IDCONTRATO: contrato.IDCONTRATO,
        FORMAPAGAMENTO: formaPagamento,
        ACEITEAUTORIZADEBITO: aceiteDebito,
      })

      router.push('/conclusao?status=sucesso')
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
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="aceite-termos"
            checked={aceiteTermos}
            onCheckedChange={v => setAceiteTermos(v === true)}
          />
          <Label htmlFor="aceite-termos" className="text-sm leading-relaxed cursor-pointer">
            Li e aceito os termos do contrato de matrícula
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="aceite-debito"
            checked={aceiteDebito}
            onCheckedChange={v => setAceiteDebito(v === true)}
          />
          <Label htmlFor="aceite-debito" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">
            Autorizo desconto em folha / débito automático (opcional)
          </Label>
        </div>
      </div>

      {/* Tarefa 2.C: assinatura como momento positivo — sem vermelho agressivo */}
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
          onClick={handleConfirmar}
        >
          {submitting ? 'Confirmando…' : 'Confirmar Matrícula'}
        </Button>
      </div>
    </div>
  )
}
