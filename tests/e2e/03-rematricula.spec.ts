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
  // PIX está selecionado por padrão (font-medium na classe)
  await expect(page.getByRole('button', { name: 'Pix' })).toHaveClass(/font-medium/)

  // Clicar em Boleto muda a seleção
  await page.getByRole('button', { name: 'Boleto bancário' }).click()
  await expect(page.getByRole('button', { name: 'Boleto bancário' })).toHaveClass(/font-medium/)
  await expect(page.getByRole('button', { name: 'Pix' })).not.toHaveClass(/font-medium/)
})

test('botão Ver Contrato navega para /contrato mantendo params', async ({ page }) => {
  // Aguarda dados carregarem (bloco financeiro + botões aparecem após fetch)
  await expect(page.getByRole('button', { name: /ver contrato/i })).toBeVisible()
  await page.getByRole('button', { name: /ver contrato/i }).click()
  await page.waitForURL(/\/contrato\?ra=2024001/)
  await expect(page).toHaveURL(/\/contrato\?ra=2024001&codColigada=2&codFilial=3/)
})

test('botão Confirmar e Assinar navega para /assinatura com formaPagamento', async ({ page }) => {
  await expect(page.getByRole('button', { name: /confirmar e assinar/i })).toBeVisible()
  await page.getByRole('button', { name: /confirmar e assinar/i }).click()
  await page.waitForURL(/\/assinatura\?.*formaPagamento=/)
  await expect(page).toHaveURL(/\/assinatura\?ra=2024001.*formaPagamento=PIX/)
})
