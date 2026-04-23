import type { TotvsResponse, EduAluno, EduMatricula, EduContrato, EduColigada, AuthUser } from '../types'
import alunosData from './data/alunos.json'
import matriculasData from './data/matriculas.json'
import contratosData from './data/contratos.json'
import usuariosData from './data/usuarios.json'
import coligadasData from './data/coligadas.json'
import ofertasData from './data/ofertas.json'
import turmadiscData from './data/turmadisc.json'

const EMPTY_RESPONSE: TotvsResponse<never> = {
  messages: [{ code: '0003', type: 'info', detail: 'Nenhum registro foi encontrado no banco de dados.' }],
  length: 0,
  data: null,
}

function totvs<T>(data: T[]): TotvsResponse<T> {
  if (data.length === 0) return EMPTY_RESPONSE as TotvsResponse<T>
  return { messages: [], length: data.length, data }
}

function handleAuth(body: unknown): TotvsResponse<unknown> {
  const { email, senha } = (body ?? {}) as Record<string, string>
  const user = usuariosData.find(u => u.email === email && u.senha === senha)
  if (!user) {
    return {
      messages: [{ code: '0401', type: 'error', detail: 'Credenciais inválidas.' }],
      length: 0,
      data: null,
    }
  }
  return {
    messages: [],
    length: 1,
    data: [{ token: `mock-token-${user.id}`, expiresIn: 300, userId: user.id }],
  }
}

async function handleEduAluno(params: Record<string, string>): Promise<TotvsResponse<EduAluno>> {
  const codColigada = params.codColigada ? Number(params.codColigada) : null
  const codFilial = params.codFilial ? Number(params.codFilial) : null
  const ra = params.RA ?? params.ra ?? null

  // Edge case: simulated timeout
  if (ra === 'RA-TIMEOUT') {
    await new Promise(r => setTimeout(r, 5000))
    return EMPTY_RESPONSE as TotvsResponse<EduAluno>
  }

  let result = alunosData as EduAluno[]
  if (codColigada !== null) result = result.filter(a => a.CODCOLIGADA === codColigada)
  if (codFilial !== null) result = result.filter(a => a.CODFILIAL === codFilial)
  if (ra !== null) result = result.filter(a => a.RA === ra)

  return totvs(result)
}

function handleEduMatriculaGet(params: Record<string, string>): TotvsResponse<EduMatricula> {
  const codColigada = params.codColigada ? Number(params.codColigada) : null
  const codFilial = params.codFilial ? Number(params.codFilial) : null
  const ra = params.RA ?? params.ra ?? null

  let result = matriculasData as EduMatricula[]
  if (codColigada !== null) result = result.filter(m => m.CODCOLIGADA === codColigada)
  if (codFilial !== null) result = result.filter(m => m.CODFILIAL === codFilial)
  if (ra !== null) result = result.filter(m => m.RA === ra)

  return totvs(result)
}

function handleEduMatriculaPost(body: unknown): TotvsResponse<unknown> {
  const payload = (body ?? {}) as Record<string, unknown>
  return {
    messages: [],
    length: 1,
    data: [{ IDMATRICULA: `MAT-MOCK-${Date.now()}`, ...payload, SITUACAO: 'PENDENTE' }],
  }
}

function handleEduContratoGet(params: Record<string, string>): TotvsResponse<EduContrato> {
  const codColigada = params.codColigada ? Number(params.codColigada) : null
  const codFilial = params.codFilial ? Number(params.codFilial) : null
  const ra = params.RA ?? params.ra ?? null

  let result = contratosData as EduContrato[]
  if (codColigada !== null) result = result.filter(c => c.CODCOLIGADA === codColigada)
  if (codFilial !== null) result = result.filter(c => c.CODFILIAL === codFilial)
  if (ra !== null) result = result.filter(c => c.RA === ra)

  return totvs(result)
}

function handleEduContratoPost(body: unknown): TotvsResponse<unknown> {
  const payload = (body ?? {}) as Record<string, unknown>
  return {
    messages: [],
    length: 1,
    data: [{ IDCONTRATO: Math.floor(Math.random() * 90000) + 10000, ...payload, SITUACAO: 'PENDENTE' }],
  }
}

