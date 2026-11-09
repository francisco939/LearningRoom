import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations('./migrations')

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        bindings: {
          APP_ORIGIN: 'http://localhost:5173',
          API_ORIGIN: 'http://localhost:8787',
          MEDIA_ORIGIN: 'http://localhost:8787',
          ENVIRONMENT: 'test',
          PASSWORD_PEPPER: 'test-only-pepper-value-at-least-16-chars',
          RESEND_API_KEY: '',
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./test/apply-migrations.ts'],
  },
})
