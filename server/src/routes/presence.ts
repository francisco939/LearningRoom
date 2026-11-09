import { Hono } from 'hono'
import type { AppEnv } from '../env'

const presence = new Hono<AppEnv>()

function presenceStub(env: AppEnv['Bindings']) {
  return env.PRESENCE.get(env.PRESENCE.idFromName('global'))
}

presence.get('/', async (c) => {
  const stub = presenceStub(c.env)
  const response = await stub.fetch('https://presence.internal/snapshot')
  if (!response.ok) {
    return c.json(
      { error: { code: 'PRESENCE_UNAVAILABLE', message: 'Presence is unavailable' } },
      502,
    )
  }
  const snapshot = (await response.json()) as {
    online: number
    focusing: number
    updatedAt: string
  }
  return c.json(snapshot)
})

presence.get('/ws', async (c) => {
  const stub = presenceStub(c.env)
  return stub.fetch(c.req.raw)
})

export default presence
