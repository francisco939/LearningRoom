import { Hono } from 'hono'
import type { AppEnv } from '../env'
import type { UserRow } from '../types'
import { toPublicUser } from '../types'
import { requireAuth } from '../auth/middleware'
import { clearSessionCookie } from '../auth/sessions'
import { createEmailToken, VERIFY_TOKEN_TTL_MS } from '../auth/tokens'
import { sendVerificationEmail } from '../email'
import { ApiError, isUniqueConstraintError } from '../errors'
import { parseStoredJson, readJson } from '../http'
import { deleteAccountSchema, updateMeSchema } from '../validation'
import { verifyPassword } from '../auth/password'

const me = new Hono<AppEnv>()

me.use('*', requireAuth)

me.get('/', (c) => {
  return c.json({ user: toPublicUser(c.get('user')) })
})

me.patch('/', async (c) => {
  const user = c.get('user')
  const input = await readJson(c, updateMeSchema)

  const nextDisplayName = input.displayName ?? user.display_name
  const nextEmail = input.email ?? user.email
  const emailChanged = nextEmail !== user.email
  const now = Date.now()

  if (emailChanged) {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id <> ?')
      .bind(nextEmail, user.id)
      .first<{ id: string }>()
    if (existing) {
      throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists')
    }
  }

  try {
    if (emailChanged) {
      await c.env.DB.prepare(
        `UPDATE users
            SET display_name = ?, email = ?, email_verified_at = NULL, updated_at = ?
          WHERE id = ?`,
      )
        .bind(nextDisplayName, nextEmail, now, user.id)
        .run()
    } else {
      await c.env.DB.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?')
        .bind(nextDisplayName, now, user.id)
        .run()
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists')
    }
    throw error
  }

  const updated = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.id)
    .first<UserRow>()
  if (!updated) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Account no longer exists')
  }

  let verificationSent = false
  if (emailChanged) {
    const token = await createEmailToken(c.env.DB, user.id, 'verify', VERIFY_TOKEN_TTL_MS)
    verificationSent = await sendVerificationEmail(
      c.env,
      updated.email,
      updated.display_name,
      token,
    )
  }

  return c.json({ user: toPublicUser(updated), verificationSent })
})

me.delete('/', async (c) => {
  const user = c.get('user')
  const input = await readJson(c, deleteAccountSchema)
  const valid = await verifyPassword(input.password, user.password_hash, c.env.PASSWORD_PEPPER)
  if (!valid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Password is incorrect')
  }
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()
  clearSessionCookie(c)
  return c.json({ ok: true })
})

me.get('/export', async (c) => {
  const user = c.get('user')

  const settingsRow = await c.env.DB.prepare('SELECT data FROM user_settings WHERE user_id = ?')
    .bind(user.id)
    .first<{ data: string }>()
  const progressRow = await c.env.DB.prepare('SELECT data FROM user_progress WHERE user_id = ?')
    .bind(user.id)
    .first<{ data: string }>()
  const sessionRows = await c.env.DB.prepare(
    `SELECT data
       FROM study_sessions
      WHERE user_id = ?
      ORDER BY started_at DESC, updated_at DESC`,
  )
    .bind(user.id)
    .all<{ data: string }>()

  const sessions = (sessionRows.results ?? [])
    .map((row) => parseStoredJson(row.data, null))
    .filter((value): value is Record<string, unknown> => value !== null)

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    account: toPublicUser(user),
    settings: parseStoredJson(settingsRow?.data, {}),
    progress: parseStoredJson(progressRow?.data, {}),
    sessions,
  }

  c.header('Content-Disposition', 'attachment; filename="learningroom-account-export.json"')
  return c.json(exportPayload)
})

export default me
