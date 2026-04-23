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
  // Single source of truth — readable by proxy.ts (req.cookies) and auth.ts (document.cookie)
  res.cookies.set('portal_token', token, opts)
  res.cookies.set('portal_user', JSON.stringify(user), opts)
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('portal_token')
  res.cookies.delete('portal_user')
  return res
}
