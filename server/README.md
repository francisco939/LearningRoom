# LearningRoom API

Cloudflare Workers backend for the LearningRoom study room. This is an
independent service inside `server/`: it does not import or modify the Vite
frontend and it has its own `package.json`, TypeScript config, migrations, and
tests.

Stack: Workers + Hono + D1 + R2 + Durable Objects + Resend.

## What is implemented

- Email/password accounts with custom cookie sessions (no JWT).
- Email verification and password reset tokens stored as SHA-256 hashes.
- Settings/progress/study-session sync with idempotent D1 upserts.
- Anonymous, global presence room over WebSockets and a REST snapshot.
- Account export, profile update, and account deletion with cascading data.
- CORS, security headers, consistent JSON errors, and D1-backed rate limits.
- Community chat is deliberately **not implemented**. `server/src/routes/community.ts`
  returns `501` and no message tables or endpoints exist.

## Prerequisites

- Node.js 22+ (the lockfile was created with Node 24).
- A Cloudflare account and `wrangler` (installed locally by `npm install`).
- A Resend account with the `learningroom.dpdns.org` domain verified.
- A custom domain or Workers route for the API if you want the documented
  `api.learningroom.dpdns.org` origin.

## Local setup

```sh
cd server
npm install
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with a long random `PASSWORD_PEPPER` (at least 16 characters)
and a Resend API key. Never commit `.dev.vars`.

Create the D1 database and R2 bucket:

```sh
npx wrangler d1 create learningroom-db
npx wrangler r2 bucket create learningroom-media
```

Put the D1 `database_id` printed by Wrangler into `wrangler.toml`, replacing the
all-zero placeholder. The Durable Object does not need to be created manually:
the `PRESENCE` binding and `[[migrations]]` block define `PresenceRoom`.

Apply the schema locally and start the Worker:

```sh
npm run db:migrate:local
npm run dev
```

Wrangler serves the API at `http://localhost:8787` by default. The example
`.dev.vars` allows the Vite frontend at `http://localhost:5173`.

Useful commands:

| Command                    | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `npm run dev`              | Local Worker with local D1/R2/DO simulation. |
| `npm run typecheck`        | TypeScript check for source and tests.       |
| `npm test`                 | Cloudflare Workers Vitest suite.             |
| `npm run deploy`           | Deploy with Wrangler.                        |
| `npm run db:migrate`       | Apply migrations to the remote D1 database.  |
| `npm run db:migrate:local` | Apply migrations to local D1.                |

## Deployment

1. Create D1/R2 and replace the placeholder `database_id` in `wrangler.toml`.
   The `database_name` and `bucket_name` must match the resources you created.
2. Set production secrets:

   ```sh
   npx wrangler secret put PASSWORD_PEPPER
   npx wrangler secret put RESEND_API_KEY
   ```

   `PASSWORD_PEPPER` should be a high-entropy value of at least 16 characters.
   It is not stored in `wrangler.toml`.

3. Apply migrations before sending traffic:

   ```sh
   npm run db:migrate
   ```

4. Configure the API hostname. The `API_ORIGIN` and `MEDIA_ORIGIN` vars are
   informational for media-aware clients; no media endpoints exist in v1.
   Attach a Worker custom domain or route such as
   `api.learningroom.dpdns.org`. Update `APP_ORIGIN` if the frontend host
   changes.
5. Deploy:

   ```sh
   npm run deploy
   ```

6. Check `GET https://<api-host>/api/health`.

### Resend DNS

In Resend, add `learningroom.dpdns.org` as a sending domain and publish the
provided SPF/DKIM records in DNS. The sender is hard-coded to:

```text
LearningRoom <noreply@learningroom.dpdns.org>
```

Resend requires the domain to be verified before production mail is accepted.
Do not place the Resend API key in source, `wrangler.toml`, or the frontend. A
DMARC record is recommended but not required by the API.

If `RESEND_API_KEY` is missing or Resend rejects a message, account creation and
password recovery still return their generic responses and account creation
reports `verificationSent: false`. The user can request another verification
email. Secrets and email tokens are never logged. Tokens are only included in
the Resend request body and the generated link.

## API conventions

- Base path: `/api`.
- JSON requests must send `Content-Type: application/json`.
- CORS allows credentials (`Access-Control-Allow-Credentials: true`) from
  `APP_ORIGIN`, `https://www.learningroom.dpdns.org`, and (in non-production)
  any `http(s)://localhost[:port]` / `http(s)://127.0.0.1[:port]` origin.
- **Every mutating request** (`POST`, `PUT`, `PATCH`, `DELETE`) must include an
  allowed `Origin` header. This is intentionally strict, including for curl.
