'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ConclusaoPage() {
  const params = useSearchParams()
  const router = useRouter()
  const status = params.get('status') ?? 'pendente'
  const idMatricula = params.get('idMatricula')
  const protocolo = idMatricula ?? `PROT-${Date.now().toString(36).toUpperCase()}`
  const sucesso = status === 'sucesso'

  const [copiado, setCopiado] = useState(false)

  function copiarProtocolo() {
    void navigator.clipboard.writeText(protocolo).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  return (
    // Tarefa 2.D: animação de entrada + protocolo copiável
    <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-up">
      <div className="text-6xl">{sucesso ? '✅' : '⏳'}</div>

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
