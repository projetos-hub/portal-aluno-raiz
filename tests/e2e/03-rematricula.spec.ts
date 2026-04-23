import { test, expect } from '@playwright/test'
import { setAuthCookies, USERS } from './helpers/auth'

const REMATRICULA_URL = '/rematricula?ra=2024001&codColigada=2&codFilial=3'

test.beforeEach(async ({ page }) => {
  await setAuthCookies(page, USERS.maria)
  await page.goto(REMATRICULA_URL)
})

test('exibe nome do aluno', async ({ page }) => {
  await expect(page.getByText('Lucas Torres Silva')).toBeVisible()
})

test('exibe valor financeiro em BRL', async ({ page }) => {
  // Contrato RA 2024001: VALORFINAL=37800 → R$ 37.800,00
  await expect(page.getByText(/R\$/).first()).toBeVisible()
})

test('seleção de forma de pagamento funciona', async ({ page }) => {
  // Botões agora têm role="radio" (acessibilidade WCAG)
  await expect(page.getByRole('radio', { name: /pix/i })).toHaveAttribute('aria-checked', 'true')

  // Clicar em Boleto muda a seleção
  await page.getByRole('radio', { name: /boleto/i }).click()
  await expect(page.getByRole('radio', { name: /boleto/i })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: /pix/i })).toHaveAttribute('aria-checked', 'false')
})

test('botão Ver Contrato navega para /disciplinas (nova tela de seleção)', async ({ page }) => {
  // Sprint 8.2A: "Ver Contrato PDF" agora vai para /disciplinas antes do contrato
  await expect(page.getByRole('button', { name: /ver contrato/i })).toBeVisible()
  await page.getByRole('button', { name: /ver contrato/i }).click()
  await page.waitForURL(/\/disciplinas\?ra=2024001/)
  await expect(page).toHaveURL(/\/disciplinas\?ra=2024001&codColigada=2&codFilial=3/)
})

test('botão Confirmar e Assinar navega para /assinatura com formaPagamento', async ({ page }) => {
  await expect(page.getByRole('button', { name: /confirmar e assinar/i })).toBeVisible()
  await page.getByRole('button', { name: /confirmar e assinar/i }).click()
  await page.waitForURL(/\/assinatura\?.*formaPagamento=/)
  await expect(page).toHaveURL(/\/assinatura\?ra=2024001.*formaPagamento=PIX/)
})
