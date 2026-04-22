'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { totvs } from '@/lib/totvs/client'
import type { EduAluno, EduMatricula, EduContrato } from '@/lib/totvs/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

type FormaPagamento = 'PIX' | 'BOLETO' | 'DEBITO'

const FORMA_LABELS: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto bancário',
  DEBITO: 'Débito automático',
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
                ? 'bg-blue-600 hover:bg-blue-600'
                : 'bg-green-600 text-white hover:bg-green-600'
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
              <span>{moeda(contrato.VALORFINAL)}</span>
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
              <p className="text-muted-foreground">Forma de pagamento</p>
              <div className="flex gap-2 flex-wrap">
                {(['PIX', 'BOLETO', 'DEBITO'] as FormaPagamento[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormaPagamento(f)}
                    className={`px-4 py-2.5 rounded-md border text-sm transition-colors min-h-[44px] ${
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
          onClick={() => router.push(`/contrato?ra=${ra}&codColigada=${codColigada}&codFilial=${codFilial}`)}
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
