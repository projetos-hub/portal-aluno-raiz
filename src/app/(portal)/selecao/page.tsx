'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, setSession } from '@/lib/auth'
import { totvs } from '@/lib/totvs/client'
import type { EduAluno, EduMatricula } from '@/lib/totvs/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AlunoCard {
  aluno: EduAluno
  matricula: EduMatricula | null
}

interface HistoricoState {
  open: boolean
  loading: boolean
  data: EduMatricula[] | null
}

function statusBadge(situacao: string) {
  const s = situacao?.toUpperCase() ?? ''
  if (s === 'ATIVO')      return { label: 'Ativo',      className: 'bg-green-600 text-white hover:opacity-90' }
  if (s === 'CONCLUÍDO' || s === 'CONCLUIDO')
                           return { label: 'Concluído',  className: 'bg-gray-500 text-white hover:opacity-90' }
  if (s === 'CANCELADO')  return { label: 'Cancelado',  className: 'bg-red-600 text-white hover:opacity-90' }
  if (s === 'PENDENTE')   return { label: 'Pendente',   className: 'bg-amber-500 text-white hover:opacity-90' }
  return { label: situacao, className: 'bg-gray-400 text-white hover:opacity-90' }
}

function SelecaoSkeleton() {
  return (
    <div className="max-w-lg mx-auto space-y-3">
      <div className="h-6 w-36 rounded-md bg-muted animate-pulse mb-4" />
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-lg border p-4 flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-5 w-20 rounded-full bg-muted animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  )
}

