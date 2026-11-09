import { describe, expect, it } from 'vitest'
import { bodyOf, TEST_ORIGIN, testEnv, TestClient } from './helpers'

describe('health, presence, and community placeholders', () => {
  it('serves health with security headers', async () => {
    const client = new TestClient()
    const response = await client.get('/api/health')
    expect(response.status).toBe(200)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await bodyOf<{
      ok: boolean
      service: string
      environment: string
    }>(response)
    expect(body).toMatchObject({
      ok: true,
      service: 'learningroom-api',
      environment: 'test',
    })
  })

  it('returns a zeroed presence snapshot before anyone connects', async () => {
    const client = new TestClient()
    const response = await client.get('/api/presence')
    expect(response.status).toBe(200)
    const body = await bodyOf<{
      online: number
      focusing: number
      updatedAt: string
    }>(response)
    expect(body.online).toBe(0)
    expect(body.focusing).toBe(0)
    expect(Number.isNaN(Date.parse(body.updatedAt))).toBe(false)
  })

  it('returns 501 for community endpoints and has no message tables', async () => {
    const client = new TestClient()
    const response = await client.get('/api/community/messages')
    expect(response.status).toBe(501)
    expect((await bodyOf<{ error: { code: string } }>(response)).error.code).toBe(
      'COMMUNITY_NOT_IMPLEMENTED',
    )

    const tables = await client.get('/api/community')
    expect(tables.status).toBe(501)

    const messageTables = await testEnv.DB.prepare(
      `SELECT name FROM sqlite_master
        WHERE type = 'table' AND name LIKE '%message%'`,
    ).all()
    expect(messageTables.results).toHaveLength(0)
  })

  it('returns the documented JSON shape for unknown routes', async () => {
    const client = new TestClient()
    const response = await client.get('/api/nope', { origin: TEST_ORIGIN })
    expect(response.status).toBe(404)
    expect(await bodyOf(response)).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    })
  })
})
