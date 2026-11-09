import type { Progress, Session, Settings } from './types'

const API_BASE = (
  (import.meta.env.VITE_API_BASE as string | undefined) || 'https://api.learningroom.dpdns.org'
).replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export interface AuthUser {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
  createdAt: string
}

export interface SyncPayload {
  settings: Settings | null
  progress: Progress | null
  sessions: Session[]
  updatedAt?: number
  syncedAt?: string
}

export interface PresenceSnapshot {
  online: number
  focusing: number
  updatedAt: number | string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    signal: init.signal ?? AbortSignal.timeout(8000),
  })

  if (response.status === 204) return undefined as T
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    const payload = data as { error?: { code?: string; message?: string } } | null
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'request_failed',
      payload?.error?.message ?? `请求失败（${response.status}）`,
    )
  }
  return data as T
}

function json(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

export const api = {
  base: API_BASE,

  register: (body: { email: string; password: string; displayName: string }) =>
    request<{ user: AuthUser }>('/api/auth/register', json(body)),
  login: (body: { email: string; password: string }) =>
    request<{ user: AuthUser }>('/api/auth/login', json(body)),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: AuthUser }>('/api/me'),
  updateMe: (body: { displayName: string }) =>
    request<{ user: AuthUser }>('/api/me', { method: 'PATCH', body: JSON.stringify(body) }),
  deleteMe: (body: { password: string }) =>
    request<void>('/api/me', { method: 'DELETE', body: JSON.stringify(body) }),
  exportMe: () => request<unknown>('/api/me/export'),

  verifyEmail: (token: string) =>
    request<{ user: AuthUser }>('/api/auth/verify-email', json({ token })),
  resendVerification: (email: string) =>
    request<void>('/api/auth/resend-verification', json({ email })),
  forgotPassword: (email: string) =>
    request<void>('/api/auth/forgot-password', json({ email })),
  resetPassword: (body: { token: string; password: string }) =>
    request<void>('/api/auth/reset-password', json(body)),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<void>('/api/auth/change-password', json(body)),

  getSync: () => request<SyncPayload>('/api/sync'),
  putSync: (body: Omit<SyncPayload, 'updatedAt'> & { updatedAt?: number }) =>
    request<{ updatedAt: number }>('/api/sync', { method: 'PUT', body: JSON.stringify(body) }),
  getPresence: () => request<PresenceSnapshot>('/api/presence'),
}

export function presenceWsUrl(clientId: string, focusing: boolean): string {
  const base = API_BASE || window.location.origin
  const ws = base.replace(/^http/, 'ws')
  return `${ws}/api/presence/ws?clientId=${encodeURIComponent(clientId)}&focusing=${focusing ? '1' : '0'}`
}
