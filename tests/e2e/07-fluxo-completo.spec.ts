import { test, expect } from '@playwright/test'

test('fluxo completo: login → selecao → rematricula → assinatura → conclusao', async ({ page }) => {
  // 1. Login
  await page.goto('/login')
  await page.getByLabel(/e-?mail/i).fill('maria.silva@email.com')
  await page.locator('#password').fill('123456')
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

  // 4. Assinatura — aguarda checkbox carregar, aceita termos e abre modal de confirmação
  await page.waitForURL(/\/assinatura\?/)
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible({ timeout: 10_000 })
  await checkbox.click()
  // Clicar "Confirmar Matrícula" agora abre o modal (não submete direto)
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()
  // Confirmar dentro do modal
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: /confirmar/i }).click()

  // 5. Conclusao — verifica mensagem final
  await page.waitForURL(/\/conclusao/)
  await expect(page.getByText(/matrícula confirmada|análise/i)).toBeVisible()
})
