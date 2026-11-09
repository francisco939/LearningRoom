export type Mode = 'pomodoro' | 'countdown' | 'stopwatch'
export type Phase = 'idle' | 'focus' | 'break' | 'done'
export type Status = 'idle' | 'running' | 'paused' | 'finished'
export type SupervisionMode = 'lenient' | 'standard' | 'strict'
export type SceneId = 'rainy-study' | 'dusk-library' | 'dawn-desk'
export type ViolationKind = 'away' | 'no-checkin' | 'absent'
export type SessionStatus = 'completed' | 'aborted' | 'failed'

export interface Violation {
  at: number
  kind: ViolationKind
  detail?: string
}

export interface Session {
  id: string
  startedAt: number
  endedAt: number
  mode: Mode
  scene: SceneId
  supervision: SupervisionMode
  plannedSec: number
  focusedSec: number
  starsLeft: number
  violations: Violation[]
  status: SessionStatus
  fishEarned: number
}

export type AchievementId =
  | 'first-session'
  | 'first-pomodoro'
  | 'ten-sessions'
  | 'streak-3'
  | 'streak-7'
  | 'clean-session'
  | 'strict-clean'
  | 'night-owl'
  | 'early-bird'
  | 'ten-hours'
  | 'fifty-hours'
  | 'all-scenes'
  | 'fish-100'

export interface Settings {
  version: 1
  mode: Mode
  focusMin: number
  breakMin: number
  rounds: number
  autoStartBreak: boolean
  autoStartFocus: boolean
  supervision: SupervisionMode
  scene: SceneId
  sound: boolean
  volume: number
  catName: string
  hasCustomCat: boolean
  supervisionEnabled: boolean
  cameraWatch: boolean
  backgroundMode: 'gallery' | 'room'
  galleryId: string
  galleryRotateMin: number
  galleryShuffle: boolean
  ambienceId: string
  reducedMotion: 'system' | 'on' | 'off'
}

export interface Progress {
  version: 1
  totalFocusSec: number
  totalSessions: number
  completedSessions: number
  failedSessions: number
  fish: number
  streak: number
  bestStreak: number
  lastCompletedDay: string | null
  scenesUsed: SceneId[]
  achievements: Partial<Record<AchievementId, number>>
  onboarded: boolean
}

export interface CatMessage {
  id: number
  text: string
  tone:
    | 'idle'
    | 'patrol'
    | 'approve'
    | 'violation'
    | 'fail'
    | 'complete'
    | 'leave'
    | 'pardon'
    | 'pardoned'
}
