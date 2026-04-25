import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let token: string, expiresIn: number, user: unknown
  try {
    const body = (await req.json()) as { token: string; expiresIn: number; user: unknown }
    token = body.token
    expiresIn = body.expiresIn
    user = body.user
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const res = NextResponse.json({ ok: true })
  const opts = {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: expiresIn,
    path: '/',
  }
  // Single source of truth — readable by middleware.ts (req.cookies) and auth.ts (document.cookie)
  res.cookies.set('portal_token', token, opts)
  res.cookies.set('portal_user', JSON.stringify(user), opts)

  // Persist session to Supabase — required for validate-session and email flows
  // Cookie is already set above — Supabase failure must never block the response
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[session/route] SUPABASE_SERVICE_ROLE_KEY not set — portal_sessions will not be populated')
  } else {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
      const { createServerClient } = await import('@/lib/supabase/server')
      const supabase = createServerClient()
      const { error } = await supabase
        .from('portal_sessions')
        .upsert({ token, expires_at: expiresAt, user_data: user }, { onConflict: 'token' })
      if (error) {
        console.error('[session/route] Failed to upsert portal_sessions:', error.message)
      }
    } catch (err) {
      console.error('[session/route] Supabase upsert threw:', err)
    }
  }

  return res
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('portal_token')?.value
  const userRaw = req.cookies.get('portal_user')?.value

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('portal_token')
  res.cookies.delete('portal_user')

  // Save last_escola cookie (30 days, non-httpOnly) for theming on next login
  if (userRaw) {
    try {
      const user = JSON.parse(decodeURIComponent(userRaw)) as { codColigada?: number }
      if (user.codColigada !== undefined) {
        res.cookies.set('last_escola', String(user.codColigada), {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        })
      }
    } catch { /* ignore malformed cookie */ }
  }

  if (token && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = createServerClient()
    void supabase.from('portal_sessions').delete().eq('token', token).then(undefined, () => {})
  }

  return res
}
