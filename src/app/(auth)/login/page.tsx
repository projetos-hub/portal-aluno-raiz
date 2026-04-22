'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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

      // Seta cookies client-readable (lidos por getSession() no layout).
      // Não usar /api/auth/session aqui: httpOnly sobrescreve o cookie não-httpOnly
      // impedindo getSession() de funcionar (bug de coexistência de cookies em Chrome).
      setSession(data.token, data.expiresIn, user)
      router.push('/selecao')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Sprint 7.B: gradiente de fundo e layout visual mais rico
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1e40af] via-[#1e3a8a] to-[#172554]">
      {logoutMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-md bg-green-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          Você saiu com sucesso.
        </div>
      )}

      <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Sprint 7.B: logo maior centralizada acima do card */}
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/logo-raiz.svg"
            alt="Raiz Educação"
            width={180}
            height={60}
            priority
            className="brightness-0 invert"
          />
          <p className="text-white/80 text-sm">Portal do Aluno — Rematrícula 2026</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-2 pt-6">
            <h1 className="text-xl font-semibold text-center">Entrar</h1>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="responsavel@email.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                  {error}
                </p>
              )}
              {/* Sprint 7.B: loading no botão com spinner */}
              <Button
                type="submit"
                className="w-full mt-2 bg-[#1e40af] hover:bg-[#1e3a8a]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Entrando…
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
