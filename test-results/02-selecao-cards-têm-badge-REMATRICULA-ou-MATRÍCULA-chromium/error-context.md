# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-selecao.spec.ts >> cards têm badge REMATRICULA ou MATRÍCULA
- Location: tests\e2e\02-selecao.spec.ts:18:5

# Error details

```
TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('heading', { name: /selecione o aluno/i }) to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - banner [ref=e13]:
      - generic [ref=e14]:
        - img "Colégio Qi Bilíngue" [ref=e15]
        - generic [ref=e16]: Colégio Qi Bilíngue — Botafogo
      - button "Sair" [ref=e17]
    - main [ref=e18]:
      - generic [ref=e19]: Não foi possível carregar os alunos. Tente novamente.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { setAuthCookies, USERS } from './helpers/auth'
  3  | 
  4  | test.beforeEach(async ({ page }) => {
  5  |   await setAuthCookies(page, USERS.maria)
  6  |   await page.goto('/selecao')
  7  |   // Aguarda o h1 aparecer — ele só renderiza após loading=false e cards.length > 0,
  8  |   // ou seja, quando os dados do mock já chegaram. networkidle não funciona com Next.js
  9  |   // dev por causa do WebSocket HMR que mantém conexão permanentemente aberta.
> 10 |   await page.getByRole('heading', { name: /selecione o aluno/i }).waitFor({ timeout: 20_000 })
     |                                                                   ^ TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
  11 | })
  12 | 
  13 | test('exibe pelo menos um card de aluno', async ({ page }) => {
  14 |   // 'Lucas Torres Silva' é o primeiro aluno da coligada 2 no mock
  15 |   await expect(page.getByText('Lucas Torres Silva')).toBeVisible()
  16 | })
  17 | 
  18 | test('cards têm badge REMATRICULA ou MATRÍCULA', async ({ page }) => {
  19 |   const badges = page.getByText(/rematricula|matrícula/i)
  20 |   await expect(badges.first()).toBeVisible()
  21 |   expect(await badges.count()).toBeGreaterThan(0)
  22 | })
  23 | 
  24 | test('clicar num card navega para /rematricula com params', async ({ page }) => {
  25 |   // Aguarda os cards carregarem (dados chegam via API mock assíncrona)
  26 |   const firstCard = page.locator('[class*="cursor-pointer"]').first()
  27 |   await expect(firstCard).toBeVisible()
  28 |   await firstCard.click()
  29 |   await page.waitForURL(/\/rematricula\?ra=/)
  30 |   await expect(page).toHaveURL(/\/rematricula\?ra=.*&codColigada=.*&codFilial=/)
  31 | })
  32 | 
```