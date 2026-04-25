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
  const [protocolo] = useState<string>(() =>
    idMatricula ?? `PROT-${Date.now().toString(36).toUpperCase()}`
  )
  const sucesso = status === 'sucesso'
  const [copiado, setCopiado] = useState(false)

  const emailResponsavel = getSession()?.user?.email ?? null

  function copiarProtocolo() {
    void navigator.clipboard.writeText(protocolo).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  function imprimir() {
    window.print()
  }

  const whatsappText = encodeURIComponent(`Rematrícula confirmada! Protocolo: ${protocolo}`)

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          header, nav, footer, .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-up">
        {/* Confetti no sucesso */}
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

        <div className="text-6xl relative z-10">{sucesso ? '🎉' : '⏳'}</div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {sucesso ? 'Matrícula Confirmada!' : 'Matrícula em Análise'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {sucesso
              ? 'A vaga do seu filho no próximo ano letivo está garantida.'
              : 'Sua solicitação foi recebida e está sendo analisada.'}
          </p>
        </div>

        {sucesso && emailResponsavel && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-left animate-fade-up"
            style={{ animationDelay: '0.3s', background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}
          >
            <span className="text-lg shrink-0">📧</span>
            <p className="text-green-800">
              Email de confirmação enviado para{' '}
              <span className="font-medium">{emailResponsavel}</span>
            </p>
          </div>
        )}

        {sucesso && (
          <>
            {/* Protocolo copiável */}
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
                className="text-xl font-mono font-bold tracking-wider break-all"
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

            {/* Próximos passos — texto estático */}
            <div className="rounded-xl border p-4 text-left space-y-2 text-sm">
              <p className="font-medium text-gray-800">Próximos passos</p>
              <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
                <li>A secretaria confirma em até 2 dias úteis</li>
                <li>Guarde o número do protocolo acima</li>
                <li>Você receberá o comprovante por e-mail</li>
                <li>Em caso de dúvidas, entre em contato com a secretaria</li>
              </ul>
            </div>

            {/* Ações: baixar, imprimir, WhatsApp */}
            <div className="flex flex-col gap-2">
              <a
                href="/contrato-modelo.pdf"
                download
                className="inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors no-print"
              >
                Baixar comprovante
              </a>

              <div className="flex gap-2 no-print">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Compartilhar
                </a>

                {/* Imprimir */}
                <button
                  onClick={imprimir}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="6" y="14" width="12" height="8" rx="1"/>
                  </svg>
                  Imprimir
                </button>
              </div>
            </div>
          </>
        )}

        <Button
          className="w-full h-12 rounded-xl text-sm font-medium no-print"
          style={{ background: 'linear-gradient(135deg, var(--cor-primaria, #1e40af), var(--cor-secundaria, #1e3a8a))' }}
          onClick={() => router.push('/selecao')}
        >
          Voltar ao início
        </Button>
      </div>
    </>
  )
}
