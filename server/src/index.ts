import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppEnv } from './env'
import { errorBody } from './errors'
import { ApiError } from './errors'
import auth from './auth/routes'
import me from './routes/me'
import sync from './routes/sync'
import presence from './routes/presence'
import community from './routes/community'
import { PresenceRoom } from './presence-room'

const app = new Hono<AppEnv>()

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function normalizedOrigin(value: string | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function isAllowedOrigin(origin: string, env: AppEnv['Bindings']): boolean {
  const normalized = normalizedOrigin(origin)
  if (!normalized) return false

  const configured = normalizedOrigin(env.APP_ORIGIN)
  if (configured && normalized === configured) return true
  if (normalized === 'https://www.learningroom.dpdns.org') return true

  if (env.ENVIRONMENT !== 'production') {
    try {
      const url = new URL(normalized)
      const localHost =
        url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
      if (localHost && (url.protocol === 'http:' || url.protocol === 'https:')) {
        return true
      }
    } catch {
      return false
    }
  }

  return false
}

app.use(
  '*',
  cors({
    origin: (origin, c) => (isAllowedOrigin(origin, c.env) ? origin : null),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Accept'],
    exposeHeaders: [
      'Retry-After',
      'Content-Disposition',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: 86_400,
  }),
)

app.use('*', async (c, next) => {
  await next()

  // The security headers middleware must not alter a 101 upgrade response.
  if (c.res.status === 101) return

  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'no-referrer')
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  )
  c.header('Cache-Control', 'no-store')

  if (c.env.ENVIRONMENT === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})

app.use('/api/*', async (c, next) => {
  if (!MUTATING_METHODS.has(c.req.method)) {
    await next()
    return
  }

  const origin = c.req.header('origin')
  if (!origin) {
    throw new ApiError(
      403,
      'ORIGIN_REQUIRED',
      'An Origin header is required for state-changing requests.',
    )
  }
  if (!isAllowedOrigin(origin, c.env)) {
    throw new ApiError(403, 'INVALID_ORIGIN', 'Origin is not allowed.')
  }

  await next()
})

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: 'learningroom-api',
    environment: c.env.ENVIRONMENT,
    time: new Date().toISOString(),
  })
})

app.route('/api/auth', auth)
app.route('/api/me', me)
app.route('/api/sync', sync)
app.route('/api/presence', presence)
app.route('/api/community', community)

app.notFound((c) => {
  return c.json(errorBody('NOT_FOUND', 'Route not found'), 404)
})

app.onError((error, c) => {
  if (error instanceof ApiError) {
    for (const [name, value] of Object.entries(error.headers)) {
      c.header(name, value)
    }
    return c.json(errorBody(error.code, error.message), error.status as ContentfulStatusCode)
  }

  console.error('Unhandled LearningRoom API error', {
    name: error instanceof Error ? error.name : 'UnknownError',
  })
  return c.json(errorBody('INTERNAL_ERROR', 'An unexpected error occurred.'), 500)
})

export { PresenceRoom }
export default app
