import type { AuthUser } from './totvs/types'

const TOKEN_COOKIE = 'portal_token'
const USER_COOKIE = 'portal_user'

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

export function setSession(token: string, expiresIn: number, user: AuthUser): void {
  setCookie(TOKEN_COOKIE, token, expiresIn)
  setCookie(USER_COOKIE, JSON.stringify(user), expiresIn)
}

export function getSession(): { token: string; user: AuthUser } | null {
  const token = getCookieValue(TOKEN_COOKIE)
  const userRaw = getCookieValue(USER_COOKIE)
  if (!token || !userRaw) return null
  try {
    const user = JSON.parse(userRaw) as AuthUser
    return { token, user }
  } catch {
    return null
  }
}

export function clearSession(): void {
  deleteCookie(TOKEN_COOKIE)
  deleteCookie(USER_COOKIE)
}

export function isAuthenticated(): boolean {
  return getCookieValue(TOKEN_COOKIE) !== null
}

export type { AuthUser }
