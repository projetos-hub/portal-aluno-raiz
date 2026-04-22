import { test, expect } from '@playwright/test'
import { setAuthCookies, USERS } from './helpers/auth'

const ASSINATURA_URL = '/assinatura?ra=2024001&codColigada=2&codFilial=3&formaPagamento=PIX'

test.beforeEach(async ({ page }) => {
  await setAuthCookies(page, USERS.maria)
  await page.goto(ASSINATURA_URL)
})

test('botão Confirmar está desabilitado sem aceite', async ({ page }) => {
  await expect(page.getByRole('button', { name: /confirmar matrícula/i })).toBeDisabled()
})

test('marcar checkbox de aceite habilita o botão', async ({ page }) => {
  // Aguarda dados carregarem (checkbox aparece após loading)
  // Radix Checkbox renderiza o botão visível com role="checkbox"; o <input id="aceite-termos">
  // é o input oculto para formulários nativos (aria-hidden=true). Selecionar pelo role evita ambiguidade.
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible()
  await checkbox.click()
  await expect(page.getByRole('button', { name: /confirmar matrícula/i })).toBeEnabled()
})

test('submit navega para /conclusao com status=sucesso', async ({ page }) => {
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible()
  await checkbox.click()
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()
  await page.waitForURL(/\/conclusao\?.*status=sucesso/)
  await expect(page).toHaveURL(/\/conclusao\?.*status=sucesso/)
})
