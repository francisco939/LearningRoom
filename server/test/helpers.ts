import { env, SELF } from 'cloudflare:test'
import type { D1Migration } from 'cloudflare:test'
import type { Env } from '../src/env'
import type { PublicUser } from '../src/types'
import { createEmailToken, VERIFY_TOKEN_TTL_MS } from '../src/auth/tokens'

export const testEnv = env as unknown as Env & { TEST_MIGRATIONS: D1Migration[] }
export const TEST_ORIGIN = 'http://localhost:5173'
export const TEST_IP = '203.0.113.10'
export const TEST_PASSWORD = 'correct horse battery staple'

interface RequestOptions {
  method?: string
  body?: unknown
  origin?: string | null
  ip?: string
  headers?: Record<string, string>
}

export class TestClient {
  cookie: string | null = null

  async request(path: string, options: RequestOptions = {}): Promise<Response> {
    const method = options.method ?? 'GET'
    const headers = new Headers(options.headers)
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

    if (options.body !== undefined && !headers.has('content-type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (mutating && options.origin !== null) {
      headers.set('Origin', options.origin ?? TEST_ORIGIN)
    }
    headers.set('CF-Connecting-IP', options.ip ?? TEST_IP)
    if (this.cookie) headers.set('Cookie', this.cookie)

    const response = await SELF.fetch(`https://api.test${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      const pair = setCookie.split(';', 1)[0] ?? ''
      const separator = pair.indexOf('=')
      const name = pair.slice(0, separator)
      const value = pair.slice(separator + 1)
      this.cookie = value ? `${name}=${value}` : null
    }

    return response
  }

  get(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request(path, { ...options, method: 'GET' })
  }

  post(path: string, body: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request(path, { ...options, method: 'POST', body })
  }

  put(path: string, body: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request(path, { ...options, method: 'PUT', body })
  }

  patch(path: string, body: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request(path, { ...options, method: 'PATCH', body })
  }

  delete(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request(path, { ...options, method: 'DELETE' })
  }
}

export async function bodyOf<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export function uniqueEmail(label: string): string {
  return `${label}-${crypto.randomUUID()}@example.com`
}

export async function resetDatabase(): Promise<void> {
  await testEnv.DB.exec('DELETE FROM rate_limits; DELETE FROM users;')
}

export async function registerVerifiedUser(
  client: TestClient,
  email = uniqueEmail('student'),
): Promise<PublicUser> {
  const register = await client.post('/api/auth/register', {
    email,
    password: TEST_PASSWORD,
    displayName: 'Quiet Student',
  })
  if (register.status !== 201) {
    throw new Error(`register failed: ${register.status} ${await register.text()}`)
  }
  const registerBody = await bodyOf<{ user: PublicUser }>(register)

  const token = await createEmailToken(
    testEnv.DB,
    registerBody.user.id,
    'verify',
    VERIFY_TOKEN_TTL_MS,
  )
  const verify = await client.post('/api/auth/verify-email', { token })
  if (verify.status !== 200) {
    throw new Error(`verify failed: ${verify.status} ${await verify.text()}`)
  }

  return (await bodyOf<{ user: PublicUser }>(verify)).user
}

export const sampleSession = {
  id: 'client-session-1',
  startedAt: 1_700_000_000_000,
  endedAt: 1_700_001_500_000,
  mode: 'pomodoro',
  scene: 'rainy-study',
  supervision: 'standard',
  plannedSec: 1500,
  focusedSec: 1500,
  starsLeft: 3,
  violations: [],
  status: 'completed',
  fishEarned: 3,
}

export const sampleSyncPayload = {
  settings: { version: 1, mode: 'pomodoro', sound: false },
  progress: { version: 1, totalFocusSec: 1500, totalSessions: 1 },
  sessions: [sampleSession],
}
