/**
 * client.ts - the single place that talks to the backend.
 *
 * Responsibilities:
 *  - attach the bearer token
 *  - unwrap FastAPI's { detail: ... } error shape into a real Error
 *  - normalise network failures into something the UI can show a human
 */

const TOKEN_KEY = 'mamlaka.token'
const USER_KEY = 'mamlaka.user'

export class ApiError extends Error {
  status: number
  detail: unknown
  retryAfter?: number

  constructor(message: string, status: number, detail?: unknown, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.retryAfter = retryAfter
  }
}

// In production the UI is served from the same origin as the API, so a relative
// base URL works. Set VITE_API_URL when the API lives on another host.
export const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setStoredUser(user: unknown): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

export function clearSession(): void {
  setToken(null)
  setStoredUser(null)
}

/** FastAPI returns {"detail": "..."} or {"detail": {"message": "..."}}. */
function extractMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const first = detail[0] as { loc?: unknown[]; msg?: string } | undefined
    if (first?.msg) {
      const location = first.loc?.filter((part) => part !== 'body').join('.')
      return location ? `${location}: ${first.msg}` : first.msg
    }
  }
  if (detail && typeof detail === 'object') {
    const d = detail as Record<string, unknown>
    if (typeof d.message === 'string') return d.message
    if (typeof d.msg === 'string') return d.msg
  }
  return fallback
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  auth?: boolean
  signal?: AbortSignal
  raw?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true, signal, raw } = options

  const finalHeaders: Record<string, string> = { ...headers }
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json'
  }
  if (auth) {
    const token = getToken()
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(
      'Cannot reach the server. Check your connection and try again.',
      0,
      err,
    )
  }

  if (raw) {
    if (!response.ok) {
      const text = await response.text()
      throw new ApiError(text || response.statusText, response.status, text)
    }
    return (await response.text()) as unknown as T
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const detail = (payload as { detail?: unknown })?.detail ?? payload
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined
    throw new ApiError(
      extractMessage(detail, `Request failed (${response.status})`),
      response.status,
      detail,
      retryAfter,
    )
  }

  return payload as T
}

/** Generate an idempotency key. Every mutating call needs one. */
export function idempotencyKey(prefix = 'ui'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}-${rand}`
}
