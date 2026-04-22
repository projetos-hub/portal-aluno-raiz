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

      // Use server-provided user if available; otherwise stub until Agent 3
      // updates mockAuthHandler to return user info (pending Sprint 1.5+)
      const user: AuthUser = data.user ?? {
        id: email,
        email,
        codColigada: 0,
        codFilial: 0,
        alunosRA: [],
      }

      // Sempre seta cookies client-readable para que getSession() funcione no layout.
      // /api/auth/session usa httpOnly=true (não legível por JS) — necessário duplicar aqui.
      setSession(data.token, data.expiresIn, user)

      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Também seta httpOnly via API route para segurança adicional em produção.
        await fetch('/api/auth/session', {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {logoutMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-md bg-green-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          Você saiu com sucesso.
        </div>
      )}
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="items-center pb-2 pt-8">
          <Image
            src="/logo-raiz.svg"
            alt="Raiz Educação"
            width={140}
            height={48}
            priority
          />
          <p className="text-muted-foreground text-sm mt-3">
            Portal do Aluno — Rematrícula 2026
          </p>
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
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
