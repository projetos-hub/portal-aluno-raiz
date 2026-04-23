# Documentação Técnica — API Backend
**Portal do Aluno — Raiz Educação**
**Última atualização:** 22/04/2026

---

## Visão Geral

O frontend **nunca chama o TOTVS diretamente**. Toda comunicação passa por API Routes no Next.js que fazem proxy, autenticam e loguam as chamadas.

---

## Endpoints

### `POST /api/totvs/auth`
Autentica o usuário.

**Body:**
```json
{ "username": "email@escola.com", "password": "senha" }
```

**Resposta sucesso (200):**
```json
{ "token": "eyJ...", "expiresIn": 300, "user": { "id": "1", "email": "...", "codColigada": 2, "codFilial": 3, "alunosRA": ["2024001"] } }
```

**Resposta falha (401):**
```json
{ "error": "Credencial inválida" }
```

**Rate limit (429):**
```json
{ "error": "Too many requests", "retryAfter": 900 }
```
Header: `Retry-After: 900`
Limite: 5 tentativas por IP a cada 15 minutos.

---

### `GET /api/totvs/rest/{DataServer}`
Consulta um DataServer TOTVS.

**Parâmetros obrigatórios na query string:**
- `codColigada` (número inteiro positivo)
- `codFilial` (número inteiro positivo)

**Exemplo:**
```
GET /api/totvs/rest/EduAlunoData?codColigada=2&codFilial=3&RA=2024001
```

**Resposta (200):**
```json
{
  "messages": [{ "code": "0000", "type": "info", "detail": "OK" }],
  "length": 1,
  "data": [{ "RA": "2024001", "NOME": "Maria Silva", ... }]
}
```

**Resposta vazia:**
```json
{ "messages": [{ "code": "0003", "type": "info", "detail": "Nenhum registro..." }], "length": 0, "data": null }
```

---

### `POST /api/totvs/rest/{DataServer}`
Cria/atualiza um registro no TOTVS.

**Parâmetros na query string:** `codColigada`, `codFilial` (mesmos do GET)

**Body:** JSON com os campos do DataServer.

**Exemplo (rematrícula):**
```
POST /api/totvs/rest/EduMatriculaData?codColigada=2&codFilial=3
Body: { "RA": "2024001", "CODPERIODO": "2025/1", ... }
```

---

### `POST /api/auth/session`
Seta cookies de sessão após login bem-sucedido.

**Body:**
```json
{ "token": "eyJ...", "expiresIn": 300, "user": { ...AuthUser } }
```

**Cookies setados (non-httpOnly):**
- `portal_token` — token JWT
- `portal_user` — JSON do usuário

**Resposta:** `{ "ok": true }`

---

### `DELETE /api/auth/session`
Limpa cookies de sessão (logout).

**Resposta:** `{ "ok": true }`

---

## DataServers disponíveis (mock)

| DataServer | Métodos | Descrição |
|------------|---------|-----------|
| `EduAlunoData` | GET | Dados cadastrais do aluno |
| `EduMatriculaData` | GET, POST | Matrículas do aluno |
| `EduContratoData` | GET | Contratos financeiros |
| `EduTurmaDiscData` | GET | Turmas e disciplinas |
| `EduColigadasData` | GET | Lista de escolas |

---

## Contratos de Interface (DIs)

### DI-01 — Formato de resposta do auth
```typescript
// Sucesso
{ token: string; expiresIn: number; user: AuthUser }

// Falha
{ error: string }  // status 401

// Rate limit
{ error: string; retryAfter: number }  // status 429
```

### DI-02 — AuthUser
```typescript
interface AuthUser {
  id: string
  email: string
  codColigada: number
  codFilial: number
  alunosRA: readonly string[]
}
```

### DI-03 — TotvsResponse<T>
```typescript
interface TotvsResponse<T> {
  messages: Array<{ code: string; type: string; detail: string }>
  length: number
  data: T[] | null
}
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Exemplo | Descrição |
|----------|-------------|---------|-----------|
| `TOTVS_MODE` | Sim | `mock` | `mock` ou `real` |
| `TOTVS_USER` | Só em real | `usuario@totvs` | Usuário TOTVS RM |
| `TOTVS_PASS` | Só em real | `senha` | Senha TOTVS RM |
| `NEXT_PUBLIC_SUPABASE_URL` | Não (opcional) | `https://xxx.supabase.co` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Não (opcional) | `eyJ...` | Chave pública Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Não (opcional) | `eyJ...` | Chave service role (audit logging) |
| `NODE_ENV` | Automática | `production` | Gerenciada pelo Next.js |

---

## Como trocar de Mock para Real

1. No `.env.local`, altere:
   ```
   TOTVS_MODE=real
   TOTVS_USER=seu-usuario@raizeducacao.com.br
   TOTVS_PASS=sua-senha
   ```

2. No Vercel, adicione as mesmas variáveis em **Settings → Environment Variables**.

3. O proxy redirecionará automaticamente para:
   `https://raizeducacao160286.rm.cloudtotvs.com.br:8051`

4. O token TOTVS é renovado automaticamente (cache em memória com buffer de 30s antes do expiry).

---

## Segurança

- **Rate limiting:** 5 tentativas de login por IP a cada 15 minutos
- **Validação Zod:** inputs validados em todas as rotas antes de processar
- **Retry com backoff:** cliente faz até 3 tentativas (1s, 2s, 4s) em erros 5xx
- **Sessão:** cookies `portal_token`/`portal_user` com `Secure: true` em produção e `SameSite: Lax`
- **Audit logging:** todas as chamadas logadas em `logs_rm_api`; auth em `logs_auth`; eventos de rematrícula em `rematricula_logs` (requer `SUPABASE_SERVICE_ROLE_KEY`)

---

## Proxy interno (`proxy.ts`)

Protege as rotas do portal contra acesso não autenticado:

| Rota protegida | Comportamento sem token |
|----------------|------------------------|
| `/selecao/*` | Redirect → `/login` |
| `/rematricula/*` | Redirect → `/login` |
| `/contrato/*` | Redirect → `/login` |
| `/assinatura/*` | Redirect → `/login` |
| `/conclusao/*` | Redirect → `/login` |
| `/disciplinas/*` | Redirect → `/login` |
