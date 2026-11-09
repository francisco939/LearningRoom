import { Hono } from 'hono'
import type { AppEnv } from '../env'
import type { UserRow } from '../types'
import { toPublicUser } from '../types'
import { ApiError, isUniqueConstraintError } from '../errors'
import { sendPasswordResetEmail, sendVerificationEmail } from '../email'
import { getClientIp, readJson } from '../http'
import { emailRateLimitKey, enforceRateLimit, ipRateLimitKey } from '../rate-limit'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validation'
import { requireAuth } from './middleware'
import { hashPassword, TIMING_DUMMY_HASH, verifyPassword } from './password'
import {
  clearSessionCookie,
  createSession,
  readSessionToken,
  revokeAllSessions,
  revokeSessionToken,
  setSessionCookie,
} from './sessions'
import {
  consumeEmailToken,
  createEmailToken,
  invalidateEmailTokens,
  RESET_TOKEN_TTL_MS,
  VERIFY_TOKEN_TTL_MS,
} from './tokens'

const auth = new Hono<AppEnv>()

function invalidCredentials(): ApiError {
  return new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
}

auth.post('/register', async (c) => {
  const input = await readJson(c, registerSchema)
  await enforceRateLimit(c, ipRateLimitKey('auth:register', getClientIp(c)), 5, 15 * 60)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(input.email)
    .first<{ id: string }>()
  if (existing) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists')
  }

  const passwordHash = await hashPassword(input.password, c.env.PASSWORD_PEPPER)
  const now = Date.now()
  const id = crypto.randomUUID()
  const user: UserRow = {
    id,
    email: input.email,
    display_name: input.displayName,
    password_hash: passwordHash,
    email_verified_at: null,
    created_at: now,
    updated_at: now,
  }

  try {
    await c.env.DB.prepare(
      `INSERT INTO users
         (id, email, display_name, password_hash, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    )
      .bind(id, user.email, user.display_name, passwordHash, now, now)
      .run()
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists')
    }
    throw error
  }

  const token = await createEmailToken(c.env.DB, id, 'verify', VERIFY_TOKEN_TTL_MS)
  const verificationSent = await sendVerificationEmail(c.env, user.email, user.display_name, token)

  return c.json({ user: toPublicUser(user), verificationSent }, 201)
})

auth.post('/login', async (c) => {
  const input = await readJson(c, loginSchema)
  const ip = getClientIp(c)
  await enforceRateLimit(c, ipRateLimitKey('auth:login', ip), 10, 15 * 60)
  await enforceRateLimit(c, await emailRateLimitKey('auth:login', input.email), 5, 15 * 60)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(input.email)
    .first<UserRow>()

  if (!user) {
    // Perform the same expensive derivation as a real password check. The
    // response is identical for unknown accounts and wrong passwords.
    await verifyPassword(input.password, TIMING_DUMMY_HASH, c.env.PASSWORD_PEPPER)
    throw invalidCredentials()
  }

  const validPassword = await verifyPassword(
    input.password,
    user.password_hash,
    c.env.PASSWORD_PEPPER,
  )
  if (!validPassword) throw invalidCredentials()

  if (user.email_verified_at === null) {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in.')
  }

  const session = await createSession(c.env.DB, user.id)
  setSessionCookie(c, session.token)

  return c.json({ user: toPublicUser(user) })
})

auth.post('/logout', async (c) => {
  const token = readSessionToken(c)
  if (token) await revokeSessionToken(c.env.DB, token)
  clearSessionCookie(c)
  return c.json({ ok: true })
})

auth.post('/verify-email', async (c) => {
  const input = await readJson(c, verifyEmailSchema)
  const now = Date.now()
  const userId = await consumeEmailToken(c.env.DB, input.token, 'verify')
  if (!userId) {
    throw new ApiError(
      400,
      'INVALID_OR_EXPIRED_TOKEN',
      'This verification link is invalid or has expired.',
    )
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE users
          SET email_verified_at = COALESCE(email_verified_at, ?),
              updated_at = ?
        WHERE id = ?`,
    ).bind(now, now, userId),
    c.env.DB.prepare(
      `UPDATE email_tokens
          SET used_at = ?
        WHERE user_id = ? AND purpose = 'verify' AND used_at IS NULL`,
    ).bind(now, userId),
  ])

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<UserRow>()
  if (!user) {
    throw new ApiError(400, 'INVALID_OR_EXPIRED_TOKEN', 'This verification link is invalid.')
  }

  const session = await createSession(c.env.DB, user.id)
  setSessionCookie(c, session.token)

  return c.json({ user: toPublicUser(user) })
})

