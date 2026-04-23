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
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible()
  await checkbox.click()
  await expect(page.getByRole('button', { name: /confirmar matrícula/i })).toBeEnabled()
})

test('clicar Confirmar Matrícula abre modal de confirmação', async ({ page }) => {
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible()
  await checkbox.click()
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()
  // Modal deve aparecer com role=dialog
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/confirmar rematrícula/i)).toBeVisible()
})

test('modal exibe nome do aluno e valor final', async ({ page }) => {
  const checkbox = page.getByRole('checkbox').first()
  await checkbox.click()
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  // Dados do aluno e financeiros visíveis no modal
  await expect(page.getByText('Lucas Torres Silva').first()).toBeVisible()
  await expect(page.getByText(/R\$/).first()).toBeVisible()
})

test('botão Cancelar no modal fecha o dialog', async ({ page }) => {
  const checkbox = page.getByRole('checkbox').first()
  await checkbox.click()
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  // Cancelar fecha o modal
  await page.getByRole('button', { name: /cancelar/i }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('confirmar no modal navega para /conclusao com status=sucesso', async ({ page }) => {
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible()
  await checkbox.click()
  // Abre modal
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  // Confirma no modal
  await page.getByRole('dialog').getByRole('button', { name: /confirmar/i }).click()
  await page.waitForURL(/\/conclusao\?.*status=sucesso/)
  await expect(page).toHaveURL(/\/conclusao\?.*status=sucesso/)
})