export default function SelecaoPage() {
  const router = useRouter()
  const [cards, setCards] = useState<AlunoCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [historico, setHistorico] = useState<Record<string, HistoricoState>>({})

  const retry = useCallback(() => {
    setError(null)
    setLoading(true)
    setRetryCount(c => c + 1)
  }, [])

  useEffect(() => {
    async function load() {
      const session = getSession()
      if (!session) return

      try {
        const { codColigada, codFilial } = session.user
        const params = codColigada > 0 ? { codColigada, codFilial } : undefined

        const [alunosRes, matriculasRes] = await Promise.all([
          totvs.get<EduAluno>('EduAlunoData', params),
          totvs.get<EduMatricula>('EduMatriculaData', params),
        ])

        const alunos = alunosRes.data ?? []
        const matriculas = matriculasRes.data ?? []

        const result: AlunoCard[] = alunos.map(a => ({
          aluno: a,
          matricula: matriculas.find(m => m.RA === a.RA && m.CODCOLIGADA === a.CODCOLIGADA) ?? null,
        }))

        setCards(result)

        if (alunos.length > 0 && session.user.codColigada === 0) {
          const first = alunos[0]
          setSession(session.token, 300, {
            ...session.user,
            codColigada: first.CODCOLIGADA,
            codFilial: first.CODFILIAL,
            alunosRA: alunos.map(a => a.RA),
          })
        }
      } catch {
        setError('Não foi possível carregar os alunos. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [retryCount])

  async function toggleHistorico(aluno: EduAluno) {
    const key = `${aluno.CODCOLIGADA}-${aluno.RA}`
    const current = historico[key]

    if (current?.open) {
      setHistorico(h => ({ ...h, [key]: { ...h[key], open: false } }))
      return
    }

    if (current?.data !== null) {
      setHistorico(h => ({ ...h, [key]: { ...h[key], open: true } }))
      return
    }

    setHistorico(h => ({ ...h, [key]: { open: true, loading: true, data: null } }))
    try {
      const res = await totvs.get<EduMatricula>('EduMatriculaData', {
        RA: aluno.RA,
        codColigada: aluno.CODCOLIGADA,
        codFilial: aluno.CODFILIAL,
      })
      const sorted = (res.data ?? []).sort((a, b) => {
        const da = a.DTMATRICULA ? new Date(a.DTMATRICULA).getTime() : 0
        const db = b.DTMATRICULA ? new Date(b.DTMATRICULA).getTime() : 0
        return db - da
      })
      setHistorico(h => ({ ...h, [key]: { open: true, loading: false, data: sorted } }))
    } catch {
      setHistorico(h => ({ ...h, [key]: { open: true, loading: false, data: [] } }))
    }
  }

  function handleSelect(card: AlunoCard) {
    const { aluno } = card
    const session = getSession()
    if (session) {
      setSession(session.token, 300, {
        ...session.user,
        codColigada: aluno.CODCOLIGADA,
        codFilial: aluno.CODFILIAL,
      })
    }
    router.push(`/rematricula?ra=${aluno.RA}&codColigada=${aluno.CODCOLIGADA}&codFilial=${aluno.CODFILIAL}`)
  }

  if (loading) return <SelecaoSkeleton />

  if (error) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={retry}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-3">
        <p className="text-muted-foreground">Nenhum aluno encontrado para esta conta.</p>
        <Button variant="outline" size="sm" onClick={retry}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-3">
      <h1 className="text-lg font-semibold mb-4">Selecione o aluno</h1>
      {cards.map(({ aluno, matricula }, index) => {
        const key = `${aluno.CODCOLIGADA}-${aluno.RA}`
        const hist = historico[key]

        return (
          <Card
            key={key}
            className="overflow-hidden animate-stagger"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent
              className="p-4 flex justify-between items-start gap-4 cursor-pointer hover:bg-accent/30 transition-colors active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
              role="button"
              tabIndex={0}
              aria-label={`Selecionar aluno ${aluno.NOME}`}
              onClick={() => handleSelect({ aluno, matricula })}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelect({ aluno, matricula })
                }
              }}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{aluno.NOME}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Série {aluno.CODSERIE} → {String(Number(aluno.CODSERIE) + 1)}º ano
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Turno: {aluno.CODTURNO === 'M' ? 'Manhã' : aluno.CODTURNO === 'T' ? 'Tarde' : 'Noite'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge
                  className={
                    matricula?.TIPOINGRESSO === 'REMATRICULA'
                      ? 'bg-[var(--cor-primaria)] hover:opacity-90'
                      : 'bg-green-600 text-white hover:opacity-90'
                  }
                >
                  {matricula?.TIPOINGRESSO ?? 'MATRÍCULA'}
                </Badge>
              </div>
            </CardContent>

            {/* Tarefa 2.B: botão e seção de histórico */}
            <div className="px-4 pb-3 border-t border-border/50">
              <button
                onClick={e => {
                  e.stopPropagation()
                  void toggleHistorico(aluno)
                }}
                aria-expanded={hist?.open ?? false}
                aria-controls={`historico-${key}`}
                aria-label={hist?.open ? `Ocultar histórico de ${aluno.NOME}` : `Ver histórico de rematrículas de ${aluno.NOME}`}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <span className="text-[10px]" aria-hidden="true">{hist?.open ? '▲' : '▼'}</span>
                {hist?.open ? 'Ocultar histórico' : 'Ver histórico de rematrículas'}
              </button>

              {hist?.open && (
                <div id={`historico-${key}`} className="mt-3 space-y-2 animate-fade-up" role="region" aria-label={`Histórico de ${aluno.NOME}`}>
                  {hist.loading && (
                    <div className="space-y-1.5">
                      {[1, 2].map(i => (
                        <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />
                      ))}
                    </div>
                  )}
                  {!hist.loading && hist.data?.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum histórico encontrado.</p>
                  )}
                  {!hist.loading && (hist.data?.length ?? 0) > 0 && (
                    <div className="rounded-lg border overflow-hidden text-xs">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 bg-muted text-muted-foreground font-medium">
                        <span>Período</span>
                        <span>Tipo</span>
                        <span>Status</span>
                      </div>
                      {hist.data!.map((m, i) => {
                        const badge = statusBadge(m.SITUACAO ?? '')
                        return (
                          <div
                            key={i}
                            className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 items-center border-t border-border/50"
                          >
                            <span className="text-foreground">{m.CODPERIODO ?? '—'}</span>
                            <span className="text-muted-foreground">{m.TIPOINGRESSO ?? '—'}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
