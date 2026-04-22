'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ContratoPage() {
  const router = useRouter()
  const params = useSearchParams()
  const ra = params.get('ra') ?? ''
  const codColigada = params.get('codColigada') ?? ''
  const codFilial = params.get('codFilial') ?? ''

  function handleBack() {
    router.push(`/rematricula?ra=${ra}&codColigada=${codColigada}&codFilial=${codFilial}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Contrato de Matrícula</h1>
        <a
          href="/contrato-modelo.pdf"
          download
          className="text-sm text-[var(--cor-primaria,#1e40af)] underline underline-offset-4"
        >
          Baixar PDF
        </a>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ height: '70vh' }}>
        <embed
          src="/contrato-modelo.pdf"
          type="application/pdf"
          className="w-full h-full"
        />
      </div>

      <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
        ← Voltar
      </Button>
    </div>
  )
}
