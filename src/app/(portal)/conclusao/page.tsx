'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ConclusaoPage() {
  const params = useSearchParams()
  const router = useRouter()
  const status = params.get('status') ?? 'pendente'
  const protocolo = params.get('protocolo') ?? `PROT-${Date.now().toString(36).toUpperCase()}`
  const sucesso = status === 'sucesso'

  const [copiado, setCopiado] = useState(false)

  function copiarProtocolo() {
    void navigator.clipboard.writeText(protocolo).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    // Sprint 7.E: animação de entrada
    <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="text-6xl">{sucesso ? '🎉' : '⏳'}</div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {sucesso ? 'Matrícula Confirmada!' : 'Matrícula em Análise'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {sucesso
            ? 'Sua vaga para o próximo ano está garantida. Em breve você receberá o comprovante por e-mail.'
            : 'Sua solicitação foi recebida e está sendo analisada. Você será notificado por e-mail assim que for processada.'}
        </p>
      </div>

      {sucesso && (
        <>
          {/* Sprint 7.E: protocolo copiável */}
          <div className="rounded-lg border-2 border-dashed border-[var(--cor-primaria,#1e40af)]/40 p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Protocolo</p>
            <p className="text-lg font-mono font-bold tracking-wider text-[var(--cor-primaria,#1e40af)]">
              {protocolo}
            </p>
            <button
              onClick={copiarProtocolo}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              {copiado ? '✓ Copiado!' : 'Copiar protocolo'}
            </button>
          </div>

          <div className="rounded-lg border p-4 text-left space-y-2 text-sm">
            <p className="font-medium">Próximos passos:</p>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Verifique seu e-mail para o comprovante</li>
              <li>Guarde o número do protocolo acima</li>
              <li>Em caso de dúvidas, entre em contato com a secretaria</li>
            </ul>
          </div>

          <a
            href="/contrato-modelo.pdf"
            download
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Baixar comprovante
          </a>
        </>
      )}

      <Button
        className="w-full"
        style={{ backgroundColor: 'var(--cor-primaria, #1e40af)' }}
        onClick={() => router.push('/selecao')}
      >
        Voltar ao início
      </Button>
    </div>
  )
}
