import { ACHIEVEMENTS } from '@/data/achievements'
import type { AchievementId, Progress, Session } from './types'
import { dayKey, streakAfter } from './stats'

export interface CommitResult {
  progress: Progress
  unlocked: AchievementId[]
  fishEarned: number
}

export function commitSession(session: Session, prev: Progress): CommitResult {
  const fishEarned = session.fishEarned
  let streak = prev.streak
  let bestStreak = prev.bestStreak
  let lastCompletedDay = prev.lastCompletedDay

  if (session.status === 'completed') {
    const today = dayKey(session.endedAt)
    streak = streakAfter(lastCompletedDay, today, prev.streak)
    bestStreak = Math.max(bestStreak, streak)
    lastCompletedDay = today
  }

  const scenesUsed =
    session.status === 'completed' && !prev.scenesUsed.includes(session.scene)
      ? [...prev.scenesUsed, session.scene]
      : prev.scenesUsed

  const base: Progress = {
    ...prev,
    totalFocusSec: prev.totalFocusSec + session.focusedSec,
    totalSessions: prev.totalSessions + 1,
    completedSessions: prev.completedSessions + (session.status === 'completed' ? 1 : 0),
    failedSessions: prev.failedSessions + (session.status === 'failed' ? 1 : 0),
    fish: prev.fish + fishEarned,
    streak,
    bestStreak,
    lastCompletedDay,
    scenesUsed,
  }

  const unlocked: AchievementId[] = []
  const achievements = { ...base.achievements }
  for (const def of ACHIEVEMENTS) {
    if (achievements[def.id]) continue
    if (def.test(base, session)) {
      achievements[def.id] = session.endedAt
      unlocked.push(def.id)
    }
  }

  return {
    progress: { ...base, achievements },
    unlocked,
    fishEarned,
  }
}
