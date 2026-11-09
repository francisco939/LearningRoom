import type { Progress, Session, Settings } from './types'
import { PURE_STUDY_ROOM } from './studyMode'

export const KEYS = {
  settings: 'lr.settings.v1',
  progress: 'lr.progress.v1',
  sessions: 'lr.sessions.v1',
  active: 'lr.active.v1',
} as const

export const defaultSettings: Settings = {
  version: 1,
  mode: 'pomodoro',
  focusMin: 25,
  breakMin: 5,
  rounds: 4,
  autoStartBreak: true,
  autoStartFocus: false,
  supervision: 'standard',
  scene: 'rainy-study',
  sound: true,
  volume: 0.5,
  catName: '耄耋',
  hasCustomCat: false,
  supervisionEnabled: !PURE_STUDY_ROOM,
  backgroundMode: 'gallery',
  galleryId: 'image-01',
  galleryRotateMin: 10,
  galleryShuffle: false,
  ambienceId: 'rain',
  reducedMotion: 'system',
}

export const defaultProgress: Progress = {
  version: 1,
  totalFocusSec: 0,
  totalSessions: 0,
  completedSessions: 0,
  failedSessions: 0,
  fish: 0,
  streak: 0,
  bestStreak: 0,
  lastCompletedDay: null,
  scenesUsed: [],
  achievements: {},
  onboarded: false,
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadSettings(): Settings {
  const stored = read<Partial<Settings>>(KEYS.settings, {})
  const merged = { ...defaultSettings, ...stored, version: 1 as const }
  merged.focusMin = clamp(Number(merged.focusMin), 1, 180, defaultSettings.focusMin)
  merged.breakMin = clamp(Number(merged.breakMin), 1, 60, defaultSettings.breakMin)
  merged.rounds = clamp(Number(merged.rounds), 1, 12, defaultSettings.rounds)
  merged.volume = clamp(Number(merged.volume), 0, 1, defaultSettings.volume)
  merged.catName =
    typeof merged.catName === 'string' && merged.catName.trim()
      ? merged.catName.trim().slice(0, 8)
      : defaultSettings.catName
  merged.supervisionEnabled = !PURE_STUDY_ROOM && merged.supervisionEnabled !== false
  merged.backgroundMode = merged.backgroundMode === 'room' ? 'room' : 'gallery'
  merged.galleryId = typeof merged.galleryId === 'string' ? merged.galleryId : 'image-01'
  merged.galleryRotateMin = clamp(Number(merged.galleryRotateMin), 0, 60, 10)
  merged.galleryShuffle = merged.galleryShuffle === true
  merged.ambienceId = typeof merged.ambienceId === 'string' ? merged.ambienceId : 'rain'
  return merged
}

export function saveSettings(settings: Settings): boolean {
  return write(KEYS.settings, settings)
}

export function loadProgress(): Progress {
  const stored = read<Partial<Progress>>(KEYS.progress, {})
  return {
    ...defaultProgress,
    ...stored,
    version: 1,
    achievements: { ...defaultProgress.achievements, ...(stored.achievements ?? {}) },
    scenesUsed: Array.isArray(stored.scenesUsed) ? stored.scenesUsed : [],
  }
}

export function saveProgress(progress: Progress): boolean {
  return write(KEYS.progress, progress)
}

export function loadSessions(): Session[] {
  const stored = read<Session[]>(KEYS.sessions, [])
  return Array.isArray(stored) ? stored.slice(0, 1000) : []
}

export function saveSessions(sessions: Session[]): void {
  write(KEYS.sessions, sessions.slice(0, 1000))
}

export function appendSession(session: Session): Session[] {
  const next = [session, ...loadSessions()].slice(0, 1000)
  write(KEYS.sessions, next)
  return next
}

export function saveActive(state: unknown): void {
  write(KEYS.active, state)
}

export function loadActive<T>(): T | null {
  return read<T | null>(KEYS.active, null)
}

export function clearActive(): void {
  try {
    localStorage.removeItem(KEYS.active)
  } catch {
    /* ignore */
  }
}

export function clearAllStorage(): void {
  for (const key of Object.values(KEYS)) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}
