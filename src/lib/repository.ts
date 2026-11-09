import type { Progress, Session, Settings } from './types'
import {
  appendSession,
  clearActive,
  clearAllStorage,
  loadActive,
  loadProgress,
  loadSessions,
  saveSessions,
  loadSettings,
  saveActive,
  saveProgress,
  saveSettings,
} from './storage'

/**
 * 本地实现。未来接后端时，用 HTTP 实现替换它即可，
 * 上层 store 不需要改。
 */
export interface Repository {
  loadSettings(): Settings
  saveSettings(settings: Settings): void
  loadProgress(): Progress
  saveProgress(progress: Progress): void
  loadSessions(): Session[]
  saveSessions(sessions: Session[]): void
  appendSession(session: Session): void
  loadActive<T>(): T | null
  saveActive(state: unknown): void
  clearActive(): void
  clearAll(): void
}

export const localRepository: Repository = {
  loadSettings,
  saveSettings,
  loadProgress,
  saveProgress,
  loadSessions,
  saveSessions,
  appendSession: (session) => {
    appendSession(session)
  },
  loadActive,
  saveActive,
  clearActive,
  clearAll: clearAllStorage,
}
