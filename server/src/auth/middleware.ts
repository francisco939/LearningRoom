import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../env'
import type { UserRow } from '../types'
import { sha256Hex } from '../crypto'
import { ApiError } from '../errors'
import { readSessionToken } from './sessions'

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = readSessionToken(c)
  if (!token) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in is required')
  }

  const tokenHash = await sha256Hex(token)
  const now = Date.now()
  const row = await c.env.DB.prepare(
    `SELECT
       s.id AS session_id,
       s.expires_at AS session_expires_at,
       u.id,
       u.email,
       u.display_name,
       u.password_hash,
       u.email_verified_at,
       u.created_at,
       u.updated_at
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
     LIMIT 1`,
  )
    .bind(tokenHash)
    .first<UserRow & { session_id: string; session_expires_at: number }>()

  if (!row) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Session is invalid or expired')
  }

  if (row.session_expires_at <= now) {
    await c.env.DB.prepare('DELETE FROM auth_sessions WHERE id = ?').bind(row.session_id).run()
    throw new ApiError(401, 'UNAUTHENTICATED', 'Session is invalid or expired')
  }

  c.set('user', {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    password_hash: row.password_hash,
    email_verified_at: row.email_verified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })
  c.set('sessionId', row.session_id)

  await next()
}
