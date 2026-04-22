import { test, expect } from '@playwright/test'

test('fluxo completo: login → selecao → rematricula → assinatura → conclusao', async ({ page }) => {
  // 1. Login
  await page.goto('/login')
  await page.getByLabel(/e-?mail/i).fill('maria.silva@email.com')
  await page.getByLabel(/senha/i).fill('123456')
  await page.getByRole('button', { name: /entrar/i }).click()

  // 2. Selecao — aguarda cards de aluno carregarem
  await page.waitForURL(/\/selecao/)
  const firstCard = page.locator('[class*="cursor-pointer"]').first()
  await expect(firstCard).toBeVisible({ timeout: 10_000 })
  await firstCard.click()

  // 3. Rematricula — aguarda dados financeiros e clica em Confirmar e Assinar
  await page.waitForURL(/\/rematricula\?ra=/)
  await expect(page.getByRole('button', { name: /confirmar e assinar/i })).toBeVisible({
    timeout: 10_000,
  })
  await page.getByRole('button', { name: /confirmar e assinar/i }).click()

  // 4. Assinatura — aguarda checkbox carregar, aceita termos e confirma
  await page.waitForURL(/\/assinatura\?/)
  // Radix Checkbox: botão visível tem role="checkbox"; o <input id="aceite-termos"> é oculto
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible({ timeout: 10_000 })
  await checkbox.click()
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()

  // 5. Conclusao — verifica mensagem final
  await page.waitForURL(/\/conclusao/)
  await expect(page.getByText(/matrícula confirmada|análise/i)).toBeVisible()
})
