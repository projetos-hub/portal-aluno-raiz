import type { Page } from '@playwright/test'

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/e-?mail/i).fill(email)
  // Usar label exato 'Senha' para evitar conflito com aria-label do toggle de senha
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
}

export async function setAuthCookies(
  page: Page,
  user: { id: string; email: string; codColigada: number; codFilial: number; alunosRA: readonly string[] | string[] },
) {
  await page.goto('/login')
  await page.context().addCookies([
    {
      name: 'portal_token',
      value: 'mock-token-test',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'portal_user',
      value: encodeURIComponent(JSON.stringify(user)),
      domain: 'localhost',
      path: '/',
    },
  ])
}

export const USERS = {
  maria: {
    id: '1',
    email: 'maria.silva@email.com',
    codColigada: 2,
    codFilial: 3,
    alunosRA: ['2024001', '2024002'],
  },
  joao: {
    id: '2',
    email: 'joao.pereira@email.com',
    codColigada: 9,
    codFilial: 1,
    alunosRA: ['2024003', '2024004'],
  },
} as const
