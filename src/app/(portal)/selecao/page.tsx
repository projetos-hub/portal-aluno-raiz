'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, setSession } from '@/lib/auth'
import { totvs } from '@/lib/totvs/client'
import type { EduAluno, EduMatricula } from '@/lib/totvs/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AlunoCard {
  aluno: EduAluno
  matricula: EduMatricula | null
}

export default function SelecaoPage() {
  const router = useRouter()
  const [cards, setCards] = useState<AlunoCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const session = getSession()
      if (!session) return

      try {
        const { codColigada, codFilial } = session.user
        const params = codColigada > 0 ? { codColigada, codFilial } : undefined

        // Fetch alunos — filter by session school when available
        const alunosRes = await totvs.get<EduAluno>('EduAlunoData', params)
        const alunos = alunosRes.data ?? []

        // Fetch matrículas para os alunos retornados
        const matriculasRes = await totvs.get<EduMatricula>('EduMatriculaData', params)
        const matriculas = matriculasRes.data ?? []

        const result: AlunoCard[] = alunos.map(a => ({
          aluno: a,
          matricula: matriculas.find(
            m => m.RA === a.RA && m.CODCOLIGADA === a.CODCOLIGADA,
          ) ?? null,
        }))

        setCards(result)

        // Atualiza a sessão com a escola do primeiro aluno (workaround até
        // mockAuthHandler retornar user info — será removido em sprint futuro)
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
  }, [])

  function handleSelect(card: AlunoCard) {
    const { aluno } = card
    // Atualiza sessão com a escola do aluno selecionado
    const session = getSession()
    if (session) {
      setSession(session.token, 300, {
        ...session.user,
        codColigada: aluno.CODCOLIGADA,
        codFilial: aluno.CODFILIAL,
      })
    }
    router.push(
      `/rematricula?ra=${aluno.RA}&codColigada=${aluno.CODCOLIGADA}&codFilial=${aluno.CODFILIAL}`,
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground text-sm">Carregando alunos…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive text-sm p-4 rounded-md bg-destructive/10">{error}</div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Nenhum aluno encontrado para esta conta.
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
                variant={
                  matricula?.TIPOINGRESSO === 'REMATRICULA' ? 'default' : 'secondary'
                }
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
        </Card>
      ))}
    </div>
  )
}
