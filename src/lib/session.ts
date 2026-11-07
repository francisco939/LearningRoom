import type { Mode, Session, SessionStatus, SupervisionMode } from './types'
import type { SceneId } from './types'

export interface SessionDraft {
  startedAt: number
  endedAt: number
  mode: Mode
  scene: SceneId
  supervision: SupervisionMode
  plannedSec: number
  focusedSec: number
  starsLeft: number
  violations: Session['violations']
  status: SessionStatus
  failureReason: 'stars' | 'aborted' | null
}

export function fishFor(status: SessionStatus, focusedSec: number, starsLeft: number): number {
  if (status === 'failed') return 0
  if (status === 'aborted') return Math.floor(focusedSec / 1200)
  return Math.floor(focusedSec / 600) + starsLeft
}

export function buildSession(draft: SessionDraft, id: string): Session {
  return {
    id,
    startedAt: draft.startedAt,
    endedAt: draft.endedAt,
    mode: draft.mode,
    scene: draft.scene,
    supervision: draft.supervision,
    plannedSec: draft.plannedSec,
    focusedSec: Math.max(0, Math.round(draft.focusedSec)),
    starsLeft: draft.starsLeft,
    violations: draft.violations,
    status: draft.status,
    fishEarned: fishFor(draft.status, draft.focusedSec, draft.starsLeft),
  }
}
