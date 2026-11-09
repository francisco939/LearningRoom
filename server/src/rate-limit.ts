import type { Context } from 'hono'
import type { AppEnv } from './env'
import { sha256Hex } from './crypto'
import { ApiError } from './errors'

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number
  retryAfterSeconds: number
  windowStart: number
}

export async function enforceRateLimit(
  c: Context<AppEnv>,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const windowStart = Math.floor(now / windowMs) * windowMs
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000))

  const row = await c.env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(key, windowStart)
    .first<{ count: number }>()

  const count = row?.count ?? 1
  const allowed = count <= limit
  const remaining = Math.max(0, limit - count)

  c.header('X-RateLimit-Limit', String(limit))
  c.header('X-RateLimit-Remaining', String(remaining))
  c.header('X-RateLimit-Reset', String(Math.floor((windowStart + windowMs) / 1000)))

  if (count === 1 && Math.random() < 0.01) {
    // Opportunistic cleanup so rate_limits does not grow forever. A rare
    // indexed delete avoids adding a write to every new counter window.
    c.executionCtx.waitUntil(
      c.env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?')
        .bind(now - 24 * 60 * 60 * 1000)
        .run()
        .catch(() => undefined),
    )
  }

  const result = {
    allowed,
    count,
    limit,
    retryAfterSeconds,
    windowStart,
  }

  if (!allowed) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again later.', {
      'Retry-After': String(retryAfterSeconds),
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.floor((windowStart + windowMs) / 1000)),
    })
  }

  return result
}

export async function emailRateLimitKey(route: string, email: string): Promise<string> {
  const digest = await sha256Hex(email)
  return `${route}:email:${digest.slice(0, 32)}`
}

export function ipRateLimitKey(route: string, ip: string): string {
  return `${route}:ip:${ip}`
}
