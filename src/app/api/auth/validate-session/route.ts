import { NextRequest, NextResponse } from 'next/server'
import type { AuthUser } from '@/lib/totvs/types'

const SESSION_DURATION_S = 300
const RENEW_THRESHOLD_MS = 2 * 60 * 1000 // renew when < 2 min remaining

export async function POST(req: NextRequest) {
  const token = req.cookies.get('portal_token')?.value
  if (!token) {
    return NextResponse.json({ valid: false })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Without Supabase, trust the cookie
    return NextResponse.json({ valid: true })
  }

  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('portal_sessions')
    .select('expires_at, user_data')
    .eq('token', token)
    .single()

  if (error || !data) {
    // Session not found or DB error — trust the cookie.
    // Only reject sessions that are explicitly found AND expired.
    return NextResponse.json({ valid: true })
  }

  const expiresAt = new Date(data.expires_at as string)
  const now = new Date()

  if (expiresAt < now) {
    return NextResponse.json({ valid: false })
  }

  const msRemaining = expiresAt.getTime() - now.getTime()
  if (msRemaining < RENEW_THRESHOLD_MS) {
    const newExpiresAt = new Date(now.getTime() + SESSION_DURATION_S * 1000)
    void supabase
      .from('portal_sessions')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('token', token)
      .then(undefined, () => {})

    const res = NextResponse.json({ valid: true, renewed: true, user: data.user_data as AuthUser })
    res.cookies.set('portal_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_S,
      path: '/',
    })
    return res
  }

  return NextResponse.json({ valid: true, user: data.user_data as AuthUser })
}
