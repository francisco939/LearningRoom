import { applyD1Migrations, env } from 'cloudflare:test'
import type { D1Migration } from 'cloudflare:test'
import type { Env } from '../src/env'

const testEnv = env as unknown as Env & { TEST_MIGRATIONS: D1Migration[] }

await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS)