function handleEduOferta(params: Record<string, string>): TotvsResponse<unknown> {
  const codColigada = params.codColigada ? Number(params.codColigada) : null
  const codFilial = params.codFilial ? Number(params.codFilial) : null
  const codPeriodo = params.codPeriodo ?? params.CODPERIODO ?? null

  let result = ofertasData as Array<{ CODCOLIGADA: number; CODFILIAL: number; CODPERIODO: string }>
  if (codColigada !== null) result = result.filter(o => o.CODCOLIGADA === codColigada)
  if (codFilial !== null) result = result.filter(o => o.CODFILIAL === codFilial)
  if (codPeriodo !== null) result = result.filter(o => o.CODPERIODO === codPeriodo)

  if (result.length === 0) return EMPTY_RESPONSE
  return { messages: [], length: result.length, data: result }
}

function handleEduTurmaDisc(params: Record<string, string>): TotvsResponse<unknown> {
  const codColigada = params.codColigada ? Number(params.codColigada) : null
  const codFilial = params.codFilial ? Number(params.codFilial) : null
  const codOferta = params.codOferta ?? params.CODOFERTA ?? null

  let result = turmadiscData as Array<{ CODCOLIGADA: number; CODFILIAL: number; CODOFERTA: string }>
  if (codColigada !== null) result = result.filter(t => t.CODCOLIGADA === codColigada)
  if (codFilial !== null) result = result.filter(t => t.CODFILIAL === codFilial)
  if (codOferta !== null) result = result.filter(t => t.CODOFERTA === codOferta)

  if (result.length === 0) return EMPTY_RESPONSE
  return { messages: [], length: result.length, data: result }
}

function handleEduColigadas(params: Record<string, string>): TotvsResponse<EduColigada> {
  const codColigada = params['codColigada'] ? Number(params['codColigada']) : null
  let resultado = coligadasData as EduColigada[]
  if (codColigada !== null) {
    resultado = resultado.filter(c => c.CODCOLIGADA === codColigada)
  }
  if (resultado.length === 0) return EMPTY_RESPONSE as TotvsResponse<EduColigada>
  return { messages: [], length: resultado.length, data: resultado }
}

export async function mockHandler(
  dataserver: string,
  params: Record<string, string>,
  method: string,
  body?: unknown,
): Promise<TotvsResponse<unknown>> {
  const ds = dataserver.toLowerCase().replace(/^\//, '')
  const m = method.toUpperCase()

  if (ds === 'auth') return handleAuth(body)
  if (ds === 'edualunodata' || ds === 'edualuno') return handleEduAluno(params)

  if (ds === 'edumatriculadata' || ds === 'edumatricula') {
    if (m === 'POST') return handleEduMatriculaPost(body)
    return handleEduMatriculaGet(params)
  }

  if (ds === 'educontratodata' || ds === 'educontrato') {
    if (m === 'POST') return handleEduContratoPost(body)
    return handleEduContratoGet(params)
  }

  if (ds === 'educoligadasdata' || ds === 'educoligadas' || ds === 'coligadas') {
    return handleEduColigadas(params)
  }

  if (ds === 'eduofertadata' || ds === 'eduoferta') {
    return handleEduOferta(params)
  }

  if (ds === 'eduturmadiscdata' || ds === 'eduturmadisc') {
    return handleEduTurmaDisc(params)
  }

  console.warn(`[mock] DataServer não reconhecido: "${dataserver}" (normalizado: "${ds}"). Retornando EMPTY_RESPONSE.`)
  return EMPTY_RESPONSE
}

export function mockAuthHandler(
  username: string,
  password: string,
): { token: string; expiresIn: number; user: AuthUser } | { error: string } {
  // Edge case: simulated token expiry
  if (username === 'token_expirado@test.com') return { error: 'Token expirado' }

  const user = usuariosData.find(u => u.email === username && u.senha === password)
  if (!user) return { error: 'Credenciais inválidas.' }
  return {
    token: `mock-token-${user.id}`,
    expiresIn: 300,
    user: {
      id: String(user.id),
      email: user.email,
      codColigada: user.codColigada,
      codFilial: user.codFilial,
      alunosRA: user.alunosRA,
    },
  }
}
