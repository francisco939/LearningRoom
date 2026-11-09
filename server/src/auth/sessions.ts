import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { AppEnv } from '../env'
import { randomToken, sha256Hex } from '../crypto'

export const SESSION_COOKIE = '__Host-lr_session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000)

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function shouldUseSecureCookie(requestUrl: string, environment: string): boolean {
  try {
    const hostname = new URL(requestUrl).hostname
    if (isLocalHostname(hostname)) return false
  } catch {
    // Fall through to the environment check.
  }
  return environment === 'production'
}

function cookieOptions(c: Context<AppEnv>) {
  return {
    path: '/',
    httpOnly: true,
    secure: shouldUseSecureCookie(c.req.url, c.env.ENVIRONMENT),
    sameSite: 'Lax' as const,
    maxAge: SESSION_TTL_SECONDS,
  }
}

export async function createSession(
  db: D1Database,
  userId: string,
): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken(32)
  const tokenHash = await sha256Hex(token)
  const now = Date.now()
  const expiresAt = now + SESSION_TTL_MS

  await db
    .prepare(
      `INSERT INTO auth_sessions
         (id, user_id, token_hash, created_at, expires_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), userId, tokenHash, now, expiresAt, now)
    .run()

  return { token, expiresAt }
}

export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE, token, cookieOptions(c))
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  const options = cookieOptions(c)
  setCookie(c, SESSION_COOKIE, '', { ...options, maxAge: 0 })
}

export async function revokeSessionToken(db: D1Database, token: string): Promise<void> {
  const tokenHash = await sha256Hex(token)
  await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run()
}

export async function revokeAllSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(userId).run()
}

export function readSessionToken(c: Context<AppEnv>): string | null {
  return getCookie(c, SESSION_COOKIE) ?? null
}
