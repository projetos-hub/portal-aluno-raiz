'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { totvs } from '@/lib/totvs/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Oferta {
  CODCOLIGADA: number
  CODFILIAL: number
  CODOFERTA: string
  DISCIPLINA: string
  TIPO: string
  CODPERIODO: string
}

interface TurmaDisc {
  CODCOLIGADA: number
  CODFILIAL: number
  CODOFERTA: string
  CODTURMA: string
  HORARIO: string
  CAPACIDADE: number
  VAGAS: number
}

export default function DisciplinasPage() {
  const router = useRouter()
  const params = useSearchParams()
  const ra = params.get('ra') ?? ''
  const codColigada = Number(params.get('codColigada') ?? 0)
  const codFilial = Number(params.get('codFilial') ?? 0)
  const formaPagamento = params.get('formaPagamento') ?? 'PIX'

  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [turmas, setTurmas] = useState<TurmaDisc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Estado das seleções: codOferta → codTurma selecionada
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<Record<string, string>>({})
  // Optativas selecionadas
  const [optativasSelecionadas, setOptativasSelecionadas] = useState<Set<string>>(new Set())

  const retry = useCallback(() => {
    setError(null)
    setLoading(true)
    setRetryCount(c => c + 1)
  }, [])

  useEffect(() => {
    if (!codColigada) return
    async function load() {
      try {
        const [ofertasRes, turmasRes] = await Promise.all([
          totvs.get<Oferta>('EduOfertaData', { codColigada, codFilial }),
          totvs.get<TurmaDisc>('EduTurmaDiscData', { codColigada, codFilial }),
        ])
        const ofertasList = ofertasRes.data ?? []
        const turmasList = turmasRes.data ?? []

        setOfertas(ofertasList)
        setTurmas(turmasList)

        // Pré-seleciona a primeira turma de cada oferta obrigatória
        const preSelected: Record<string, string> = {}
        for (const o of ofertasList.filter(o => o.TIPO === 'OBRIGATORIA')) {
          const primeiraTurma = turmasList.find(t => t.CODOFERTA === o.CODOFERTA)
          if (primeiraTurma) preSelected[o.CODOFERTA] = primeiraTurma.CODTURMA
        }
        setTurmasSelecionadas(preSelected)
      } catch {
        setError('Não foi possível carregar as disciplinas. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [codColigada, codFilial, retryCount])

  const obrigatorias = ofertas.filter(o => o.TIPO === 'OBRIGATORIA')
  const optativas = ofertas.filter(o => o.TIPO === 'OPTATIVA')

  function turmasDaOferta(codOferta: string) {
    return turmas.filter(t => t.CODOFERTA === codOferta)
  }

  function toggleOptativa(codOferta: string) {
    setOptativasSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(codOferta)) {
        next.delete(codOferta)
        setTurmasSelecionadas(ts => {
          const copy = { ...ts }
          delete copy[codOferta]
          return copy
        })
      } else {
        next.add(codOferta)
        const primeiraTurma = turmasDaOferta(codOferta)[0]
        if (primeiraTurma) {
          setTurmasSelecionadas(ts => ({ ...ts, [codOferta]: primeiraTurma.CODTURMA }))
        }
      }
      return next
    })
  }

  function selecionadasEncoded() {
    const entradas = Object.entries(turmasSelecionadas)
      .map(([codOferta, codTurma]) => `${codOferta}:${codTurma}`)
      .join(',')
    return encodeURIComponent(entradas)
  }

  function irParaContrato() {
    router.push(`/contrato?ra=${ra}&codColigada=${codColigada}&codFilial=${codFilial}&disciplinas=${selecionadasEncoded()}`)
  }

  function irParaAssinatura() {
    router.push(
      `/assinatura?ra=${ra}&codColigada=${codColigada}&codFilial=${codFilial}&formaPagamento=${formaPagamento}&disciplinas=${selecionadasEncoded()}`,
    )
  }

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Carregando disciplinas…"
        className="max-w-lg mx-auto space-y-4 pb-8 animate-fade-up"
      >
        <div className="h-7 w-48 rounded-md bg-muted animate-pulse" aria-hidden="true" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-xl border bg-muted/30 animate-pulse" aria-hidden="true" />
        ))}
        <span className="sr-only">Aguarde, carregando as disciplinas disponíveis.</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto animate-fade-up">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8 animate-fade-up">
      <div>
        <h1 className="text-lg font-semibold">Seleção de Disciplinas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {ofertas[0]?.CODPERIODO ?? '2026/2'} · Confirme as disciplinas para o próximo período
        </p>
      </div>

      {/* Obrigatórias */}
      {obrigatorias.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              Obrigatórias
              <Badge className="bg-[var(--cor-primaria)] hover:opacity-90 text-[10px]">
                {obrigatorias.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {obrigatorias.map(o => {
              const ts = turmasDaOferta(o.CODOFERTA)
              const selecionada = turmasSelecionadas[o.CODOFERTA]
              return (
                <div key={o.CODOFERTA} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {/* Checkbox decorativo — não interativo, apenas indica que está selecionado */}
                    <div
                      aria-hidden="true"
                      className="h-4 w-4 rounded-sm border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: 'var(--cor-primaria, #1e40af)', backgroundColor: 'var(--cor-primaria, #1e40af)' }}
                    >
                      <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8 2 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium">{o.DISCIPLINA}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto" aria-label={`${o.DISCIPLINA} — obrigatória`}>obrigatória</Badge>
                  </div>
                  {ts.length > 1 && (
                    <select
                      value={selecionada ?? ''}
                      onChange={e => setTurmasSelecionadas(ts => ({ ...ts, [o.CODOFERTA]: e.target.value }))}
                      aria-label={`Turma de ${o.DISCIPLINA}`}
                      className="ml-6 text-xs border rounded-md px-2 py-2 min-h-[36px] text-muted-foreground bg-background w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {ts.map(t => (
                        <option key={t.CODTURMA} value={t.CODTURMA}>
                          {t.CODTURMA} — {t.HORARIO} ({t.VAGAS} vagas)
                        </option>
                      ))}
                    </select>
                  )}
                  {ts.length === 1 && (
                    <p className="ml-6 text-xs text-muted-foreground">
                      {ts[0].CODTURMA} · {ts[0].HORARIO} · {ts[0].VAGAS} vagas disponíveis
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Optativas */}
      {optativas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              Optativas
              <span className="text-[10px] font-normal text-muted-foreground">(selecione as desejadas)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {optativas.map(o => {
              const selecionada = optativasSelecionadas.has(o.CODOFERTA)
              const ts = turmasDaOferta(o.CODOFERTA)
              const turmaEscolhida = turmasSelecionadas[o.CODOFERTA]
              return (
                <div key={o.CODOFERTA} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`opt-${o.CODOFERTA}`}
                      checked={selecionada}
                      onCheckedChange={() => toggleOptativa(o.CODOFERTA)}
                      aria-label={`Selecionar ${o.DISCIPLINA} — optativa`}
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <Label
                      htmlFor={`opt-${o.CODOFERTA}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {o.DISCIPLINA}
                    </Label>
                  </div>
                  {selecionada && ts.length > 0 && (
                    <div className="ml-6">
                      {ts.length > 1 ? (
                        <select
                          value={turmaEscolhida ?? ''}
                          onChange={e => setTurmasSelecionadas(ts => ({ ...ts, [o.CODOFERTA]: e.target.value }))}
                          aria-label={`Turma de ${o.DISCIPLINA}`}
                          className="text-xs border rounded-md px-2 py-2 min-h-[36px] text-muted-foreground bg-background w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {ts.map(t => (
                            <option key={t.CODTURMA} value={t.CODTURMA}>
                              {t.CODTURMA} — {t.HORARIO} ({t.VAGAS} vagas)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {ts[0].CODTURMA} · {ts[0].HORARIO} · {ts[0].VAGAS} vagas disponíveis
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {ofertas.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma disciplina disponível para o período selecionado.
        </p>
      )}

      {/* CTAs — min-h-[44px] para touch targets em 375px */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => router.back()}>
          ← Voltar
        </Button>
        <Button
          variant="outline"
          className="flex-1 min-h-[44px]"
          onClick={irParaContrato}
        >
          Ver Contrato PDF
        </Button>
        <Button
          className="flex-1 min-h-[44px]"
          style={{ background: 'linear-gradient(135deg, var(--cor-primaria, #1e40af), var(--cor-secundaria, #1e3a8a))' }}
          onClick={irParaAssinatura}
        >
          Confirmar e Assinar
        </Button>
      </div>
    </div>
  )
}