auth.post('/resend-verification', async (c) => {
  const input = await readJson(c, resendVerificationSchema)
  await enforceRateLimit(c, ipRateLimitKey('auth:resend', getClientIp(c)), 5, 15 * 60)
  await enforceRateLimit(c, await emailRateLimitKey('auth:resend', input.email), 3, 15 * 60)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(input.email)
    .first<UserRow>()

  if (user && user.email_verified_at === null) {
    const token = await createEmailToken(c.env.DB, user.id, 'verify', VERIFY_TOKEN_TTL_MS)
    await sendVerificationEmail(c.env, user.email, user.display_name, token)
  }

  return c.json({ ok: true }, 202)
})

auth.post('/forgot-password', async (c) => {
  const input = await readJson(c, forgotPasswordSchema)
  await enforceRateLimit(c, ipRateLimitKey('auth:forgot', getClientIp(c)), 5, 15 * 60)
  await enforceRateLimit(c, await emailRateLimitKey('auth:forgot', input.email), 3, 15 * 60)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(input.email)
    .first<UserRow>()

  if (user) {
    const token = await createEmailToken(c.env.DB, user.id, 'reset', RESET_TOKEN_TTL_MS)
    await sendPasswordResetEmail(c.env, user.email, token)
  }

  return c.json({ ok: true }, 202)
})

auth.post('/reset-password', async (c) => {
  const input = await readJson(c, resetPasswordSchema)
  await enforceRateLimit(c, ipRateLimitKey('auth:reset', getClientIp(c)), 10, 15 * 60)

  const userId = await consumeEmailToken(c.env.DB, input.token, 'reset')
  if (!userId) {
    throw new ApiError(
      400,
      'INVALID_OR_EXPIRED_TOKEN',
      'This reset link is invalid or has expired.',
    )
  }

  const passwordHash = await hashPassword(input.password, c.env.PASSWORD_PEPPER)
  const now = Date.now()
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(
      passwordHash,
      now,
      userId,
    ),
    c.env.DB.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(userId),
    c.env.DB.prepare(
      `UPDATE email_tokens
          SET used_at = ?
        WHERE user_id = ? AND purpose = 'reset' AND used_at IS NULL`,
    ).bind(now, userId),
  ])

  clearSessionCookie(c)
  return c.json({ ok: true })
})

auth.post('/change-password', requireAuth, async (c) => {
  const user = c.get('user')
  const input = await readJson(c, changePasswordSchema)
  await enforceRateLimit(c, `auth:change-password:user:${user.id}`, 10, 15 * 60)

  const validPassword = await verifyPassword(
    input.currentPassword,
    user.password_hash,
    c.env.PASSWORD_PEPPER,
  )
  if (!validPassword) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect.')
  }

  const passwordHash = await hashPassword(input.newPassword, c.env.PASSWORD_PEPPER)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, Date.now(), user.id)
    .run()

  await invalidateEmailTokens(c.env.DB, user.id, 'reset')
  await revokeAllSessions(c.env.DB, user.id)
  const session = await createSession(c.env.DB, user.id)
  setSessionCookie(c, session.token)

  return c.json({ ok: true })
})

export default auth
