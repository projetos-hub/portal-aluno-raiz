'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, setSession } from '@/lib/auth'
import { totvs } from '@/lib/totvs/client'
import { getBrandTheme } from '@/lib/brand-theme'
import type { EduAluno, EduMatricula } from '@/lib/totvs/types'
import { Button } from '@/components/ui/button'

interface AlunoCard {
  aluno: EduAluno
  matricula: EduMatricula | null
}

function serieLabel(serie: string | undefined) {
  if (!serie) return '—'
  const n = Number(serie)
  if (isNaN(n)) return serie
  return `${n}º ano`
}

function serieDestino(serie: string | undefined) {
  if (!serie) return '—'
  const n = Number(serie)
  if (isNaN(n)) return serie
  return `${n + 1}º ano`
}

function SelecaoSkeleton() {
  return (
    <div className="max-w-lg mx-auto space-y-3">
      <div className="h-6 w-44 rounded-md bg-muted animate-pulse mb-5" />
      {[1, 2].map(i => (
        <div key={i} className="rounded-2xl border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-5 w-48 rounded bg-muted animate-pulse" />
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
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
  const [showAll, setShowAll] = useState(false)
  const PAGE_SIZE = 5

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

        // Atualiza sessão se codColigada era stub
        if (alunos.length > 0 && session.user.codColigada === 0) {
          const first = alunos[0]
          setSession(session.token, 300, {
            ...session.user,
            codColigada: first.CODCOLIGADA,
            codFilial: first.CODFILIAL,
            alunosRA: alunos.map(a => a.RA),
          })
        }

        const result: AlunoCard[] = alunos.map(a => ({
          aluno: a,
          matricula: matriculas.find(m => m.RA === a.RA && m.CODCOLIGADA === a.CODCOLIGADA) ?? null,
        }))

        setCards(result)

        // Auto-redirect: 1 aluno com 1 matrícula
        if (result.length === 1 && result[0].matricula) {
          const { aluno } = result[0]
          router.replace(`/rematricula?ra=${aluno.RA}&codColigada=${aluno.CODCOLIGADA}&codFilial=${aluno.CODFILIAL}`)
          return
        }
      } catch {
        setError('Não foi possível carregar os alunos. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [retryCount, router])

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
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={retry}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl"
          style={{ background: 'var(--cor-primaria-10, rgba(30,64,175,0.08))' }}
          aria-hidden="true"
        >
          🎓
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold text-base">Nenhum aluno vinculado à sua conta</p>
          <p className="text-sm text-muted-foreground">
            Entre em contato com a secretaria da escola para vincular um aluno.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={retry}>Tentar novamente</Button>
      </div>
    )
  }

  const visibleCards = showAll ? cards : cards.slice(0, PAGE_SIZE)
  const hiddenCount = cards.length - PAGE_SIZE

  return (
    <div className="max-w-lg mx-auto space-y-3">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Selecione o aluno</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Escolha para quem você vai confirmar a rematrícula
        </p>
      </div>

      {visibleCards.map(({ aluno, matricula }, index) => {
        const isRematricula = matricula?.TIPOINGRESSO?.toUpperCase().includes('REMATRICULA') ?? true
        const isPendente = matricula?.SITUACAO?.toUpperCase() === 'PENDENTE'

        let escola: { nomeEscola: string; marca: string } | null = null
        try { escola = getBrandTheme(aluno.CODCOLIGADA, aluno.CODFILIAL) } catch { /* ok */ }

        return (
          <button
            key={`${aluno.CODCOLIGADA}-${aluno.RA}`}
            onClick={() => handleSelect({ aluno, matricula })}
            className="w-full text-left rounded-2xl border p-5 transition-all duration-200 hover:shadow-md active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-stagger"
            style={{
              animationDelay: `${index * 80}ms`,
              borderColor: isPendente ? 'var(--cor-primaria, #1e40af)' : undefined,
              borderWidth: isPendente ? '2px' : undefined,
              background: isPendente ? 'var(--cor-primaria-10, rgba(30,64,175,0.04))' : undefined,
            }}
            aria-label={`Selecionar aluno ${aluno.NOME}`}
          >
            {/* Tags de escola + badge tipo */}
            <div className="flex items-center justify-between gap-2 mb-3">
              {escola && (
                <span
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    background: 'var(--cor-primaria-10, rgba(30,64,175,0.08))',
                    color: 'var(--cor-primaria, #1e40af)',
                  }}
                >
                  {escola.nomeEscola}
                </span>
              )}
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ml-auto ${
                  isRematricula ? 'text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
                style={isRematricula ? { background: 'var(--cor-primaria, #1e40af)' } : undefined}
              >
                {isRematricula ? 'Rematrícula' : 'Matrícula'}
              </span>
            </div>

            {/* Nome do aluno */}
            <p className="font-semibold text-base leading-tight">{aluno.NOME}</p>

            {/* Série atual → destino */}
            <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
              <span>{serieLabel(aluno.CODSERIE)}</span>
              <svg viewBox="0 0 16 8" className="w-4 h-3 shrink-0" fill="none" aria-hidden="true">
                <path d="M1 4h12M9 1l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-medium" style={{ color: 'var(--cor-primaria, #1e40af)' }}>
                {serieDestino(aluno.CODSERIE)}
              </span>
              <span className="mx-1.5 text-gray-300" aria-hidden="true">·</span>
              <span>
                {aluno.CODTURNO === 'M' ? 'Manhã' : aluno.CODTURNO === 'T' ? 'Tarde' : 'Noite'}
              </span>
            </div>

            {isPendente && (
              <p
                className="text-xs font-medium mt-2.5 flex items-center gap-1.5"
                style={{ color: 'var(--cor-primaria, #1e40af)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true"/>
                Pendente de confirmação
              </p>
            )}
          </button>
        )
      })}

      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-sm text-center rounded-2xl border border-dashed text-muted-foreground hover:text-foreground hover:border-solid transition-colors"
        >
          Ver {hiddenCount} aluno{hiddenCount > 1 ? 's' : ''} restante{hiddenCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