- Sessions are cookie-based. Browser clients must use `credentials: 'include'`.
  There is no Bearer token.
- All errors have exactly this shape:

  ```json
  { "error": { "code": "MACHINE_CODE", "message": "Human-readable message" } }
  ```

- Public account/presence timestamps use ISO-8601 UTC strings. Sync session
  `startedAt`/`endedAt` values are Unix epoch milliseconds, matching the
  frontend's `Session` type.
- Responses use `Cache-Control: no-store`.
- Validation errors are `400 VALIDATION_ERROR`, missing/invalid Origin is
  `403 ORIGIN_REQUIRED` / `403 INVALID_ORIGIN`, and rate limits are
  `429 RATE_LIMITED` with `Retry-After`.

### Health

`GET /api/health` → `200`

```json
{
  "ok": true,
  "service": "learningroom-api",
  "environment": "production",
  "time": "2026-01-01T00:00:00.000Z"
}
```

### Account object

```json
{
  "id": "uuid",
  "email": "student@example.com",
  "displayName": "Quiet Student",
  "emailVerified": true,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

Password hashes, session hashes, and email-token hashes are never returned.

## Authentication

All endpoints are under `/api/auth`.

| Method | Path                   | Body                               | Success                             |
| ------ | ---------------------- | ---------------------------------- | ----------------------------------- |
| POST   | `/register`            | `{ email, password, displayName }` | `201 { user, verificationSent }`    |
| POST   | `/login`               | `{ email, password }`              | `200 { user }` + session cookie     |
| POST   | `/logout`              | none                               | `200 { ok: true }` + cleared cookie |
| POST   | `/verify-email`        | `{ token }`                        | `200 { user }` + session cookie     |
| POST   | `/resend-verification` | `{ email }`                        | `202 { ok: true }`                  |
| POST   | `/forgot-password`     | `{ email }`                        | `202 { ok: true }`                  |
| POST   | `/reset-password`      | `{ token, password }`              | `200 { ok: true }`                  |
| POST   | `/change-password`     | `{ currentPassword, newPassword }` | `200 { ok: true }` + new cookie     |

Behavior details:

- Email is trimmed and lowercased. Passwords are 8–128 characters. Display
  names are trimmed and limited to 50 characters.
- Registering a duplicate email returns `409 EMAIL_IN_USE`. Login and
  forgot-password responses are deliberately generic to reduce enumeration.
- Login is rejected with `403 EMAIL_NOT_VERIFIED` until verification. The
  verification endpoint marks the address verified and creates a session, so
  the frontend can proceed directly after opening the emailed link.
- Verification tokens are single-use, 24-hour tokens. Reset tokens are
  single-use, 1-hour tokens. Creating a new token of the same purpose
  invalidates the previous unused one.
- Reset and change password revoke all existing sessions. Change password then
  issues a new session for the current browser.
- Logout is idempotent.
- Resend and forgot-password always return the same `202` for existing and
  non-existing addresses after validation (subject to rate limiting).
- Password hashing is PBKDF2-HMAC-SHA256, 100,000 iterations, a 16-byte
  per-user salt, and `PASSWORD_PEPPER`. The stored format includes the
  algorithm, iteration count, salt, and derived key.
- Session tokens are 32 random bytes, stored only as SHA-256 hashes, and expire
  after 30 days. The production cookie is `__Host-lr_session`, `HttpOnly`,
  `Secure`, `SameSite=Lax`, `Path=/`. Localhost development omits `Secure`.
  Browsers enforce the `__Host-` prefix rules strictly; if your local browser
  rejects the non-Secure dev cookie, use an HTTPS dev tunnel or set
  `ENVIRONMENT=production` behind local HTTPS.

### Email links

- Verification: `${APP_ORIGIN}/?auth=verify&token=...`
- Reset: `${APP_ORIGIN}/?auth=reset&token=...`

The frontend calls the corresponding API endpoint with the token; the API does
not implement HTML pages.

## Account

All account endpoints require a valid session.

| Method | Path             | Body                       | Success                          |
| ------ | ---------------- | -------------------------- | -------------------------------- |
| GET    | `/api/me`        | none                       | `200 { user }`                   |
| PATCH  | `/api/me`        | `{ displayName?, email? }` | `200 { user, verificationSent }` |
| DELETE | `/api/me`        | none                       | `200 { ok: true }`               |
| GET    | `/api/me/export` | none                       | `200` downloadable JSON          |

- `PATCH` requires at least one of `displayName` / `email`.
- Changing email marks the account unverified, invalidates pending verification
  tokens, and sends a new verification link. The response reports
  `verificationSent` rather than failing the update when email delivery fails.
- `DELETE` deletes the user and cascades sessions, email tokens, settings,
  progress, and study sessions. The session cookie is cleared.
- Export includes `{ version, exportedAt, account, settings, progress, sessions }`
  for all stored sessions. It contains no password, session, or email-token
  material. The response is sent with a
  `Content-Disposition: attachment; filename="learningroom-account-export.json"`
  header.

## Sync

Both endpoints require a session and are rate-limited to 120 requests/minute per
user.

`GET /api/sync` returns:

```json
{
  "settings": {},
  "progress": {},
  "sessions": [],
  "syncedAt": "2026-01-01T00:00:00.000Z"
}
```

`PUT /api/sync` accepts:

```json
{
  "settings": { "version": 1, "mode": "pomodoro" },
  "progress": { "version": 1, "totalSessions": 12 },
  "sessions": [
    {
      "id": "client-session-uuid",
      "startedAt": 1767225600000,
      "endedAt": 1767227100000,
      "mode": "pomodoro",
      "scene": "rainy-study",
      "supervision": "standard",
      "plannedSec": 1500,
      "focusedSec": 1500,
      "starsLeft": 3,
      "violations": [],
      "status": "completed",
      "fishEarned": 3
    }
  ]
}
```

- `settings` and `progress` are arbitrary JSON objects. Each is capped at 512 KB
  after serialization.
- `sessions` accepts at most **2,000** entries per request. The session `id` is
  the client-generated id and is stored as `study_sessions.client_id`.
- Session fields `id`, `startedAt`, `endedAt`, `mode`, `scene`, `supervision`,
  `plannedSec`, `focusedSec`, `starsLeft`, `violations`, `status`, and
  `fishEarned` are validated. Extra JSON fields are preserved.
- `startedAt` / `endedAt` are Unix epoch milliseconds. `duration_seconds` is
  populated from `focusedSec`.
- Writes are idempotent through `UNIQUE(user_id, client_id)` and D1 upserts.
  Re-sending the same session updates it instead of creating a duplicate.
- `PUT` is a **merge**, not a destructive replace: it does not delete sessions
  that are absent from the payload. This avoids accidental history loss.
- `PUT` returns the same shape as `GET`. Both return the 1,000 most recent
  sessions ordered by `started_at DESC, updated_at DESC`.

## Presence

Presence is anonymous. No session is required and no email or user id is
exposed.

### Snapshot

`GET /api/presence` → `200`

```json
{ "online": 3, "focusing": 2, "updatedAt": "2026-01-01T00:00:00.000Z" }
```

`online` counts unique `clientId` values. `focusing` counts those with their
focus flag set. `updatedAt` is the time of the last presence change, not the time
of the heartbeat.

### WebSocket

Connect to `/api/presence/ws?clientId=<id>` using the WebSocket upgrade.

- `clientId` must match `^[A-Za-z0-9._:-]{1,128}$` and is unique in the room.
  A reconnect with the same id replaces the old socket.
- A new connection starts with `focusing: false`.
- The server broadcasts the snapshot JSON below to every connected socket after
  a connect, disconnect, focus change, or expiry:

  ```json
  { "online": 3, "focusing": 2, "updatedAt": "2026-01-01T00:00:00.000Z" }
  ```

- Clients send text JSON. Any valid message refreshes the 60-second heartbeat:
  `{ "type": "heartbeat" }`
- To change focus state:
  `{ "type": "focus", "focusing": true }`
- Clients that stop sending messages are removed after 60 seconds. The Durable
  Object uses alarms and persistent storage, so presence survives DO
  hibernation/eviction. The room is a single global Durable Object instance.
- Invalid client ids receive `400 INVALID_CLIENT_ID`; missing upgrades receive
  `426 UPGRADE_REQUIRED`.

## Community

Community chat is not implemented and is out of scope for v1. Every
`/api/community` path returns:

```json
{
  "error": {
    "code": "COMMUNITY_NOT_IMPLEMENTED",
    "message": "Community chat is not available in v1."
  }
}
```

with status `501`. There are no message, report, participant, or community
presence tables. The anonymous `/api/presence` room must not be reused as a
chat identity system.

## D1 schema

`migrations/0001_init.sql` creates:

| Table            | Purpose                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| `users`          | Account identity and PBKDF2 hash. Case-insensitive unique email.                |
| `auth_sessions`  | SHA-256 session-token hashes, 30-day expiry, cascade on user delete.            |
| `email_tokens`   | SHA-256 verification/reset-token hashes, purpose, TTL, one-time `used_at`.      |
| `user_settings`  | One JSON settings document per user.                                            |
| `user_progress`  | One JSON progress document per user.                                            |
| `study_sessions` | Validated session JSON plus sortable timestamps; unique `(user_id, client_id)`. |
| `rate_limits`    | `(key, window_start)` fixed-window counters.                                    |

All user-owned tables have `ON DELETE CASCADE`. D1 enforces foreign keys by
default. The migration retains `PRAGMA foreign_keys = ON;` for local SQLite
shells that apply the file manually; D1 itself always enforces foreign keys.

`rate_limits` is cleaned opportunistically when a new counter window starts.
No cron trigger is required.

## Rate limits

| Scope               | Limit                                              |
| ------------------- | -------------------------------------------------- |
| Register            | 5 / 15 min per IP                                  |
| Login               | 10 / 15 min per IP and 5 / 15 min per email digest |
| Forgot password     | 5 / 15 min per IP and 3 / 15 min per email digest  |
| Resend verification | 5 / 15 min per IP and 3 / 15 min per email digest  |
| Reset password      | 10 / 15 min per IP                                 |
| Change password     | 10 / 15 min per user                               |
| Sync                | 120 / min per user                                 |

Email-based keys contain a truncated SHA-256 digest, not the address. A blocked
request returns `429` with a `Retry-After` header in seconds and
`X-RateLimit-*` headers.

## Security notes

- Sessions and email tokens are opaque random values. Only SHA-256 hashes are
  stored in D1.
- Passwords use PBKDF2-HMAC-SHA256 with 100,000 iterations and a server-side
  pepper. Login performs a dummy PBKDF2 computation for unknown accounts to
  reduce timing differences.
- Origin validation on mutating requests plus `SameSite=Lax` cookies provides
  CSRF defense. There is no separate CSRF token.
- No secrets are logged. Email failures log only the HTTP status or a generic
  message.
- R2 (`MEDIA`) is bound for future gallery videos. v1 has no upload, gallery,
  or media-serving endpoint.

### PBKDF2 and the Workers free plan

The auth model is fixed at PBKDF2-SHA256/100,000. A PBKDF2 derivation can exceed
the Workers **free-plan CPU limit** (historically 10 ms per invocation), causing
`1102` exceeded-CPU errors on register/login. The recommended production
deployment is Workers Paid, where the CPU limit is much higher. Do not lower the
iteration count to fit the free plan; that silently weakens the password hash.
Measure real CPU time with `wrangler tail` / Workers metrics before choosing a
plan. Session validation, sync, and presence do not perform PBKDF2.

Changing `PASSWORD_PEPPER` makes all existing password hashes unverifiable.
Treat the pepper as long-lived secret material and rotate only as part of a
planned password-reset migration.

## Testing

```sh
npm test
npm run typecheck
```

Tests live under `test/` and use `@cloudflare/vitest-pool-workers`, Vitest,
Miniflare's D1/R2/DO simulation, and `applyD1Migrations`. They cover:

- register → verify → login → me, cookie flags, logout;
- generic unknown-account / wrong-password login responses;
- input validation, strict Origin, CORS preflight;
- forgot-password generic response and one-time reset token;
- register rate limiting and `Retry-After`;
- sync idempotency, payload validation, 2,000-session cap;
- account export, profile/email update, and cascading delete;
- health, presence snapshot, and community placeholders.

The test suite does not call Resend: the test environment sets an empty
`RESEND_API_KEY`, and tests create verification/reset tokens through the same
token helper used by the app. To exercise real delivery, configure a Resend test
key in `.dev.vars`.

## Deliberate v1 decisions / deviations

- `PUT /api/sync` merges instead of replacing. Deleting a session from the
  client does not delete it from D1; a later explicit delete endpoint can be
  added.
- Sync sessions use `id` (the existing frontend field) and map it to the D1
  `client_id` column.
- `API_ORIGIN` and `MEDIA_ORIGIN` are configuration vars but are not consumed by
  any v1 endpoint.
- Community chat and R2 media endpoints are intentionally absent.
- The API requires an `Origin` header on mutations even for non-browser clients.
- Registration returns `409 EMAIL_IN_USE`; only login and forgot-password are
  made generic.
- On localhost, the dev cookie does not set `Secure` as requested. Some browsers
  enforce the `__Host-` prefix and reject that cookie; use HTTPS locally if you
  encounter this.

## Project layout

```text
server/
  migrations/0001_init.sql
  src/
    index.ts                 Hono app, CORS, security, origin middleware
    auth/                    password, sessions, email tokens, middleware, routes
    routes/                  account, sync, presence, community
    presence-room.ts         Global PresenceRoom Durable Object
    email.ts                 Resend sender and links
    rate-limit.ts            D1 fixed-window helper
    validation.ts            Zod schemas
  test/                      Workers integration tests
  wrangler.toml
  vitest.config.ts
  .dev.vars.example
```
