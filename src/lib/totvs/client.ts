import type { TotvsResponse } from './types'

const BASE = '/api/totvs'

class TotvsHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'TotvsHttpError'
  }
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 2000, 4000]
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      // Don't retry on 4xx — caller error, not server error
      if (err instanceof TotvsHttpError && err.status >= 400 && err.status < 500) throw err
      if (attempt < 2) await new Promise<void>(r => setTimeout(r, delays[attempt]))
    }
  }
  throw lastError
}

async function request<T>(
  method: 'GET' | 'POST',
  dataserver: string,
  params?: Record<string, string | number>,
  body?: unknown,
): Promise<TotvsResponse<T>> {
  return withRetry(async () => {
    let url = `${BASE}/rest/${dataserver}`

    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
          acc[k] = String(v)
          return acc
        }, {}),
      ).toString()
      if (qs) url += `?${qs}`
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new TotvsHttpError(res.status, `TOTVS client error ${res.status}: ${await res.text()}`)
    }

    return res.json() as Promise<TotvsResponse<T>>
  })
}

export const totvs = {
  get<T>(
    dataserver: string,
    params?: Record<string, string | number>,
  ): Promise<TotvsResponse<T>> {
    return request<T>('GET', dataserver, params)
  },

  post<T>(
    dataserver: string,
    body: unknown,
    params?: Record<string, string | number>,
  ): Promise<TotvsResponse<T>> {
    return request<T>('POST', dataserver, params, body)
  },
}
