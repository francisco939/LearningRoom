import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../env'

const community = new Hono<AppEnv>()

// TODO(v1): Community chat is intentionally not implemented. There are no
// message, report, participant, or community-presence tables in 0001_init.sql
// and no message/report endpoints in this Worker. If chat is added later, add a
// separate migration and authenticate every request; do not reuse the
// anonymous presence room for chat identity.
function notImplemented(c: Context<AppEnv>) {
  return c.json(
    {
      error: {
        code: 'COMMUNITY_NOT_IMPLEMENTED',
        message: 'Community chat is not available in v1.',
      },
    },
    501,
  )
}

community.all('/', notImplemented)
community.all('/*', notImplemented)

export default community
