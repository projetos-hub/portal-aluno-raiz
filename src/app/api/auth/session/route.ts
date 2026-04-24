import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token, expiresIn, user } = (await req.json()) as {
    token: string
    expiresIn: number
    user: unknown
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
  return res
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('portal_token')?.value
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('portal_token')
  res.cookies.delete('portal_user')

  if (token && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = createServerClient()
    void supabase.from('portal_sessions').delete().eq('token', token).then(undefined, () => {})
  }

  return res
}
