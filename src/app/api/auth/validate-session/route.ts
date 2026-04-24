import { NextRequest, NextResponse } from 'next/server'
import type { AuthUser } from '@/lib/totvs/types'

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
    return NextResponse.json({ valid: false })
  }

  if (new Date(data.expires_at as string) < new Date()) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ valid: true, user: data.user_data as AuthUser })
}
