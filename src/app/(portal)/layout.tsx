'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { getSession, clearSession } from '@/lib/auth'
import { BrandThemeContext, getBrandTheme } from '@/lib/brand-theme'
import type { BrandTheme } from '@/lib/brand-theme'
import { Button } from '@/components/ui/button'

// Sprint 7.A: skeleton do header para eliminar flash de tela branca
function PortalHeaderSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 shadow-sm bg-[#1e40af]">
        <div className="flex items-center gap-3">
          <div className="h-7 w-20 rounded bg-white/20 animate-pulse" />
          <div className="h-4 w-28 rounded bg-white/20 animate-pulse hidden sm:block" />
        </div>
        <div className="h-8 w-12 rounded bg-white/20 animate-pulse" />
      </header>
      <main className="flex-1 p-4 sm:p-6" />
    </div>
  )
}

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
        // Marca não mapeada — layout sem tema dinâmico
      }
    }
    setMounted(true)
  }, [router, pathname])

  function handleLogout() {
    clearSession()
    sessionStorage.setItem('logout_msg', '1')
    router.push('/login')
  }

  // Sprint 7.A: skeleton em vez de tela branca enquanto monta
  if (!mounted) return <PortalHeaderSkeleton />

  const headerBg = theme?.corPrimaria ?? '#1e40af'
  const headerColor = theme?.corTexto ?? '#FFFFFF'

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
        className="flex items-center justify-between px-4 py-3 shadow-sm transition-colors duration-300"
        style={{ backgroundColor: headerBg, color: headerColor }}
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
          {/* Sprint 7.C: banner boas-vindas da escola */}
          {theme && (
            <div className="flex flex-col">
              <span className="text-xs opacity-75 leading-none hidden sm:block">
                Bem-vindo ao
              </span>
              <span className="text-sm font-semibold hidden sm:block leading-tight">
                {theme.nomeEscola}
              </span>
            </div>
          )}
          {!theme && (
            <span className="text-sm font-medium hidden sm:block">Portal do Aluno</span>
          )}
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
      {/* Sprint 7.F: fadeIn na troca de página */}
      <main className="flex-1 p-4 sm:p-6 animate-in fade-in duration-200">{children}</main>
    </div>
  )

  if (theme) {
    return <BrandThemeContext.Provider value={theme}>{content}</BrandThemeContext.Provider>
  }
  return content
}
