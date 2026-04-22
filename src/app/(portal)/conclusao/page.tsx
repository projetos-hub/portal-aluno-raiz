'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ConclusaoPage() {
  const params = useSearchParams()
  const router = useRouter()
  const status = params.get('status') ?? 'pendente'
  const sucesso = status === 'sucesso'

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12">
      <div className="text-5xl">{sucesso ? '✅' : '⏳'}</div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {sucesso ? 'Matrícula Confirmada!' : 'Matrícula em Análise'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {sucesso
            ? 'Sua matrícula foi registrada com sucesso. Você receberá um e-mail de confirmação em breve.'
            : 'Sua solicitação foi recebida e está sendo analisada. Você será notificado por e-mail assim que for processada.'}
        </p>
      </div>

      {sucesso && (
        <div className="rounded-lg border p-4 text-left space-y-2 text-sm">
          <p className="font-medium">Próximos passos:</p>
          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
            <li>Verifique seu e-mail para o comprovante</li>
            <li>Guarde o número do protocolo</li>
            <li>Em caso de dúvidas, entre em contato com a secretaria</li>
          </ul>
        </div>
      )}

      {sucesso && (
        <a
          href="/contrato-modelo.pdf"
          download
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Baixar comprovante
        </a>
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
