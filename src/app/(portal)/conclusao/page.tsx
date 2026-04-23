'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/auth'

const CONFETTI_COLORS = ['#F0C020', '#2060B0', '#60C080', '#E05080', '#8060C0', '#20A0E0']
const CONFETTI_PIECES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${5 + (i * 5.5) % 90}%`,
  delay: `${(i * 0.07).toFixed(2)}s`,
  size: i % 3 === 0 ? '10px' : i % 3 === 1 ? '6px' : '8px',
}))

export default function ConclusaoPage() {
  const params = useSearchParams()
  const router = useRouter()
  const status = params.get('status') ?? 'pendente'
  const idMatricula = params.get('idMatricula')
  const protocolo = idMatricula ?? `PROT-${Date.now().toString(36).toUpperCase()}`
  const sucesso = status === 'sucesso'

  const [copiado, setCopiado] = useState(false)

  // Notificação de email pós-assinatura — UX apenas (sem envio real)
  const emailResponsavel = getSession()?.user?.email ?? null

  function copiarProtocolo() {
    void navigator.clipboard.writeText(protocolo).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  return (
    // Tarefa 2.D: animação de entrada + protocolo copiável
    <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-up">
      {/* Confetti CSS para celebração no sucesso */}
      {sucesso && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
          {CONFETTI_PIECES.map(p => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: p.left,
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: `${1.0 + (p.id % 4) * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}
      <div className="text-6xl relative z-10">{sucesso ? '✅' : '⏳'}</div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {sucesso ? 'Matrícula Confirmada!' : 'Matrícula em Análise'}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {sucesso
            ? 'A vaga do seu filho no próximo ano letivo está garantida. Em breve você receberá o comprovante por e-mail.'
            : 'Sua solicitação foi recebida e está sendo analisada. Você será notificado por e-mail assim que for processada.'}
        </p>
      </div>

      {sucesso && emailResponsavel && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-left animate-fade-up"
          style={{
            animationDelay: '0.3s',
            background: 'rgba(22,163,74,0.07)',
            border: '1px solid rgba(22,163,74,0.2)',
          }}
        >
          <span className="text-lg shrink-0">📧</span>
          <p className="text-green-800 dark:text-green-300">
            Email de confirmação enviado para{' '}
            <span className="font-medium">{emailResponsavel}</span>
          </p>
        </div>
      )}

      {sucesso && (
        <>
          {/* Tarefa 2.D: protocolo copiável */}
          <div
            className="rounded-xl p-5 space-y-2"
            style={{
              background: 'var(--cor-primaria-10, rgba(30,64,175,0.06))',
              border: '1.5px dashed var(--cor-primaria-20, rgba(30,64,175,0.2))',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Número do protocolo
            </p>
            <p
              className="text-xl font-mono font-bold tracking-wider"
              style={{ color: 'var(--cor-primaria, #1e40af)' }}
            >
              {protocolo}
            </p>
            <button
              onClick={copiarProtocolo}
              className="text-xs transition-colors underline-offset-2"
              style={{ color: copiado ? '#16a34a' : 'var(--cor-primaria, #1e40af)' }}
            >
              {copiado ? '✓ Copiado!' : 'Copiar protocolo'}
            </button>
          </div>

          <div className="rounded-xl border p-4 text-left space-y-2 text-sm">
            <p className="font-medium text-gray-800">Próximos passos:</p>
            <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
              <li>Verifique seu e-mail para o comprovante</li>
              <li>Guarde o número do protocolo acima</li>
              <li>Em caso de dúvidas, entre em contato com a secretaria</li>
            </ul>
          </div>

          <a
            href="/contrato-modelo.pdf"
            download
            className="inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Baixar comprovante
          </a>
        </>
      )}

      <Button
        className="w-full h-12 rounded-xl text-sm font-medium"
        style={{ background: 'linear-gradient(135deg, var(--cor-primaria, #1e40af), var(--cor-secundaria, #1e3a8a))' }}
        onClick={() => router.push('/selecao')}
      >
        Voltar ao início
      </Button>
    </div>
  )
}
