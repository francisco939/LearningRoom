import { beforeEach, describe, expect, it } from 'vitest'
import {
  bodyOf,
  registerVerifiedUser,
  resetDatabase,
  sampleSession,
  sampleSyncPayload,
  testEnv,
  TEST_PASSWORD,
  TestClient,
} from './helpers'

beforeEach(async () => {
  await resetDatabase()
})

describe('sync and account lifecycle', () => {
  it('upserts sync data idempotently and returns recent sessions', async () => {
    const client = new TestClient()
    await registerVerifiedUser(client)

    const first = await client.put('/api/sync', sampleSyncPayload)
    expect(first.status).toBe(200)
    const firstBody = await bodyOf<{
      settings: { mode: string }
      progress: { totalSessions: number }
      sessions: Array<{ id: string; focusedSec: number }>
    }>(first)
    expect(firstBody.settings.mode).toBe('pomodoro')
    expect(firstBody.progress.totalSessions).toBe(1)
    expect(firstBody.sessions).toHaveLength(1)
    expect(firstBody.sessions[0]?.id).toBe(sampleSession.id)

    const second = await client.put('/api/sync', sampleSyncPayload)
    expect(second.status).toBe(200)

    const rowCount = await testEnv.DB.prepare(
      'SELECT COUNT(*) AS count FROM study_sessions',
    ).first<{ count: number }>()
    expect(rowCount?.count).toBe(1)

    const updatedPayload = {
      ...sampleSyncPayload,
      sessions: [{ ...sampleSession, focusedSec: 1200, fishEarned: 2 }],
    }
    const updated = await client.put('/api/sync', updatedPayload)
    expect(updated.status).toBe(200)
    const updatedBody = await bodyOf<{
      sessions: Array<{ id: string; focusedSec: number }>
    }>(updated)
    expect(updatedBody.sessions).toHaveLength(1)
    expect(updatedBody.sessions[0]?.focusedSec).toBe(1200)

    const afterUpdateCount = await testEnv.DB.prepare(
      'SELECT COUNT(*) AS count FROM study_sessions',
    ).first<{ count: number }>()
    expect(afterUpdateCount?.count).toBe(1)

    const read = await client.get('/api/sync')
    expect(read.status).toBe(200)
    const readBody = await bodyOf<{
      settings: { sound: boolean }
      progress: { totalFocusSec: number }
      sessions: Array<{ id: string }>
      syncedAt: string
    }>(read)
    expect(readBody.settings.sound).toBe(false)
    expect(readBody.progress.totalFocusSec).toBe(1500)
    expect(readBody.sessions[0]?.id).toBe(sampleSession.id)
    expect(Number.isNaN(Date.parse(readBody.syncedAt))).toBe(false)
  })

  it('validates sync payloads and caps sessions at 2000', async () => {
    const client = new TestClient()
    await registerVerifiedUser(client)

    const invalidSession = {
      ...sampleSyncPayload,
      sessions: [{ ...sampleSession, focusedSec: -1 }],
    }
    const invalid = await client.put('/api/sync', invalidSession)
    expect(invalid.status).toBe(400)
    expect((await bodyOf<{ error: { code: string } }>(invalid)).error.code).toBe('VALIDATION_ERROR')

    const tooMany = {
      ...sampleSyncPayload,
      sessions: Array.from({ length: 2001 }, (_, index) => ({
        ...sampleSession,
        id: `session-${index}`,
      })),
    }
    const capped = await client.put('/api/sync', tooMany)
    expect(capped.status).toBe(400)

    expect((await client.get('/api/sync')).status).toBe(200)
  })

  it('deletes the account and cascades all user data', async () => {
    const client = new TestClient()
    const user = await registerVerifiedUser(client)
    const sync = await client.put('/api/sync', sampleSyncPayload)
    expect(sync.status).toBe(200)

    const deleted = await client.request('/api/me', {
      method: 'DELETE',
      body: { password: TEST_PASSWORD },
    })
    expect(deleted.status).toBe(200)
    expect((await client.get('/api/me')).status).toBe(401)

    const tableColumns: Array<[string, string]> = [
      ['users', 'id'],
      ['auth_sessions', 'user_id'],
      ['email_tokens', 'user_id'],
      ['user_settings', 'user_id'],
      ['user_progress', 'user_id'],
      ['study_sessions', 'user_id'],
    ]
    for (const [table, column] of tableColumns) {
      const row = await testEnv.DB.prepare(
        `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`,
      )
        .bind(user.id)
        .first<{ count: number }>()
      expect(row?.count, `${table} should be empty`).toBe(0)
    }
  })

  it('exports account data without credential material', async () => {
    const client = new TestClient()
    const user = await registerVerifiedUser(client)
    await client.put('/api/sync', sampleSyncPayload)

    const exported = await client.get('/api/me/export')
    expect(exported.status).toBe(200)
    expect(exported.headers.get('content-disposition')).toContain(
      'learningroom-account-export.json',
    )

    const body = await bodyOf<{
      version: number
      account: { id: string; email: string }
      settings: { mode: string }
      progress: { totalSessions: number }
      sessions: Array<{ id: string }>
    }>(exported)
    expect(body.version).toBe(1)
    expect(body.account.id).toBe(user.id)
    expect(body.settings.mode).toBe('pomodoro')
    expect(body.progress.totalSessions).toBe(1)
    expect(body.sessions[0]?.id).toBe(sampleSession.id)
    expect(JSON.stringify(body)).not.toContain('password')
    expect(JSON.stringify(body)).not.toContain('token_hash')
  })

  it('updates display name and email verification state on email change', async () => {
    const client = new TestClient()
    await registerVerifiedUser(client)

    const renamed = await client.patch('/api/me', { displayName: 'Focused Reader' })
    expect(renamed.status).toBe(200)
    expect(
      (await bodyOf<{ user: { displayName: string; emailVerified: boolean } }>(renamed)).user,
    ).toMatchObject({ displayName: 'Focused Reader', emailVerified: true })

    const changed = await client.patch('/api/me', {
      email: `Changed-${crypto.randomUUID()}@Example.com`,
    })
    expect(changed.status).toBe(200)
    const changedBody = await bodyOf<{
      user: { email: string; emailVerified: boolean }
      verificationSent: boolean
    }>(changed)
    expect(changedBody.user.email).toMatch(/^changed-/u)
    expect(changedBody.user.emailVerified).toBe(false)
    expect(changedBody.verificationSent).toBe(false)
  })
})
