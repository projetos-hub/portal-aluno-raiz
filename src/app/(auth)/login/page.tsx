'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setSession } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [logoutMsg, setLogoutMsg] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('logout_msg')) {
      sessionStorage.removeItem('logout_msg')
      setLogoutMsg(true)
      const t = setTimeout(() => setLogoutMsg(false), 4000)
      return () => clearTimeout(t)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/totvs/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })

      const data = (await res.json()) as
        | { token: string; expiresIn: number; user?: AuthUser }
        | { error: string }

      if ('error' in data) {
        setError(data.error)
        return
      }

      const user: AuthUser = data.user ?? {
        id: email,
        email,
        codColigada: 0,
        codFilial: 0,
        alunosRA: [],
      }

      // Seta cookies client-readable para getSession() no layout
      setSession(data.token, data.expiresIn, user)

      // Tarefa 2.F: reativar httpOnly via /api/auth/session agora que Agente 1
      // renomeou os cookies para portal_token_http/portal_user_http (sem conflito)
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        void fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.token, expiresIn: data.expiresIn, user }),
        })
      }

      router.push('/selecao')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Tarefa 2.A: login com identidade editorial forte
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Painel lateral — identidade da Raiz Educação */}
      <div
        className="hidden lg:flex lg:w-2/5 xl:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)' }}
      >
        {/* Textura sutil */}
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative z-10 text-center space-y-6 max-w-sm">
          <Image
            src="/logo-raiz.svg"
            alt="Raiz Educação"
            width={200}
            height={68}
            priority
            className="brightness-0 invert mx-auto"
          />
          <div className="space-y-2">
            <p className="text-white/90 text-xl font-light leading-relaxed">
              Portal do Aluno
            </p>
            <p className="text-white/50 text-sm">
              Rematrícula {new Date().getFullYear() + 1}
            </p>
          </div>
          <div className="w-12 h-px bg-white/30 mx-auto" />
          <p className="text-white/40 text-xs leading-relaxed">
            Acesse para confirmar a matrícula do seu filho no próximo ano letivo.
          </p>
        </div>
      </div>

      {/* Painel do formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-white">
        {logoutMsg && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm text-white shadow-lg"
          >
            Você saiu com sucesso.
          </div>
        )}

        <div className="w-full max-w-sm space-y-8 animate-fade-up">
          {/* Logo mobile */}
          <div className="lg:hidden text-center">
            <Image
              src="/logo-raiz.svg"
              alt="Raiz Educação"
              width={140}
              height={48}
              priority
              className="mx-auto"
            />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Entrar</h1>
            <p className="text-sm text-gray-500">Acesse com seu e-mail e senha</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="responsavel@email.com"
                required
                autoComplete="email"
                autoFocus
                className="h-11 rounded-xl border-gray-200 focus:border-[var(--cor-primaria)] focus:ring-[var(--cor-primaria)]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                required
                autoComplete="current-password"
                className="h-11 rounded-xl border-gray-200 focus:border-[var(--cor-primaria)] focus:ring-[var(--cor-primaria)]/20"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-60 hover:opacity-90 active:scale-[.99] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--cor-primaria) 0%, var(--cor-secundaria) 100%)' }}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
