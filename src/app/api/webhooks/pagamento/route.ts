import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const PagamentoPayloadSchema = z.object({
  IDMATRICULA: z.number().int().positive(),
  status: z.enum(['confirmado', 'pendente', 'cancelado', 'estornado']),
  valor: z.number().nonnegative(),
})

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate payload
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body deve ser JSON válido' }, { status: 400 })
  }

  const parsed = PagamentoPayloadSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Payload inválido' },
      { status: 400 },
    )
  }

  const { IDMATRICULA, status, valor } = parsed.data

  // Log to Supabase rematricula_logs
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = createServerClient()
    await supabase
      .from('rematricula_logs')
      .insert({
        event: `pagamento_${status}`,
        identifier: String(IDMATRICULA),
        details: { IDMATRICULA, status, valor },
      })
      .then(undefined, () => {})
  }

  return NextResponse.json({ ok: true, IDMATRICULA, status })
}
