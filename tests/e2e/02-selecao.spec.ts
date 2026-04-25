import { test, expect } from '@playwright/test'
import { setAuthCookies, USERS } from './helpers/auth'

test.beforeEach(async ({ page }) => {
  await setAuthCookies(page, USERS.maria)
  await page.goto('/selecao')
  // Aguarda o h1 aparecer — ele só renderiza após loading=false e cards.length > 0,
  // ou seja, quando os dados do mock já chegaram. networkidle não funciona com Next.js
  // dev por causa do WebSocket HMR que mantém conexão permanentemente aberta.
  await page.getByRole('heading', { name: /selecione o aluno/i }).waitFor({ timeout: 20_000 })
})

test('exibe pelo menos um card de aluno', async ({ page }) => {
  // 'Lucas Torres Silva' é o primeiro aluno da coligada 2 no mock
  await expect(page.getByText('Lucas Torres Silva')).toBeVisible()
})

test('cards têm badge REMATRICULA ou MATRÍCULA', async ({ page }) => {
  const badges = page.getByText(/rematricula|matrícula/i)
  await expect(badges.first()).toBeVisible()
  expect(await badges.count()).toBeGreaterThan(0)
})

test('clicar num card navega para /rematricula com params', async ({ page }) => {
  // Sprint 7: cards redesenhados — clica no card via texto do aluno
  const card = page.getByText('Lucas Torres Silva').first()
  await expect(card).toBeVisible()
  await card.click()
  await page.waitForURL(/\/rematricula\?ra=/)
  await expect(page).toHaveURL(/\/rematricula\?ra=.*&codColigada=.*&codFilial=/)
})
