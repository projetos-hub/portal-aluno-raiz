'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { totvs } from '@/lib/totvs/client'
import type { EduAluno, EduMatricula, EduContrato } from '@/lib/totvs/types'
import { Button } from '@/components/ui/button'

type FormaPagamento = 'PIX' | 'BOLETO' | 'DEBITO'

type ResponsavelInfo = { RESP_FINANCEIRO: string; RESP_ACADEMICO: string }

type ItemOpcional = { titulo: string; descricao: string; valor: number }

type Parcela = {
  NR: number
  SERVICO?: string
  VENCIMENTO: string
  VALORORIGINAL: number
  BOLSA?: number
  LIQUIDO: number
}

const responsavelSchema = z.object({
  nome: z.string().min(3, 'Mínimo 3 caracteres'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido'),
})
type FormResp = z.infer<typeof responsavelSchema>

function maskCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(s: string) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function useAnimatedValue(target: number, duration = 700) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const start = useCallback(() => {
    const t0 = performance.now()
    const animate = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [target, duration])
  useEffect(() => {
    if (target > 0) start()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, start])
  return value
}

function RematriculaSkeleton() {
  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border p-5 space-y-3">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-5 w-48 rounded bg-muted animate-pulse" />
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function ParcelasModal({ parcelas, onClose }: { parcelas: Parcela[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parcelas-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 id="parcelas-title" className="font-semibold text-base">Parcelas do contrato</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="overflow-auto flex-1 px-2">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-muted-foreground">
                <th className="px-3 py-2.5 text-left font-medium">Nº</th>
                <th className="px-3 py-2.5 text-left font-medium">Serviço</th>
                <th className="px-3 py-2.5 text-left font-medium">Vencimento</th>
                <th className="px-3 py-2.5 text-right font-medium">Original</th>
                <th className="px-3 py-2.5 text-right font-medium">Bolsa</th>
                <th className="px-3 py-2.5 text-right font-medium font-semibold">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2 text-muted-foreground">{p.NR}</td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{p.SERVICO ?? 'Mensalidade'}</td>
                  <td className="px-3 py-2">{formatDate(p.VENCIMENTO)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{moeda(p.VALORORIGINAL)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{p.BOLSA ? `-${moeda(p.BOLSA)}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--cor-primaria, #1e40af)' }}>{moeda(p.LIQUIDO)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t">
          <Button className="w-full" onClick={onClose} style={{ background: 'var(--cor-primaria, #1e40af)' }}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
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
  const [responsavel, setResponsavel] = useState<ResponsavelInfo | null>(null)
  const [material, setMaterial] = useState<ItemOpcional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX')
  const [showParcelas, setShowParcelas] = useState(false)

  // Edição de responsável
  const [savedResp, setSavedResp] = useState<FormResp | null>(null)
  const [editingResp, setEditingResp] = useState(false)
  const [respForm, setRespForm] = useState<FormResp>({ nome: '', cpf: '', email: '', telefone: '' })
  const [respErrors, setRespErrors] = useState<Partial<Record<keyof FormResp, string>>>({})
  const [submittingResp, setSubmittingResp] = useState(false)
  const [respToast, setRespToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const valorFinalAnimado = useAnimatedValue(contrato?.VALORFINAL ?? 0)

  useEffect(() => {
    if (!ra || !codColigada) return

    async function load() {
      try {
        const [alunoRes, matRes, contRes, respRes, matDid] = await Promise.all([
          totvs.get<EduAluno>('EduAlunoData', { RA: ra, codColigada, codFilial }),
          totvs.get<EduMatricula>('EduMatriculaData', { RA: ra, codColigada, codFilial }),
          totvs.get<EduContrato>('EduContratoData', { RA: ra, codColigada, codFilial }),
          totvs.get<ResponsavelInfo>('EduResponsavelData', { RA: ra }),
          totvs.get<ItemOpcional>('EduMaterialData', { codColigada }),
        ])

        setAluno(alunoRes.data?.[0] ?? null)
        setMatricula(matRes.data?.[0] ?? null)
        setContrato(contRes.data?.[0] ?? null)
        setResponsavel(respRes.data?.[0] ?? null)
        setMaterial(matDid.data ?? [])
      } catch {
        setError('Não foi possível carregar os dados. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [ra, codColigada, codFilial])

  function getRespDisplay(): FormResp {
    return savedResp ?? {
      nome: responsavel?.RESP_FINANCEIRO ?? aluno?.NOME ?? '',
      cpf: maskCPF(aluno?.CPF ?? ''),
      email: aluno?.EMAIL ?? '',
      telefone: maskPhone(aluno?.FONE ?? ''),
    }
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
      const errs: Partial<Record<keyof FormResp, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormResp
        if (!errs[key]) errs[key] = issue.message
      }
      setRespErrors(errs)
      return
    }
    setRespErrors({})
    setSubmittingResp(true)
    try {
      const res = await fetch(`/api/totvs/rest/EduMatriculaData?RA=${ra}&codColigada=${codColigada}&codFilial=${codFilial}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })
      if (!res.ok) throw new Error()
      setSavedResp(result.data)
      setEditingResp(false)
      showToast('success', 'Dados salvos com sucesso!')
    } catch {
      showToast('error', 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSubmittingResp(false)
    }
  }

  if (loading) return <RematriculaSkeleton />

  if (error || !aluno) {
    return (
      <div className="max-w-lg mx-auto rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-destructive text-sm">{error ?? 'Aluno não encontrado.'}</p>
      </div>
    )
  }

  const serieDestino = `${Number(aluno.CODSERIE) + 1}º ano`
  const turnoLabel = aluno.CODTURNO === 'M' ? 'Manhã' : aluno.CODTURNO === 'T' ? 'Tarde' : 'Noite'
  const desconto = contrato?.DESCONTO ?? 0
  const valorBruto = contrato?.VALORBRUTO ?? 0
  const valorFinal = contrato?.VALORFINAL ?? 0
  const parcelas = ((contrato as Record<string, unknown>)?.PARCELAS ?? []) as Parcela[]
  const resp = getRespDisplay()

  const FORMA_LABELS: Record<FormaPagamento, string> = {
    PIX: 'Pix',
    BOLETO: 'Boleto bancário',
    DEBITO: 'Débito automático',
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-10">
      {/* Toast */}
      {respToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-40 rounded-xl px-4 py-2.5 text-sm text-white shadow-lg animate-fade-up ${
            respToast.type === 'success' ? 'bg-emerald-600' : 'bg-destructive'
          }`}
        >
          {respToast.msg}
        </div>
      )}

      {/* Greeting */}
      <div className="pt-1">
        <p className="text-sm text-muted-foreground">
          {matricula?.TIPOINGRESSO?.toUpperCase().includes('REMATRICULA') ? 'Rematrícula' : 'Matrícula'} · {matricula?.CODPERIODO ?? '2026/1'}
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">
          Olá, {responsavel?.RESP_FINANCEIRO?.split(' ')[0] ?? aluno.NOME.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Confira os dados abaixo e confirme a matrícula de <strong>{aluno.NOME}</strong>.
        </p>
      </div>

      {/* Bloco Aluno */}
      <div className="rounded-2xl border bg-white p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Aluno</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Aluno</span>
          <span className="font-medium">{aluno.NOME}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progressão</span>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-muted-foreground">{aluno.CODSERIE}º ano</span>
            <svg viewBox="0 0 16 8" className="w-4 h-3" fill="none" aria-hidden="true">
              <path d="M1 4h12M9 1l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: 'var(--cor-primaria, #1e40af)' }}>{serieDestino}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Turno</span>
          <span className="font-medium">{turnoLabel}</span>
        </div>
      </div>

      {/* Bloco Responsáveis */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responsáveis</p>
          {!editingResp && (
            <button
              type="button"
              onClick={() => { setRespForm(resp); setRespErrors({}); setEditingResp(true) }}
              className="text-xs font-medium hover:underline focus-visible:outline-none"
              style={{ color: 'var(--cor-primaria, #1e40af)' }}
              aria-label="Editar responsável financeiro"
            >
              Editar
            </button>
          )}
        </div>

        {!editingResp ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Financeiro</span>
              <span className="font-medium">{resp.nome || responsavel?.RESP_FINANCEIRO || '—'}</span>
            </div>
            {responsavel?.RESP_ACADEMICO && responsavel.RESP_ACADEMICO !== responsavel.RESP_FINANCEIRO && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Acadêmico</span>
                <span className="font-medium">{responsavel.RESP_ACADEMICO}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {[
                { label: 'CPF', value: resp.cpf },
                { label: 'E-mail', value: resp.email },
                { label: 'Telefone', value: resp.telefone },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleRespSubmit} className="space-y-3">
            {(
              [
                { key: 'nome', label: 'Nome completo', type: 'text', mask: null },
                { key: 'cpf', label: 'CPF', type: 'text', mask: maskCPF },
                { key: 'email', label: 'E-mail', type: 'email', mask: null },
                { key: 'telefone', label: 'Telefone', type: 'tel', mask: maskPhone },
              ] as { key: keyof FormResp; label: string; type: string; mask: ((v: string) => string) | null }[]
            ).map(({ key, label, type, mask }) => (
              <div key={key}>
                <label htmlFor={`resp-${key}`} className="block text-xs font-medium text-muted-foreground mb-1">
                  {label}
                </label>
                <input
                  id={`resp-${key}`}
                  type={type}
                  value={respForm[key]}
                  onChange={e => setRespForm(f => ({ ...f, [key]: mask ? mask(e.target.value) : e.target.value }))}
                  aria-invalid={!!respErrors[key]}
                  aria-describedby={respErrors[key] ? `resp-${key}-err` : undefined}
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${respErrors[key] ? 'border-destructive focus:ring-destructive/30' : 'border-gray-200 focus:ring-[var(--cor-primaria)]/20 focus:border-[var(--cor-primaria)]'}`}
                />
                {respErrors[key] && (
                  <p id={`resp-${key}-err`} className="text-destructive text-xs mt-1" role="alert">{respErrors[key]}</p>
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={submittingResp} className="flex-1 h-10 rounded-xl text-sm" style={{ background: 'var(--cor-primaria, #1e40af)' }}>
                {submittingResp ? 'Salvando…' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl text-sm" onClick={() => setEditingResp(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Bloco Financeiro */}
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo Financeiro</p>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor bruto</span>
            <span className="font-medium">{moeda(valorBruto)}</span>
          </div>
          {desconto > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto / Bolsa</span>
              <span className="font-medium text-emerald-600">-{desconto.toFixed(0)}%</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parcelas</span>
            <span className="font-medium">{contrato?.QUANTIDADEPARCELAS ?? 12}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">1º vencimento</span>
            <span className="font-medium">{formatDate(contrato?.PRIMEIROVENCIMENTO ?? '')}</span>
          </div>
        </div>

        {/* Valor final em destaque */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: 'var(--cor-primaria-10, rgba(30,64,175,0.07))' }}
        >
          <p className="text-xs text-muted-foreground mb-1">Valor da parcela</p>
          <p
            className="text-3xl font-bold tabular-nums tracking-tight"
            style={{ color: 'var(--cor-primaria, #1e40af)' }}
          >
            {moeda(valorFinalAnimado)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">por mês</p>
        </div>

        {parcelas.length > 0 && (
          <button
            type="button"
            onClick={() => setShowParcelas(true)}
            className="w-full text-sm font-medium py-2.5 rounded-xl border transition-colors hover:bg-gray-50"
            style={{ color: 'var(--cor-primaria, #1e40af)', borderColor: 'var(--cor-primaria-20, rgba(30,64,175,0.2))' }}
          >
            Ver detalhes das {parcelas.length} parcelas
          </button>
        )}
      </div>

      {/* Forma de pagamento */}
      <div className="rounded-2xl border bg-white p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" id="forma-pgto-label">
          Forma de Pagamento
        </p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="forma-pgto-label">
          {(['PIX', 'BOLETO', 'DEBITO'] as FormaPagamento[]).map(f => (
            <button
              key={f}
              role="radio"
              aria-checked={formaPagamento === f}
              onClick={() => setFormaPagamento(f)}
              className="rounded-xl border py-2.5 min-h-[44px] text-sm font-medium transition-all"
              style={{
                borderColor: formaPagamento === f ? 'var(--cor-primaria, #1e40af)' : undefined,
                background: formaPagamento === f ? 'var(--cor-primaria-10, rgba(30,64,175,0.08))' : undefined,
                color: formaPagamento === f ? 'var(--cor-primaria, #1e40af)' : undefined,
              }}
            >
              {FORMA_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Cards opcionais — Material e Serviços */}
      {material.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Itens opcionais
          </p>
          <p className="text-xs text-muted-foreground px-1">Você pode contratar depois — não bloqueiam a confirmação agora.</p>
          {material.map((item, i) => (
            <div key={i} className="rounded-2xl border p-4 flex items-center justify-between gap-3 bg-gray-50/50">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.descricao}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">{moeda(item.valor)}</p>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">opcional</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-12 rounded-xl text-sm font-medium"
          onClick={() => router.push(`/contrato?ra=${ra}&codColigada=${codColigada}&codFilial=${codFilial}`)}
        >
          Ver contrato PDF
        </Button>
        <Button
          className="flex-1 h-12 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, var(--cor-primaria, #1e40af), var(--cor-secundaria, #1e3a8a))' }}
          onClick={() => router.push(`/assinatura?ra=${ra}&codColigada=${codColigada}&codFilial=${codFilial}&formaPagamento=${formaPagamento}`)}
        >
          Confirmar e Assinar
        </Button>
      </div>

      {showParcelas && <ParcelasModal parcelas={parcelas} onClose={() => setShowParcelas(false)} />}
    </div>
  )
}
