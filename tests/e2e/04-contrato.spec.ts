import { test, expect } from '@playwright/test'
import { setAuthCookies, USERS } from './helpers/auth'

const CONTRATO_URL = '/contrato?ra=2024001&codColigada=2&codFilial=3'

test.beforeEach(async ({ page }) => {
  await setAuthCookies(page, USERS.maria)
  await page.goto(CONTRATO_URL)
})

test('embed ou iframe do contrato é visível', async ({ page }) => {
  await expect(page.locator('embed')).toBeVisible()
})

test('link de download está presente', async ({ page }) => {
  const link = page.getByRole('link', { name: /baixar/i })
  await expect(link).toHaveAttribute('href', /contrato-modelo\.pdf/)
})

test('botão Voltar retorna para /rematricula', async ({ page }) => {
  await page.getByRole('button', { name: /voltar/i }).click()
  await page.waitForURL(/\/rematricula/)
  await expect(page).toHaveURL(/\/rematricula\?ra=2024001&codColigada=2&codFilial=3/)
})
