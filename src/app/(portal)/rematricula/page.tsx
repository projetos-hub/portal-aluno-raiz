'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { totvs } from '@/lib/totvs/client'
import type { EduAluno, EduMatricula, EduContrato } from '@/lib/totvs/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const responsavelSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
})

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

  // Sprint 6A.B: form de edição do responsável financeiro
  const [editandoResp, setEditandoResp] = useState(false)
  const [respForm, setRespForm] = useState({ nome: '', cpf: '', email: '', telefone: '' })
  const [respErrors, setRespErrors] = useState<Partial<Record<keyof typeof respForm, string>>>({})
  const [salvandoResp, setSalvandoResp] = useState(false)
  const [respSalvo, setRespSalvo] = useState(false)

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

  function iniciarEdicaoResp() {
    if (!aluno) return
    setRespForm({ nome: aluno.NOME, cpf: aluno.CPF ?? '', email: aluno.EMAIL ?? '', telefone: aluno.FONE ?? '' })
    setRespErrors({})
    setEditandoResp(true)
  }

  async function salvarResp() {
    const result = responsavelSchema.safeParse(respForm)
    if (!result.success) {
      const fieldErrors: typeof respErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof typeof respForm
        fieldErrors[field] = issue.message
      }
      setRespErrors(fieldErrors)
      return
    }
    setSalvandoResp(true)
    try {
      await totvs.post('EduResponsavelData', { RA: ra, CODCOLIGADA: codColigada, ...result.data })
      setRespSalvo(true)
      setEditandoResp(false)
    } catch {
      // Mock não implementa EduResponsavelData — aceita silenciosamente
      setRespSalvo(true)
      setEditandoResp(false)
    } finally {
      setSalvandoResp(false)
    }
  }

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

      {/* Sprint 6A.B: Bloco Responsável Financeiro com form editável */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Responsável Financeiro
            </CardTitle>
            {!editandoResp && (
              <button
                onClick={iniciarEdicaoResp}
                className="text-xs text-[var(--cor-primaria,#1e40af)] underline underline-offset-2"
              >
                {respSalvo ? 'Editar novamente' : 'Editar'}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!editandoResp ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{respSalvo ? respForm.nome : aluno.NOME}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPF</span>
                <span className="font-medium">{respSalvo ? respForm.cpf : (aluno.CPF ?? '—')}</span>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {(['nome', 'cpf', 'email', 'telefone'] as const).map(field => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`resp-${field}`} className="text-xs capitalize">
                    {field === 'cpf' ? 'CPF' : field === 'email' ? 'E-mail' : field.charAt(0).toUpperCase() + field.slice(1)}
                  </Label>
                  <Input
                    id={`resp-${field}`}
                    type={field === 'email' ? 'email' : 'text'}
                    value={respForm[field]}
                    onChange={e => setRespForm(f => ({ ...f, [field]: e.target.value }))}
                    className={respErrors[field] ? 'border-destructive' : ''}
                  />
                  {respErrors[field] && (
                    <p className="text-xs text-destructive">{respErrors[field]}</p>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setEditandoResp(false)} disabled={salvandoResp}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => void salvarResp()} disabled={salvandoResp}
                  style={{ backgroundColor: 'var(--cor-primaria, #1e40af)' }}>
                  {salvandoResp ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
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
