import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('portal_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const validateUrl = new URL('/api/auth/validate-session', req.nextUrl.origin)
      const res = await fetch(validateUrl.toString(), {
        method: 'POST',
        headers: { cookie: req.headers.get('cookie') ?? '' },
      })
      const data = (await res.json()) as { valid: boolean }
      if (!data.valid) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    } catch {
      // validation unavailable — fall through, trust the cookie
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/selecao/:path*',
    '/rematricula/:path*',
    '/contrato/:path*',
    '/assinatura/:path*',
    '/conclusao/:path*',
    '/disciplinas/:path*',
  ],
}
