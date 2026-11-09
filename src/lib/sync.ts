import type { Progress, Session, Settings } from './types'
import type { SyncPayload } from './api'

export function emptySync(): SyncPayload {
  return { settings: null, progress: null, sessions: [], updatedAt: 0 }
}

export function normalizeRemote(raw: SyncPayload | null): SyncPayload {
  if (!raw) return emptySync()
  const settings =
    raw.settings && typeof raw.settings === 'object' && Object.keys(raw.settings).length > 0
      ? raw.settings
      : null
  const progress =
    raw.progress && typeof raw.progress === 'object' && Object.keys(raw.progress).length > 0
      ? raw.progress
      : null
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.filter(
        (item) => item && typeof item === 'object' && typeof (item as Session).id === 'string',
      )
    : []
  return { settings, progress, sessions, syncedAt: raw.syncedAt }
}

export function hasRemoteData(payload: SyncPayload | null): boolean {
  return Boolean(payload && (payload.settings || payload.progress || payload.sessions.length > 0))
}

export function mergeSync(
  local: { settings: Settings; progress: Progress; sessions: Session[] },
  remote: SyncPayload | null,
): SyncPayload {
  if (!remote) {
    return {
      settings: local.settings,
      progress: local.progress,
      sessions: local.sessions,
      updatedAt: Date.now(),
    }
  }

  const byId = new Map<string, Session>()
  for (const session of [...remote.sessions, ...local.sessions]) {
    const previous = byId.get(session.id)
    if (!previous || session.endedAt >= previous.endedAt) byId.set(session.id, session)
  }
  const sessions = [...byId.values()]
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, 1000)

  return {
    settings: local.settings,
    progress: mergeProgress(local.progress, remote.progress),
    sessions,
    updatedAt: Date.now(),
  }
}

function mergeProgress(local: Progress, remote: Progress | null): Progress {
  if (!remote) return local
  return {
    ...local,
    totalFocusSec: Math.max(local.totalFocusSec, Number(remote.totalFocusSec) || 0),
    totalSessions: Math.max(local.totalSessions, Number(remote.totalSessions) || 0),
    completedSessions: Math.max(local.completedSessions, Number(remote.completedSessions) || 0),
    failedSessions: Math.max(local.failedSessions, Number(remote.failedSessions) || 0),
    fish: Math.max(local.fish, Number(remote.fish) || 0),
    streak: Math.max(local.streak, Number(remote.streak) || 0),
    bestStreak: Math.max(local.bestStreak, Number(remote.bestStreak) || 0),
    lastCompletedDay:
      (local.lastCompletedDay ?? '') >= (remote.lastCompletedDay ?? '')
        ? local.lastCompletedDay
        : remote.lastCompletedDay,
    scenesUsed: [
      ...new Set([
        ...(Array.isArray(local.scenesUsed) ? local.scenesUsed : []),
        ...(Array.isArray(remote.scenesUsed) ? remote.scenesUsed : []),
      ]),
    ],
    achievements: {
      ...(remote.achievements && typeof remote.achievements === 'object'
        ? remote.achievements
        : {}),
      ...local.achievements,
    },
    onboarded: local.onboarded || remote.onboarded,
  }
}
