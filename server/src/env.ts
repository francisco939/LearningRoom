import type { UserRow } from './types'

export interface Env {
  DB: D1Database
  MEDIA: R2Bucket
  PRESENCE: DurableObjectNamespace

  APP_ORIGIN: string
  API_ORIGIN: string
  MEDIA_ORIGIN: string
  ENVIRONMENT: string

  PASSWORD_PEPPER: string
  RESEND_API_KEY: string
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    user: UserRow
    sessionId: string
  }
}
