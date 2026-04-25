import { test, expect } from '@playwright/test'
import { setAuthCookies, USERS } from './helpers/auth'

test.beforeEach(async ({ page }) => {
  await setAuthCookies(page, USERS.maria)
})

test('status=sucesso exibe Matrícula Confirmada!', async ({ page }) => {
  await page.goto('/conclusao?status=sucesso')
  await expect(page.getByText('🎉')).toBeVisible() // Sprint 7: emoji alterado
  await expect(page.getByText(/matrícula confirmada/i)).toBeVisible()
})

test('status=pendente exibe Matrícula em Análise', async ({ page }) => {
  await page.goto('/conclusao?status=pendente')
  await expect(page.getByText('⏳')).toBeVisible()
  await expect(page.getByText(/análise/i)).toBeVisible()
})

test('botão Voltar ao início navega para /selecao', async ({ page }) => {
  // "Voltar ao início" usa router.push (Button, não Link) — verificar pela navegação
  await page.goto('/conclusao?status=sucesso')
  await page.getByRole('button', { name: /voltar ao início/i }).click()
  await page.waitForURL(/\/selecao/)
  await expect(page).toHaveURL(/\/selecao/)
})
