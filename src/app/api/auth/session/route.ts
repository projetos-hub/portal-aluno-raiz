import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token, expiresIn, user } = (await req.json()) as {
    token: string
    expiresIn: number
    user: unknown
  }
  const res = NextResponse.json({ ok: true })
  const baseOpts = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: expiresIn,
    path: '/',
  }
  // httpOnly: for proxy.ts — cannot be read by document.cookie
  res.cookies.set('portal_token_http', token, { ...baseOpts, httpOnly: true })
  res.cookies.set('portal_user_http', JSON.stringify(user), { ...baseOpts, httpOnly: true })
  // non-httpOnly: for auth.ts getSession() — readable by document.cookie
  res.cookies.set('portal_token', token, { ...baseOpts, httpOnly: false })
  res.cookies.set('portal_user', JSON.stringify(user), { ...baseOpts, httpOnly: false })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('portal_token_http')
  res.cookies.delete('portal_user_http')
  res.cookies.delete('portal_token')
  res.cookies.delete('portal_user')
  return res
}
