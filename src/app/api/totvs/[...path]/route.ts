import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const DataServerParamsSchema = z.object({
  codColigada: z.coerce.number().int().positive().optional(),
  codFilial: z.coerce.number().int().positive().optional(),
}).passthrough()

const TOTVS_BASE = 'https://raizeducacao160286.rm.cloudtotvs.com.br:8051'

// Simple in-memory token cache — reset on cold start (acceptable for serverless)
let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getRealToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken

  const username = process.env.TOTVS_USER ?? ''
  const password = process.env.TOTVS_PASS ?? ''

  const body = new URLSearchParams({ grant_type: 'password', username, password })

  const res = await fetch(`${TOTVS_BASE}/api/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = data.access_token
  // Renew 30s before expiry
  tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000

  return cachedToken
}

async function logToSupabase(payload: {
  method: string
  dataserver: string
  params: Record<string, string>
  status_code: number
  duration_ms: number
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()
  await supabase.from('logs_rm_api').insert(payload).then(undefined, () => {})
}

async function logRematriculaEvent(
  method: string,
  dataserver: string,
  statusCode: number,
  params: Record<string, string>,
  responseBody?: unknown,
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return
  const ra = params['RA'] ?? params['ra'] ?? 'unknown'
  let event: string | null = null
  let idmatricula: number | null = null
  if (method === 'GET' && dataserver === 'EduContratoData') event = 'visualizou_contrato'
  else if (method === 'POST' && dataserver === 'EduMatriculaData') {
    event = 'assinou'
    if (responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody)) {
      const typed = responseBody as { data?: Array<{ IDMATRICULA?: number }> }
      idmatricula = typed.data?.[0]?.IDMATRICULA ?? null
    }
  }
  else if (statusCode >= 400) event = 'erro'
  if (!event) return
  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()
  await supabase.from('rematricula_logs').insert({ event, ra, status_code: statusCode, idmatricula }).then(undefined, () => {})
}

async function handler(req: NextRequest, pathSegments: string[]) {
  const start = Date.now()
  const mode = process.env.TOTVS_MODE ?? 'mock'

  // Extract DataServer name from path: rest/EduAlunoData → EduAlunoData
  const dataserver = pathSegments[pathSegments.length - 1] ?? ''
  const { searchParams } = new URL(req.url)
  const params: Record<string, string> = {}
  searchParams.forEach((v, k) => { params[k] = v })

  // Validate param formats (rejects non-numeric values, allows absence)
  const paramsValidation = DataServerParamsSchema.safeParse(params)
  if (!paramsValidation.success) {
    return NextResponse.json(
      { error: paramsValidation.error.issues[0]?.message ?? 'Parâmetros inválidos' },
      { status: 400 },
    )
  }

  // Read body once — reused in both mock and real paths
  const isGet = req.method === 'GET'
  const rawBody = isGet ? undefined : await req.text()
  let parsedBody: unknown = undefined
  if (rawBody) {
    try { parsedBody = JSON.parse(rawBody) } catch { parsedBody = rawBody }
  }

  if (mode === 'mock') {
    const { mockHandler } = await import('@/lib/totvs/mock/handler')
    const result = await mockHandler(dataserver, params, req.method, parsedBody)
    void logToSupabase({ method: req.method, dataserver, params, status_code: 200, duration_ms: Date.now() - start })
    void logRematriculaEvent(req.method, dataserver, 200, params, result)
    return NextResponse.json(result)
  }

  // TOTVS_MODE=real — proxy request
  const token = await getRealToken()

  const upstreamPath = pathSegments.join('/')
  const qs = searchParams.toString()
  const upstreamUrl = `${TOTVS_BASE}/api/${upstreamPath}${qs ? `?${qs}` : ''}`

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: rawBody,
  })

  const json: unknown = await upstreamRes.json()
  void logToSupabase({ method: req.method, dataserver, params, status_code: upstreamRes.status, duration_ms: Date.now() - start })
  void logRematriculaEvent(req.method, dataserver, upstreamRes.status, params, json)
  return NextResponse.json(json, { status: upstreamRes.status })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  return handler(req, path)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  return handler(req, path)
}
