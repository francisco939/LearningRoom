import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { requireAuth } from '../auth/middleware'
import { enforceRateLimit } from '../rate-limit'
import { ApiError } from '../errors'
import { parseStoredJson, readJson } from '../http'
import { syncSchema } from '../validation'

const sync = new Hono<AppEnv>()

sync.use('*', requireAuth)
sync.use('*', async (c, next) => {
  await enforceRateLimit(c, `sync:user:${c.get('user').id}`, 120, 60)
  await next()
})

const UPSERT_SETTINGS = `INSERT INTO user_settings (user_id, data, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT (user_id) DO UPDATE SET
    data = excluded.data,
    updated_at = excluded.updated_at`

const UPSERT_PROGRESS = `INSERT INTO user_progress (user_id, data, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT (user_id) DO UPDATE SET
    data = excluded.data,
    updated_at = excluded.updated_at`

const UPSERT_SESSION = `INSERT INTO study_sessions
    (id, user_id, client_id, started_at, ended_at, duration_seconds, mode, data, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (user_id, client_id) DO UPDATE SET
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    duration_seconds = excluded.duration_seconds,
    mode = excluded.mode,
    data = excluded.data,
    updated_at = excluded.updated_at`

async function readSyncState(env: AppEnv['Bindings'], userId: string) {
  const settingsRow = await env.DB.prepare('SELECT data FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first<{ data: string }>()
  const progressRow = await env.DB.prepare('SELECT data FROM user_progress WHERE user_id = ?')
    .bind(userId)
    .first<{ data: string }>()
  const sessionRows = await env.DB.prepare(
    `SELECT data
       FROM study_sessions
      WHERE user_id = ?
      ORDER BY started_at DESC, updated_at DESC
      LIMIT 1000`,
  )
    .bind(userId)
    .all<{ data: string }>()

  return {
    settings: parseStoredJson(settingsRow?.data, {}),
    progress: parseStoredJson(progressRow?.data, {}),
    sessions: (sessionRows.results ?? [])
      .map((row) => parseStoredJson(row.data, null))
      .filter((value): value is Record<string, unknown> => value !== null),
  }
}

sync.get('/', async (c) => {
  const state = await readSyncState(c.env, c.get('user').id)
  return c.json({ ...state, syncedAt: new Date().toISOString() })
})

sync.put('/', async (c) => {
  const input = await readJson(c, syncSchema)
  const userId = c.get('user').id
  const now = Date.now()

  const settingsJson = JSON.stringify(input.settings)
  const progressJson = JSON.stringify(input.progress)
  if (settingsJson.length > 512_000 || progressJson.length > 512_000) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Settings or progress JSON is too large')
  }

  await c.env.DB.batch([
    c.env.DB.prepare(UPSERT_SETTINGS).bind(userId, settingsJson, now),
    c.env.DB.prepare(UPSERT_PROGRESS).bind(userId, progressJson, now),
  ])

  // D1 caps bound parameters per statement, so session rows are upserted in
  // bounded batches. The unique (user_id, client_id) key makes retries safe.
  const statements: D1PreparedStatement[] = input.sessions.map((session) =>
    c.env.DB.prepare(UPSERT_SESSION).bind(
      crypto.randomUUID(),
      userId,
      session.id,
      session.startedAt,
      session.endedAt,
      session.focusedSec,
      session.mode,
      JSON.stringify(session),
      now,
      now,
    ),
  )

  for (let index = 0; index < statements.length; index += 50) {
    await c.env.DB.batch(statements.slice(index, index + 50))
  }

  const state = await readSyncState(c.env, userId)
  return c.json({ ...state, syncedAt: new Date().toISOString() })
})

export default sync
