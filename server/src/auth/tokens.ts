import { randomToken, sha256Hex } from '../crypto'

export type EmailTokenPurpose = 'verify' | 'reset'

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export async function createEmailToken(
  db: D1Database,
  userId: string,
  purpose: EmailTokenPurpose,
  ttlMs: number,
): Promise<string> {
  const rawToken = randomToken(32)
  const tokenHash = await sha256Hex(rawToken)
  const now = Date.now()

  await db.batch([
    db
      .prepare(
        `UPDATE email_tokens
           SET used_at = ?
         WHERE user_id = ? AND purpose = ? AND used_at IS NULL`,
      )
      .bind(now, userId, purpose),
    db
      .prepare(
        `INSERT INTO email_tokens
           (id, user_id, token_hash, purpose, created_at, expires_at, used_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      )
      .bind(crypto.randomUUID(), userId, tokenHash, purpose, now, now + ttlMs),
  ])

  return rawToken
}

export async function consumeEmailToken(
  db: D1Database,
  rawToken: string,
  purpose: EmailTokenPurpose,
): Promise<string | null> {
  const tokenHash = await sha256Hex(rawToken)
  const now = Date.now()
  const row = await db
    .prepare(
      `UPDATE email_tokens
          SET used_at = ?
        WHERE token_hash = ?
          AND purpose = ?
          AND used_at IS NULL
          AND expires_at > ?
        RETURNING user_id`,
    )
    .bind(now, tokenHash, purpose, now)
    .first<{ user_id: string }>()

  return row?.user_id ?? null
}

export async function invalidateEmailTokens(
  db: D1Database,
  userId: string,
  purpose: EmailTokenPurpose,
): Promise<void> {
  await db
    .prepare(
      `UPDATE email_tokens
          SET used_at = ?
        WHERE user_id = ? AND purpose = ? AND used_at IS NULL`,
    )
    .bind(Date.now(), userId, purpose)
    .run()
}
