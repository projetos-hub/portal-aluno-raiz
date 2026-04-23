import { test, expect } from '@playwright/test'
import { setAuthCookies, USERS } from './helpers/auth'

/**
 * Testa o cenário de erro ERR-001: quando RA=ERR-001, o POST de EduMatriculaData
 * retorna erro TOTVS 0422 ("Matrícula não permitida — pendência financeira").
 * A tela /assinatura deve exibir erro inline e NÃO navegar para /conclusao.
 */

// URL com RA=ERR-001 (cenário de erro criado pelo Agente 3)
const ASSINATURA_ERR_URL = '/assinatura?ra=ERR-001&codColigada=2&codFilial=3&formaPagamento=PIX'

test.beforeEach(async ({ page }) => {
  await setAuthCookies(page, USERS.maria)
  await page.goto(ASSINATURA_ERR_URL)
  // A página tenta carregar dados do aluno ERR-001 — pode retornar vazio/null
  // Aguarda o formulário estar presente (mesmo sem dados completos)
  await expect(page.getByRole('heading', { name: /assinatura digital/i }))
    .toBeVisible({ timeout: 10_000 })
})

test('ERR-001: confirmar no modal exibe erro e não navega para /conclusao', async ({ page }) => {
  // Marcar o aceite de termos
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible()
  await checkbox.click()
  await expect(checkbox).toHaveAttribute('aria-checked', 'true')

  // Clicar "Confirmar Matrícula" → modal aparece
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Confirmar no modal → POST com RA=ERR-001 retorna erro
  await page.getByRole('dialog').getByRole('button', { name: /confirmar/i }).click()

  // Deve exibir mensagem de erro inline (não navega para /conclusao)
  await expect(page.getByText(/erro|pendência|não permitida/i)).toBeVisible({ timeout: 10_000 })
  await expect(page).not.toHaveURL(/\/conclusao/)
})

test('ERR-001: mensagem de erro contém informação sobre o problema', async ({ page }) => {
  const checkbox = page.getByRole('checkbox').first()
  await checkbox.click()
  await page.getByRole('button', { name: /confirmar matrícula/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: /confirmar/i }).click()

  // Verifica que algum texto de erro aparece
  const errorMsg = page.getByText(/erro|pendência|matrícula|tente novamente/i)
  await expect(errorMsg.first()).toBeVisible({ timeout: 10_000 })

  // URL permanece em /assinatura
  await expect(page).toHaveURL(/\/assinatura\?ra=ERR-001/)
})
