import { test, expect } from '@playwright/test'

test('login válido redireciona para /selecao', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/e-?mail/i).fill('maria.silva@email.com')
  await page.locator('#password').fill('123456')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL(/\/selecao/)
  await expect(page).toHaveURL(/\/selecao/)
})

test('credencial inválida exibe erro e não redireciona', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/e-?mail/i).fill('naoexiste@email.com')
  await page.locator('#password').fill('errada')
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page.getByText(/inválid/i)).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('acesso não autenticado a /selecao redireciona para /login', async ({ page }) => {
  await page.goto('/selecao')
  await page.waitForURL(/\/login/)
  await expect(page).toHaveURL(/\/login/)
})
