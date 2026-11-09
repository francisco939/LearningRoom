export interface UserRow {
  id: string
  email: string
  display_name: string
  password_hash: string
  email_verified_at: number | null
  created_at: number
  updated_at: number
}

export interface PublicUser {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    emailVerified: user.email_verified_at !== null,
    createdAt: new Date(user.created_at).toISOString(),
    updatedAt: new Date(user.updated_at).toISOString(),
  }
}

export interface SyncSession {
  id: string
  startedAt: number
  endedAt: number
  mode: 'pomodoro' | 'countdown' | 'stopwatch'
  scene: string
  supervision: 'lenient' | 'standard' | 'strict'
  plannedSec: number
  focusedSec: number
  starsLeft: number
  violations: Array<{
    at: number
    kind: 'away' | 'no-checkin'
    detail?: string
  }>
  status: 'completed' | 'aborted' | 'failed'
  fishEarned: number
  [key: string]: unknown
}
