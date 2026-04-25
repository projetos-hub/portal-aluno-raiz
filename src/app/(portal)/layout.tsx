'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { getSession, clearSession } from '@/lib/auth'
import { BrandThemeContext, getBrandTheme } from '@/lib/brand-theme'
import type { BrandTheme } from '@/lib/brand-theme'

const STEPS = [
  { label: 'Seleção',    path: '/selecao' },
  { label: 'Rematrícula', path: '/rematricula' },
  { label: 'Contrato',   path: '/contrato' },
  { label: 'Assinatura', path: '/assinatura' },
  { label: 'Conclusão',  path: '/conclusao' },
]

function FluxoStepper({ pathname }: { pathname: string }) {
  const activeIdx = STEPS.findIndex(s => pathname.startsWith(s.path))
  if (activeIdx === -1) return null

  return (
    <nav
      aria-label="Etapas do processo"
      className="bg-white border-b border-gray-100 px-4 sm:px-8 py-2.5"
    >
      <ol className="flex items-center justify-between max-w-lg mx-auto gap-0">
        {STEPS.map((step, i) => {
          const done = i < activeIdx
          const active = i === activeIdx
          return (
            <li key={step.path} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: done || active ? 'var(--cor-primaria, #1e40af)' : '#e5e7eb',
                    color: done || active ? 'var(--cor-texto, #fff)' : '#9ca3af',
                    transform: active ? 'scale(1.15)' : 'scale(1)',
                  }}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? (
                    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className="text-[10px] leading-tight font-medium hidden sm:block transition-colors"
                  style={{ color: active ? 'var(--cor-primaria, #1e40af)' : done ? '#6b7280' : '#9ca3af' }}
                >
                  {step.label}
                </span>
                {active && (
                  <span className="text-[10px] leading-tight font-medium sm:hidden" style={{ color: 'var(--cor-primaria, #1e40af)' }}>
                    {step.label}
                  </span>
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-1.5 sm:mx-2 transition-all duration-300"
                  style={{ background: i < activeIdx ? 'var(--cor-primaria, #1e40af)' : '#e5e7eb' }}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

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

const emptySubscribe = () => () => {}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [logoError, setLogoError] = useState(false)
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  useEffect(() => {
    if (!getSession()) {
      router.push('/login')
    }
  }, [router, pathname])

  let theme: BrandTheme | null = null
  if (isMounted) {
    const session = getSession()
    if (session?.user.codColigada) {
      try {
        theme = getBrandTheme(session.user.codColigada, session.user.codFilial)
      } catch {
        // Escola não mapeada
      }
    }
  }

  function handleLogout() {
    clearSession()
    sessionStorage.setItem('logout_msg', '1')
    router.push('/login')
  }

  if (!isMounted) return <PortalHeaderSkeleton />

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
          {theme && (
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs font-medium opacity-70 tracking-wide">Bem-vindo ao</span>
              <span className="text-sm font-semibold">{theme.nomeEscola}</span>
            </div>
          )}
          {!theme && (
            <span className="hidden sm:block text-sm font-medium opacity-90">Portal do Aluno</span>
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

      <FluxoStepper pathname={pathname} />

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
