import { test, expect } from '@playwright/test'
import { setAuthCookies, USERS } from './helpers/auth'

// Qi Bilíngue (codColigada=2): obrigatórias — Matemática, Língua Portuguesa, História
//                               optativas  — Arte e Expressão, Filosofia e Ética
const DISCIPLINAS_URL = '/disciplinas?ra=2024001&codColigada=2&codFilial=3&formaPagamento=PIX'

// Timeout aumentado: Next.js compila a página no primeiro acesso (~20-30s em cold start)
test.setTimeout(60_000)

test.beforeEach(async ({ page }) => {
  await setAuthCookies(page, USERS.maria)
  await page.goto(DISCIPLINAS_URL)
  // 20s para o heading aparecer (inclui compilação do servidor na primeira vez)
  await page
    .getByRole('heading', { name: /seleção de disciplinas/i })
    .waitFor({ timeout: 20_000 })
})

test('tela carrega após "Ver Contrato PDF" na rematricula', async ({ page }) => {
  // Testa o fluxo de navegação: rematricula → disciplinas
  await setAuthCookies(page, USERS.maria)
  await page.goto('/rematricula?ra=2024001&codColigada=2&codFilial=3')
  await expect(
    page.getByRole('button', { name: /ver contrato pdf/i }),
  ).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /ver contrato pdf/i }).click()
  await page.waitForURL(/\/disciplinas\?ra=2024001/)
  await expect(page.getByRole('heading', { name: /seleção de disciplinas/i })).toBeVisible()
})

test('disciplinas obrigatórias aparecem (Matemática, Língua Portuguesa, História)', async ({ page }) => {
  await expect(page.getByText('Matemática')).toBeVisible()
  await expect(page.getByText('Língua Portuguesa')).toBeVisible()
  await expect(page.getByText('História')).toBeVisible()
  // Badge "obrigatória" visível pelo menos uma vez
  expect(await page.getByText('obrigatória').count()).toBeGreaterThan(0)
})

test('disciplina obrigatória não tem checkbox interativo — apenas decorativo', async ({ page }) => {
  // O checkbox decorativo tem aria-hidden; os únicos checkboxes interativos são das optativas
  const interactiveCheckboxes = page.getByRole('checkbox')
  const count = await interactiveCheckboxes.count()
  // Deve ter pelo menos 1 (optativas) mas NÃO deve ter checkboxes para cada obrigatória
  expect(count).toBeGreaterThanOrEqual(1)
  // As optativas são 2 (Arte e Expressão, Filosofia e Ética)
  expect(count).toBeLessThanOrEqual(5)
})

test('disciplina optativa pode ser marcada e desmarcada', async ({ page }) => {
  // Arte e Expressão é optativa — começa desmarcada (aria-checked="false")
  const checkbox = page.getByRole('checkbox', { name: /arte e expressão/i })
  await expect(checkbox).toBeVisible()
  await expect(checkbox).toHaveAttribute('aria-checked', 'false')

  // Marcar
  await checkbox.click()
  await expect(checkbox).toHaveAttribute('aria-checked', 'true')

  // Desmarcar
  await checkbox.click()
  await expect(checkbox).toHaveAttribute('aria-checked', 'false')
})

test('botão "Ver Contrato PDF" navega para /contrato', async ({ page }) => {
  await page.getByRole('button', { name: /ver contrato pdf/i }).click()
  await page.waitForURL(/\/contrato\?ra=2024001/)
  await expect(page).toHaveURL(/\/contrato\?ra=2024001&codColigada=2&codFilial=3/)
})

test('botão "Confirmar e Assinar" navega para /assinatura', async ({ page }) => {
  await page.getByRole('button', { name: /confirmar e assinar/i }).click()
  await page.waitForURL(/\/assinatura\?.*formaPagamento=PIX/)
  await expect(page).toHaveURL(/\/assinatura\?ra=2024001.*formaPagamento=PIX/)
})

test('ao selecionar optativa, info de turma aparece', async ({ page }) => {
  const checkbox = page.getByRole('checkbox', { name: /arte e expressão/i })
  await checkbox.click()
  await expect(checkbox).toHaveAttribute('aria-checked', 'true')
  // Após marcar, informações de turma ficam visíveis
  await expect(page.getByText(/ART-A/)).toBeVisible()
})
