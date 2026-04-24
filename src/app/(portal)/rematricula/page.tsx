'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { totvs } from '@/lib/totvs/client'
import type { EduAluno, EduMatricula, EduContrato } from '@/lib/totvs/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

type FormaPagamento = 'PIX' | 'BOLETO' | 'DEBITO'

type ResponsavelData = { nome: string; cpf: string; email: string; telefone: string }

const responsavelSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (use 000.000.000-00)'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido (use (00) 00000-0000)'),
})

function maskCPF(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const FORMA_LABELS: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto bancário',
  DEBITO: 'Débito automático',
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function useAnimatedValue(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const start = useCallback(() => {
    const startTime = performance.now()
    const startVal = 0
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [target, duration])

  useEffect(() => {
    if (target > 0) start()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, start])

  return value
}

export default function RematriculaPage() {
  const router = useRouter()
  const params = useSearchParams()
  const ra = params.get('ra') ?? ''
  const codColigada = Number(params.get('codColigada') ?? 0)
  const codFilial = Number(params.get('codFilial') ?? 0)

  const [aluno, setAluno] = useState<EduAluno | null>(null)
  const [matricula, setMatricula] = useState<EduMatricula | null>(null)
  const [contrato, setContrato] = useState<EduContrato | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [savedResp, setSavedResp] = useState<ResponsavelData | null>(null)
  const [editingResp, setEditingResp] = useState(false)
  const [respForm, setRespForm] = useState<ResponsavelData>({ nome: '', cpf: '', email: '', telefone: '' })
  const [respErrors, setRespErrors] = useState<Partial<Record<keyof ResponsavelData, string>>>({})
  const [submittingResp, setSubmittingResp] = useState(false)
  const [respToast, setRespToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hooks devem ser chamados antes de qualquer early return (Rules of Hooks)
  const valorFinalAnimado = useAnimatedValue(contrato?.VALORFINAL ?? 0)

  useEffect(() => {
    if (!ra || !codColigada) return

    async function load() {
      try {
        const [alunoRes, matRes, contRes] = await Promise.all([
          totvs.get<EduAluno>('EduAlunoData', { RA: ra, codColigada, codFilial }),
          totvs.get<EduMatricula>('EduMatriculaData', { RA: ra, codColigada, codFilial }),
          totvs.get<EduContrato>('EduContratoData', { RA: ra, codColigada, codFilial }),
        ])

        setAluno(alunoRes.data?.[0] ?? null)
        setMatricula(matRes.data?.[0] ?? null)
        setContrato(contRes.data?.[0] ?? null)
      } catch {
        setError('Não foi possível carregar os dados. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [ra, codColigada, codFilial])

  function getRespDisplay(): ResponsavelData {
    return savedResp ?? {
      nome: aluno?.NOME ?? '',
      cpf: maskCPF(aluno?.CPF ?? ''),
      email: aluno?.EMAIL ?? '',
      telefone: maskPhone(aluno?.FONE ?? ''),
    }
  }

  function startEditResp() {
    setRespForm(getRespDisplay())
    setRespErrors({})
    setEditingResp(true)
  }

  function showToast(type: 'success' | 'error', msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setRespToast({ type, msg })
    toastTimer.current = setTimeout(() => setRespToast(null), 4000)
  }

  async function handleRespSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = responsavelSchema.safeParse(respForm)
    if (!result.success) {
      const errs: Partial<Record<keyof ResponsavelData, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ResponsavelData
        if (!errs[key]) errs[key] = issue.message
      }
      setRespErrors(errs)
      return
    }
    setRespErrors({})
    setSubmittingResp(true)
    try {
      const res = await fetch(
        `/api/totvs/rest/EduMatriculaData?RA=${ra}&codColigada=${codColigada}&codFilial=${codFilial}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.data),
        },
      )
      if (!res.ok) throw new Error()
      setSavedResp(result.data)
      setEditingResp(false)
      showToast('success', 'Dados salvos com sucesso!')
    } catch {
      showToast('error', 'Não foi possível salvar os dados. Tente novamente.')
    } finally {
      setSubmittingResp(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground text-sm">Carregando dados…</p>
      </div>
    )
  }

  if (error || !aluno) {
    return (
      <div className="text-destructive text-sm p-4 rounded-md bg-destructive/10">
        {error ?? 'Aluno não encontrado.'}
      </div>
    )
  }

  const serieDestino = String(Number(aluno.CODSERIE) + 1)
  const turnoLabel =
    aluno.CODTURNO === 'M' ? 'Manhã' : aluno.CODTURNO === 'T' ? 'Tarde' : 'Noite'

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Confirmação de Matrícula</h1>
        {matricula && (
          <Badge
            className={
              matricula.TIPOINGRESSO === 'REMATRICULA'
                ? 'bg-[var(--cor-primaria)] hover:opacity-90'
                : 'bg-green-600 text-white hover:opacity-90'
            }
          >
            {matricula.TIPOINGRESSO}
          </Badge>
        )}
      </div>

      {/* Bloco Contexto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Dados do Aluno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nome</span>
            <span className="font-medium">{aluno.NOME}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Série atual → destino</span>
            <span className="font-medium">
              {aluno.CODSERIE}º → {serieDestino}º ano
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Período letivo</span>
            <span className="font-medium">{matricula?.CODPERIODO ?? '2026/1'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Turno</span>
            <span className="font-medium">{turnoLabel}</span>
          </div>
        </CardContent>
      </Card>

      {/* Bloco Responsável Financeiro */}
      {aluno && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Responsável Financeiro
              </CardTitle>
              {!editingResp && (
                <button
                  type="button"
                  onClick={startEditResp}
                  className="text-xs text-[var(--cor-primaria,#1e40af)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                  aria-label="Editar dados do responsável financeiro"
                >
                  Editar
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!editingResp ? (
              <div className="space-y-2 text-sm">
                {(
                  [
                    { label: 'Nome', key: 'nome' },
                    { label: 'CPF', key: 'cpf' },
                    { label: 'E-mail', key: 'email' },
                    { label: 'Telefone', key: 'telefone' },
                  ] as { label: string; key: keyof ResponsavelData }[]
                ).map(({ label, key }) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium truncate text-right">{getRespDisplay()[key] || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={e => void handleRespSubmit(e)} className="space-y-3" noValidate>
                <div className="space-y-1">
                  <Label htmlFor="resp-nome">Nome completo</Label>
                  <Input
                    id="resp-nome"
                    value={respForm.nome}
                    onChange={e => setRespForm(f => ({ ...f, nome: e.target.value }))}
                    aria-describedby={respErrors.nome ? 'resp-nome-err' : undefined}
                    aria-invalid={!!respErrors.nome}
                  />
                  {respErrors.nome && <p id="resp-nome-err" role="alert" className="text-xs text-destructive">{respErrors.nome}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="resp-cpf">CPF</Label>
                  <Input
                    id="resp-cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={respForm.cpf}
                    onChange={e => setRespForm(f => ({ ...f, cpf: maskCPF(e.target.value) }))}
                    aria-describedby={respErrors.cpf ? 'resp-cpf-err' : undefined}
                    aria-invalid={!!respErrors.cpf}
                  />
                  {respErrors.cpf && <p id="resp-cpf-err" role="alert" className="text-xs text-destructive">{respErrors.cpf}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="resp-email">E-mail</Label>
                  <Input
                    id="resp-email"
                    type="email"
                    value={respForm.email}
                    onChange={e => setRespForm(f => ({ ...f, email: e.target.value }))}
                    aria-describedby={respErrors.email ? 'resp-email-err' : undefined}
                    aria-invalid={!!respErrors.email}
                  />
                  {respErrors.email && <p id="resp-email-err" role="alert" className="text-xs text-destructive">{respErrors.email}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="resp-telefone">Telefone</Label>
                  <Input
                    id="resp-telefone"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={respForm.telefone}
                    onChange={e => setRespForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))}
                    aria-describedby={respErrors.telefone ? 'resp-tel-err' : undefined}
                    aria-invalid={!!respErrors.telefone}
                  />
                  {respErrors.telefone && <p id="resp-tel-err" role="alert" className="text-xs text-destructive">{respErrors.telefone}</p>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" disabled={submittingResp}>
                    {submittingResp ? 'Salvando…' : 'Salvar'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingResp(false); setRespErrors({}) }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Toast responsável */}
      {respToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-sm shadow-lg z-50 animate-fade-up whitespace-nowrap ${
            respToast.type === 'success' ? 'bg-green-600 text-white' : 'bg-destructive text-destructive-foreground'
          }`}
        >
          {respToast.msg}
        </div>
      )}

      {/* Bloco Financeiro */}
      {contrato && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor bruto</span>
              <span>{moeda(contrato.VALORTOTAL)}</span>
            </div>
            {contrato.DESCONTO > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto/bolsa</span>
                <span className="text-green-600">- {moeda(contrato.DESCONTO)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Valor final</span>
              <span className="tabular-nums">{moeda(valorFinalAnimado)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Parcelas</span>
              <span>
                {contrato.NRPARCELAS}× de {moeda(contrato.VALORPARCELA)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>1º vencimento</span>
              <span>
                {new Date(contrato.DTPRIMEIROVCTO).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-muted-foreground" id="forma-pagamento-label">Forma de pagamento</p>
              <div
                role="radiogroup"
                aria-labelledby="forma-pagamento-label"
                className="flex gap-2 flex-wrap"
              >
                {(['PIX', 'BOLETO', 'DEBITO'] as FormaPagamento[]).map(f => (
                  <button
                    key={f}
                    role="radio"
                    aria-checked={formaPagamento === f}
                    aria-label={`Pagar com ${FORMA_LABELS[f]}`}
                    onClick={() => setFormaPagamento(f)}
                    className={`px-4 py-2.5 rounded-md border text-sm transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      formaPagamento === f
                        ? 'border-[var(--cor-primaria,#1e40af)] bg-[var(--cor-primaria,#1e40af)]/10 font-medium'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {FORMA_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push(`/disciplinas?ra=${ra}&codColigada=${codColigada}&codFilial=${codFilial}&formaPagamento=${formaPagamento}`)}
        >
          Ver Contrato PDF
        </Button>
        <Button
          className="flex-1"
          style={{ backgroundColor: 'var(--cor-primaria, #1e40af)' }}
          onClick={() =>
            router.push(
              `/assinatura?ra=${ra}&codColigada=${codColigada}&codFilial=${codFilial}&formaPagamento=${formaPagamento}`,
            )
          }
        >
          Confirmar e Assinar
        </Button>
      </div>
    </div>
  )
}
