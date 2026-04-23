import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const AuthBodySchema = z.object({
  username: z.string().min(1, 'username não pode ser vazio'),
  password: z.string().min(1, 'password não pode ser vazio'),
})

const TOTVS_BASE = 'https://raizeducacao160286.rm.cloudtotvs.com.br:8051'

// --- Rate limiting (1.A) ---
// In-memory: resets on cold start, acceptable for serverless MVP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterMs: 0 }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }
  entry.count++
  return { allowed: true, retryAfterMs: 0 }
}

// --- Audit logging (Sprint 4) ---
async function logAuthAttempt(username: string, success: boolean, duration_ms: number) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()
  await supabase.from('logs_auth').insert({ username, success, duration_ms }).then(undefined, () => {})
}

// --- Rematricula event logging (1.D) — guarded on SERVICE_ROLE_KEY ---
async function logRematricula(event: string, username: string, details?: Record<string, unknown>) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return
  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()
  await supabase.from('rematricula_logs').insert({ event, username, details }).then(undefined, () => {})
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { allowed, retryAfterMs } = checkRateLimit(ip)
  if (!allowed) {
    void logAuthAttempt(`[rate-limited] ${ip}`, false, 0)
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: Math.ceil(retryAfterMs / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    )
  }

  // Parse and validate body with Zod
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body deve ser JSON válido' }, { status: 400 })
  }

  const parsed = AuthBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const { username, password } = parsed.data

  const mode = process.env.TOTVS_MODE ?? 'mock'

  if (mode === 'mock') {
    const { mockAuthHandler } = await import('@/lib/totvs/mock/handler')
    const mockResult = mockAuthHandler(username, password)
    if ('error' in mockResult) {
      void logAuthAttempt(username, false, Date.now() - start)
      void logRematricula('login_falha', username, { reason: mockResult.error })
      return NextResponse.json(mockResult, { status: 401 })
    }
    void logAuthAttempt(username, true, Date.now() - start)
    void logRematricula('login', username)
    return NextResponse.json(mockResult)
  }

  // TOTVS_MODE=real
  const urlBody = new URLSearchParams({ grant_type: 'password', username, password })

  const res = await fetch(`${TOTVS_BASE}/api/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: urlBody.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    void logAuthAttempt(username, false, Date.now() - start)
    void logRematricula('login_falha', username, { status: res.status })
    return NextResponse.json({ error: 'Autenticação TOTVS falhou', detail: text }, { status: 401 })
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  void logAuthAttempt(username, true, Date.now() - start)
  void logRematricula('login', username)

  // TODO Sprint 3: enrich with EduAlunoData lookup to return user: AuthUser (requires RA from TOTVS token or extra endpoint)
  return NextResponse.json({ token: data.access_token, expiresIn: data.expires_in })
}
