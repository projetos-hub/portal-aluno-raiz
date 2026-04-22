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
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-3">
        <p className="text-muted-foreground">Nenhum aluno encontrado para esta conta.</p>
        <Button variant="outline" size="sm" onClick={retry}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-3">
      <h1 className="text-lg font-semibold mb-4">Selecione o aluno</h1>
      {cards.map(({ aluno, matricula }) => (
        <Card
          key={`${aluno.CODCOLIGADA}-${aluno.RA}`}
          role="button"
          tabIndex={0}
          aria-label={`Selecionar aluno ${aluno.NOME}`}
          className="cursor-pointer hover:shadow-md transition-shadow active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => handleSelect({ aluno, matricula })}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleSelect({ aluno, matricula })
            }
          }}
        >
          <CardContent className="p-4 flex justify-between items-start gap-4">
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
                variant={matricula?.TIPOINGRESSO === 'REMATRICULA' ? 'default' : 'secondary'}
                className={
                  matricula?.TIPOINGRESSO === 'REMATRICULA'
                    ? 'bg-blue-600 hover:bg-blue-600'
                    : 'bg-green-600 text-white hover:bg-green-600'
                }
              >
                {matricula?.TIPOINGRESSO ?? 'MATRÍCULA'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
