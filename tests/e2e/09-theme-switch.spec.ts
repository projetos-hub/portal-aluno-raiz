import { test, expect, type Page } from '@playwright/test'
import { setAuthCookies, USERS } from './helpers/auth'

/**
 * Testa a troca de tema ao alternar entre usuários de escolas diferentes.
 * Garante que ao fazer logout e novo login, o tema da escola anterior
 * não persiste — cada escola tem sua identidade visual única.
 */

// Timeout ampliado: testes envolvem múltiplas navegações (login → portal → logout → login)
test.setTimeout(60_000)

async function loginViaUI(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel(/e-?mail/i).fill(email)
  await page.locator('#password').fill('123456')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL(/\/selecao/, { timeout: 20_000 })
}

test('tema muda ao trocar de usuário: Qi Bilíngue → Global Tree', async ({ page }) => {
  // 1. Login como maria.silva (Qi Bilíngue, codColigada=2)
  await loginViaUI(page, 'maria.silva@email.com')

  // Verifica que o banner da escola Qi Bilíngue aparece no header
  await expect(page.getByText(/qi bilíngue/i).first()).toBeVisible({ timeout: 10_000 })

  // 2. Logout
  await page.getByRole('button', { name: /sair/i }).click()
  await page.waitForURL(/\/login/)

  // 3. Login como joao.pereira (Global Tree, codColigada=9)
  await loginViaUI(page, 'joao.pereira@email.com')

  // Verifica que o tema mudou para Global Tree
  await expect(page.getByText(/global tree/i).first()).toBeVisible({ timeout: 10_000 })

  // Garante que Qi Bilíngue não aparece mais
  await expect(page.getByText(/qi bilíngue/i)).not.toBeVisible()
})

test('logout limpa a sessão — acesso ao portal redireciona para login', async ({ page }) => {
  // Usa setAuthCookies para setup rápido (não testa o fluxo UI de login aqui)
  await setAuthCookies(page, USERS.maria)
  await page.goto('/selecao')
  await expect(page).toHaveURL(/\/selecao/)

  // Logout via botão Sair
  await page.getByRole('button', { name: /sair/i }).click()
  await page.waitForURL(/\/login/)

  // Tentar acessar rota protegida redireciona para login
  await page.goto('/selecao')
  await page.waitForURL(/\/login/)
  await expect(page).toHaveURL(/\/login/)
})

test('toast "Você saiu com sucesso" aparece após logout', async ({ page }) => {
  // Usa setAuthCookies para setup rápido
  await setAuthCookies(page, USERS.maria)
  await page.goto('/selecao')

  // Logout via botão Sair
  await page.getByRole('button', { name: /sair/i }).click()
  await page.waitForURL(/\/login/)

  // Toast de confirmação de logout deve aparecer
  await expect(page.getByText(/você saiu com sucesso/i)).toBeVisible()
})
