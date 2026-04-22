'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { getSession, clearSession } from '@/lib/auth'
import { BrandThemeContext, getBrandTheme } from '@/lib/brand-theme'
import type { BrandTheme } from '@/lib/brand-theme'
import { Button } from '@/components/ui/button'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setTheme] = useState<BrandTheme | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { codColigada, codFilial } = session.user
    if (codColigada) {
      try {
        setTheme(getBrandTheme(codColigada, codFilial))
      } catch {
        // Marca não mapeada ainda — layout sem tema dinâmico
      }
    }
    setMounted(true)
  }, [router, pathname])

  function handleLogout() {
    clearSession()
    sessionStorage.setItem('logout_msg', '1')
    router.push('/login')
  }

  if (!mounted) return null

  const content = (
    <div
      className="min-h-screen flex flex-col"
      style={
        theme
          ? ({
              '--cor-primaria': theme.corPrimaria,
              '--cor-secundaria': theme.corSecundaria,
              '--cor-texto': theme.corTexto,
            } as React.CSSProperties)
          : undefined
      }
    >
      <header
        className="flex items-center justify-between px-4 py-3 shadow-sm"
        style={{
          backgroundColor: theme?.corPrimaria ?? '#1e40af',
          color: theme?.corTexto ?? '#FFFFFF',
        }}
      >
        <div className="flex items-center gap-3">
          {theme ? (
            <Image
              src={`/logos/${theme.logoFile}`}
              alt={theme.marca}
              width={80}
              height={28}
              priority
              className="object-contain brightness-0 invert"
            />
          ) : (
            <Image
              src="/logo-raiz.svg"
              alt="Raiz Educação"
              width={80}
              height={28}
              priority
              className="object-contain brightness-0 invert"
            />
          )}
          <span className="text-sm font-medium hidden sm:block">
            {theme?.nomeEscola ?? 'Portal do Aluno'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-white hover:bg-white/20"
        >
          Sair
        </Button>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  )

  if (theme) {
    return <BrandThemeContext.Provider value={theme}>{content}</BrandThemeContext.Provider>
  }
  return content
}
