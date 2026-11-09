import { beforeEach, describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'
import { shouldUseSecureCookie } from '../src/auth/sessions'
import { createEmailToken, RESET_TOKEN_TTL_MS } from '../src/auth/tokens'
import {
  bodyOf,
  registerVerifiedUser,
  resetDatabase,
  TEST_IP,
  TEST_ORIGIN,
  TEST_PASSWORD,
  testEnv,
  uniqueEmail,
  TestClient,
} from './helpers'

beforeEach(async () => {
  await resetDatabase()
})

describe('authentication', () => {
  it('registers, verifies, logs in, and returns /api/me', async () => {
    const client = new TestClient()
    const email = uniqueEmail('Auth')

    const register = await client.post('/api/auth/register', {
      email: email.toUpperCase(),
      password: TEST_PASSWORD,
      displayName: '  Quiet Student  ',
    })
    expect(register.status).toBe(201)
    const registerBody = await bodyOf<{
      user: { id: string; email: string; displayName: string; emailVerified: boolean }
      verificationSent: boolean
    }>(register)
    expect(registerBody.user.email).toBe(email)
    expect(registerBody.user.displayName).toBe('Quiet Student')
    expect(registerBody.user.emailVerified).toBe(false)
    expect(registerBody.verificationSent).toBe(false)

    const blockedLogin = await client.post('/api/auth/login', {
      email,
      password: TEST_PASSWORD,
    })
    expect(blockedLogin.status).toBe(403)
    expect((await bodyOf<{ error: { code: string } }>(blockedLogin)).error.code).toBe(
      'EMAIL_NOT_VERIFIED',
    )

    const verifyToken = await createEmailToken(
      testEnv.DB,
      registerBody.user.id,
      'verify',
      24 * 60 * 60 * 1000,
    )
    const verify = await client.post('/api/auth/verify-email', { token: verifyToken })
    expect(verify.status).toBe(200)
    const setCookie = verify.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('__Host-lr_session=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).not.toContain('Secure')

    const meAfterVerify = await client.get('/api/me')
    expect(meAfterVerify.status).toBe(200)
    const verifiedUser = await bodyOf<{ user: { emailVerified: boolean } }>(meAfterVerify)
    expect(verifiedUser.user.emailVerified).toBe(true)

    const login = await client.post('/api/auth/login', {
      email,
      password: TEST_PASSWORD,
    })
    expect(login.status).toBe(200)
    const loginBody = await bodyOf<{ user: { id: string; email: string } }>(login)
    expect(loginBody.user.id).toBe(registerBody.user.id)
    expect(loginBody.user.email).toBe(email)

    const me = await client.get('/api/me')
    expect(me.status).toBe(200)
    const meBody = await bodyOf<{
      user: { id: string; email: string; displayName: string; emailVerified: boolean }
    }>(me)
    expect(meBody.user).toMatchObject({
      id: registerBody.user.id,
      email,
      displayName: 'Quiet Student',
      emailVerified: true,
    })

    const logout = await client.post('/api/auth/logout', {})
    expect(logout.status).toBe(200)
    expect((await client.get('/api/me')).status).toBe(401)
  })

  it('uses the same generic response for unknown accounts and wrong passwords', async () => {
    const client = new TestClient()
    const email = uniqueEmail('generic')
    await registerVerifiedUser(client, email)
    await client.post('/api/auth/logout', {})

    const wrongPassword = await client.post(
      '/api/auth/login',
      {
        email,
        password: 'wrong-password-1',
      },
      { ip: '203.0.113.20' },
    )
    const unknownAccount = await client.post(
      '/api/auth/login',
      {
        email: 'missing@example.com',
        password: 'wrong-password-2',
      },
      { ip: '203.0.113.21' },
    )

    expect(wrongPassword.status).toBe(401)
    expect(unknownAccount.status).toBe(401)
    expect(await bodyOf(wrongPassword)).toEqual(await bodyOf(unknownAccount))
  })

  it('validates input and requires an allowed Origin for mutations', async () => {
    const client = new TestClient()
    const noOrigin = await client.request('/api/auth/register', {
      method: 'POST',
      body: {
        email: uniqueEmail('no-origin'),
        password: TEST_PASSWORD,
        displayName: 'No Origin',
      },
      origin: null,
    })
    expect(noOrigin.status).toBe(403)
    expect((await bodyOf<{ error: { code: string } }>(noOrigin)).error.code).toBe('ORIGIN_REQUIRED')

    const badOrigin = await client.post(
      '/api/auth/register',
      {
        email: uniqueEmail('bad-origin'),
        password: TEST_PASSWORD,
        displayName: 'Bad Origin',
      },
      { origin: 'https://evil.example' },
    )
    expect(badOrigin.status).toBe(403)
    expect((await bodyOf<{ error: { code: string } }>(badOrigin)).error.code).toBe('INVALID_ORIGIN')

    const invalidEmail = await client.post('/api/auth/register', {
      email: 'not-an-email',
      password: TEST_PASSWORD,
      displayName: 'Nope',
    })
    expect(invalidEmail.status).toBe(400)
    const invalidBody = await bodyOf<{ error: { code: string; message: string } }>(invalidEmail)
    expect(invalidBody.error.code).toBe('VALIDATION_ERROR')
    expect(invalidBody.error.message).toContain('email')

    const shortPassword = await client.post('/api/auth/register', {
      email: uniqueEmail('short'),
      password: 'short',
      displayName: 'Nope',
    })
    expect(shortPassword.status).toBe(400)
    expect((await bodyOf<{ error: { code: string } }>(shortPassword)).error.code).toBe(
      'VALIDATION_ERROR',
    )

    const preflight = await SELF.fetch('https://api.test/api/me', {
      method: 'OPTIONS',
      headers: {
        Origin: TEST_ORIGIN,
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe(TEST_ORIGIN)
    expect(preflight.headers.get('access-control-allow-credentials')).toBe('true')

    const rejectedPreflight = await SELF.fetch('https://api.test/api/me', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'PATCH',
      },
    })
    expect(rejectedPreflight.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('responds generically to forgot-password but creates a reset token for known users', async () => {
    const client = new TestClient()
    const email = uniqueEmail('forgot')
    const user = await registerVerifiedUser(client, email)
    await client.post('/api/auth/logout', {})

    const known = await client.post('/api/auth/forgot-password', { email })
    const unknown = await client.post(
      '/api/auth/forgot-password',
      {
        email: uniqueEmail('unknown'),
      },
      { ip: '203.0.113.30' },
    )

    expect(known.status).toBe(202)
    expect(unknown.status).toBe(202)
    expect(await bodyOf(known)).toEqual(await bodyOf(unknown))

    const tokens = await testEnv.DB.prepare(
      `SELECT purpose, used_at FROM email_tokens
        WHERE user_id = ? ORDER BY created_at DESC`,
    )
      .bind(user.id)
      .all<{ purpose: string; used_at: number | null }>()
    expect(tokens.results?.some((row) => row.purpose === 'reset')).toBe(true)

    const resetToken = await createEmailToken(testEnv.DB, user.id, 'reset', RESET_TOKEN_TTL_MS)
    const reset = await client.post('/api/auth/reset-password', {
      token: resetToken,
      password: 'a brand new password',
    })
    expect(reset.status).toBe(200)

    const reused = await client.post('/api/auth/reset-password', {
      token: resetToken,
      password: 'another brand new password',
    })
    expect(reused.status).toBe(400)

    const oldLogin = await client.post(
      '/api/auth/login',
      {
        email,
        password: TEST_PASSWORD,
      },
      { ip: '203.0.113.31' },
    )
    expect(oldLogin.status).toBe(401)

    const newLogin = await client.post(
      '/api/auth/login',
      {
        email,
        password: 'a brand new password',
      },
      { ip: '203.0.113.32' },
    )
    expect(newLogin.status).toBe(200)
  })

  it('enforces the register rate limit with Retry-After', async () => {
    const client = new TestClient()
    const ip = '203.0.113.40'
    for (let index = 0; index < 5; index += 1) {
      const response = await client.post(
        '/api/auth/register',
        {
          email: uniqueEmail(`rate-${index}`),
          password: TEST_PASSWORD,
          displayName: `Rate ${index}`,
        },
        { ip },
      )
      expect(response.status).toBe(201)
    }

    const limited = await client.post(
      '/api/auth/register',
      {
        email: uniqueEmail('rate-limited'),
        password: TEST_PASSWORD,
        displayName: 'Rate Limited',
      },
      { ip },
    )
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toMatch(/^\d+$/)
    const body = await bodyOf<{ error: { code: string } }>(limited)
    expect(body.error.code).toBe('RATE_LIMITED')
  })

  it('selects Secure cookies only for production non-localhost requests', () => {
    expect(shouldUseSecureCookie('https://api.learningroom.dpdns.org/api', 'production')).toBe(true)
    expect(shouldUseSecureCookie('http://localhost:8787/api', 'development')).toBe(false)
    expect(shouldUseSecureCookie('http://127.0.0.1:8787/api', 'production')).toBe(false)
    expect(shouldUseSecureCookie('https://api.learningroom.dpdns.org/api', 'development')).toBe(
      false,
    )
  })

  it('does not accept duplicate email addresses', async () => {
    const client = new TestClient()
    const email = uniqueEmail('duplicate')
    const first = await client.post('/api/auth/register', {
      email,
      password: TEST_PASSWORD,
      displayName: 'First',
    })
    expect(first.status).toBe(201)

    const second = await client.post(
      '/api/auth/register',
      {
        email: email.toUpperCase(),
        password: TEST_PASSWORD,
        displayName: 'Second',
      },
      { ip: '203.0.113.50' },
    )
    expect(second.status).toBe(409)
    expect((await bodyOf<{ error: { code: string } }>(second)).error.code).toBe('EMAIL_IN_USE')
  })
})
