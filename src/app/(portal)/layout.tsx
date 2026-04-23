'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { getSession, clearSession } from '@/lib/auth'
import { BrandThemeContext, getBrandTheme } from '@/lib/brand-theme'
import type { BrandTheme } from '@/lib/brand-theme'

function PortalHeaderSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-16 sm:h-[68px] flex items-center justify-between px-5 sm:px-8" style={{ background: 'var(--cor-primaria, #1e40af)' }}>
        <div className="flex items-center gap-4">
          <div className="h-8 w-24 rounded-md bg-white/15 animate-pulse" />
          <div className="hidden sm:flex flex-col gap-1">
            <div className="h-2.5 w-28 rounded bg-white/15 animate-pulse" />
            <div className="h-2 w-20 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-12 rounded-lg bg-white/15 animate-pulse" />
      </div>
      <main className="flex-1 p-4 sm:p-6 sm:p-8" />
    </div>
  )
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setTheme] = useState<BrandTheme | null>(null)
  const [mounted, setMounted] = useState(false)
  // Fix 1: fallback quando logo não carrega (ex: arquivo não encontrado em produção)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { codColigada, codFilial } = session.user
    if (codColigada) {
      try {
        const newTheme = getBrandTheme(codColigada, codFilial)
        setTheme(prev => {
          // Reseta logoError quando a escola muda (troca de usuário/escola)
          if (prev?.slug !== newTheme.slug) setLogoError(false)
          return newTheme
        })
      } catch {
        // Escola não mapeada — layout sem tema dinâmico
      }
    }
    setMounted(true)
  }, [router, pathname])

  function handleLogout() {
    clearSession()
    sessionStorage.setItem('logout_msg', '1')
    router.push('/login')
  }

  if (!mounted) return <PortalHeaderSkeleton />

  const corPrimaria = theme?.corPrimaria ?? '#1e40af'
  const corSecundaria = theme?.corSecundaria ?? '#1e3a8a'
  const corTexto = theme?.corTexto ?? '#ffffff'

  const content = (
    <div
      className="min-h-screen flex flex-col"
      style={
        theme
          ? ({
              '--cor-primaria': corPrimaria,
              '--cor-secundaria': corSecundaria,
              '--cor-texto': corTexto,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* Tarefa 2.B: header com branding dramático */}
      <header
        className="flex items-center justify-between px-5 sm:px-8 transition-colors duration-500"
        style={{
          background: `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`,
          color: corTexto,
          minHeight: theme ? '68px' : '60px',
        }}
      >
        <div className="flex items-center gap-4">
          {theme && !logoError ? (
            <Image
              src={`/logos/${theme.logoFile}`}
              alt={theme.marca}
              width={88}
              height={32}
              priority
              className="object-contain brightness-0 invert"
              onError={() => setLogoError(true)}
            />
          ) : theme ? (
            <span className="text-sm font-bold tracking-tight">{theme.marca}</span>
          ) : (
            <Image
              src="/logo-raiz.svg"
              alt="Raiz Educação"
              width={88}
              height={32}
              priority
              className="object-contain brightness-0 invert"
            />
          )}
          {/* Tarefa 2.B: banner boas-vindas da escola */}
          {theme && (
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs font-medium opacity-70 tracking-wide">
                Bem-vindo ao
              </span>
              <span className="text-sm font-semibold">{theme.nomeEscola}</span>
            </div>
          )}
          {!theme && (
            <span className="hidden sm:block text-sm font-medium opacity-90">
              Portal do Aluno
            </span>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-white/15 active:bg-white/25"
          style={{ color: corTexto }}
        >
          Sair
        </button>
      </header>

      {/* Tarefa 2.E: fadeUp nas transições de página */}
      <main key={pathname} className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-up">
        {children}
      </main>
    </div>
  )

  if (theme) {
    return <BrandThemeContext.Provider value={theme}>{content}</BrandThemeContext.Provider>
  }
  return content
}
