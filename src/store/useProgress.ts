import { create } from 'zustand'
import type { AchievementId, Progress, Session } from '@/lib/types'
import { localRepository } from '@/lib/repository'
import { commitSession } from '@/lib/progress'
import { defaultProgress } from '@/lib/storage'

interface RecordResult {
  progress: Progress
  unlocked: AchievementId[]
  fishEarned: number
}

interface ProgressStore {
  progress: Progress
  sessions: Session[]
  record: (session: Session) => RecordResult
  setOnboarded: () => void
  hydrate: (progress: Progress, sessions: Session[]) => void
  reset: () => void
}

const initialSessions = localRepository.loadSessions()

export const useProgress = create<ProgressStore>((set, get) => ({
  progress: localRepository.loadProgress(),
  sessions: initialSessions,
  record: (session) => {
    const result = commitSession(session, get().progress)
    localRepository.appendSession(session)
    localRepository.saveProgress(result.progress)
    set({
      progress: result.progress,
      sessions: [session, ...get().sessions].slice(0, 1000),
    })
    return result
  },
  setOnboarded: () => {
    const progress = { ...get().progress, onboarded: true }
    localRepository.saveProgress(progress)
    set({ progress })
  },
  hydrate: (progress, sessions) => {
    localRepository.saveProgress(progress)
    localRepository.saveSessions(sessions)
    set({ progress, sessions: sessions.slice(0, 1000) })
  },
  reset: () => {
    localRepository.clearAll()
    set({ progress: defaultProgress, sessions: [] })
  },
}))
