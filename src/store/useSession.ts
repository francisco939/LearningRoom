import { create } from 'zustand'
import type { AchievementId, CatMessage, Session, Settings, ViolationKind } from '@/lib/types'
import type { TimerState } from '@/lib/timer'
import { createTimer, reduce } from '@/lib/timer'
import { localRepository } from '@/lib/repository'
import { nextCatMessage } from '@/data/catLines'
import { advanceTrust, isTimeoutViolation } from '@/lib/trust'
import { LEAVE_MS } from '@/lib/supervision'
import type { SessionDraft } from '@/lib/session'
import type { PeekAnchor } from '@/lib/peek'

export interface PatrolState {
  startedAt: number
  deadline: number
}

export interface PeekState {
  id: number
  anchor: PeekAnchor
  tone: 'patrol' | 'yell'
  at: number
}

export interface LightPatrolState {
  deadline: number
}

export interface LeaveState {
  until: number
}

export interface SessionResult {
  session: Session
  unlocked: AchievementId[]
}

type StampKind = ViolationKind | 'pardon'

interface SessionStore {
  timer: TimerState
  patrol: PatrolState | null
  lightPatrol: LightPatrolState | null
  leave: LeaveState | null
  checkinStreak: number
  pardon: boolean
  peek: PeekState | null
  catMessage: CatMessage
  stamp: { id: number; kind: StampKind } | null
  result: SessionResult | null
  start: (settings: Settings) => void
  pause: () => void
  resume: () => void
  skip: () => void
  end: () => void
  abort: () => void
  tick: (now: number) => void
  violation: (kind: ViolationKind) => void
  setPatrol: (deadline: number, anchor: PeekAnchor) => void
  setLightPatrol: (deadline: number) => void
  clearLightPatrol: () => void
  takeLeave: () => void
  returnEarly: () => void
  showPeek: (anchor: PeekAnchor, tone: PeekState['tone']) => void
  dismissPeek: () => void
  ackPatrol: () => void
  clearPatrol: () => void
  say: (tone: CatMessage['tone']) => void
  setResult: (result: SessionResult | null) => void
  clearStamp: () => void
  persist: () => void
  resetSession: () => void
}

function timerFromSettings(settings: Settings): TimerState {
  return createTimer({
    mode: settings.mode,
    focusSec: settings.focusMin * 60,
    breakSec: settings.breakMin * 60,
    rounds: settings.mode === 'pomodoro' ? settings.rounds : 1,
    autoStartBreak: settings.autoStartBreak,
    autoStartFocus: settings.autoStartFocus,
  })
}

function restoreTimer(settings: Settings): TimerState {
  const active = localRepository.loadActive<TimerState>()
  if (
    active &&
    typeof active === 'object' &&
    typeof active.focusSec === 'number' &&
    typeof active.status === 'string' &&
    active.status !== 'finished' &&
    Array.isArray(active.violations)
  ) {
    return {
      ...active,
      focusStartedAt:
        active.focusStartedAt === undefined ? (active.startedAt ?? null) : active.focusStartedAt,
      focusPausedTotalMs: active.focusPausedTotalMs ?? 0,
    }
  }
  return timerFromSettings(settings)
}

let stampSeq = 0
let peekSeq = 0

export const useSession = create<SessionStore>((set, get) => ({
  timer: restoreTimer(readSettingsSnapshot()),
  patrol: null,
  lightPatrol: null,
  leave: null,
  checkinStreak: 0,
  pardon: false,
  peek: null,
  catMessage: nextCatMessage('idle'),
  stamp: null,
  result: null,

  start: (settings) => {
    const timer = reduce(timerFromSettings(settings), { type: 'START', now: Date.now() })
    set({
      timer,
      patrol: null,
      lightPatrol: null,
      leave: null,
      checkinStreak: 0,
      pardon: false,
      peek: null,
      result: null,
      stamp: null,
      catMessage: nextCatMessage('idle'),
    })
    get().persist()
  },

  pause: () => {
    const timer = reduce(get().timer, { type: 'PAUSE', now: Date.now() })
    set({ timer, patrol: null, lightPatrol: null, peek: null })
    get().persist()
  },

  resume: () => {
    const timer = reduce(get().timer, { type: 'RESUME', now: Date.now() })
    set({ timer })
    get().persist()
  },

  skip: () => {
    const timer = reduce(get().timer, { type: 'SKIP', now: Date.now() })
    set({ timer, patrol: null, lightPatrol: null, peek: null })
    get().persist()
  },

  end: () => {
    const timer = reduce(get().timer, { type: 'END', now: Date.now() })
    set({ timer, patrol: null, lightPatrol: null, peek: null })
    get().persist()
  },

  abort: () => {
    const timer = reduce(get().timer, { type: 'ABORT', now: Date.now() })
    set({ timer, patrol: null, lightPatrol: null, peek: null })
    get().persist()
  },

  tick: (now) => {
    const prev = get().timer
    const timer = reduce(prev, { type: 'TICK', now })
    if (timer === prev) return
    set({ timer })
    if (prev.status === 'running' && timer.status === 'finished') {
      set({
        patrol: null,
        lightPatrol: null,
        leave: null,
        peek: null,
        catMessage: nextCatMessage(timer.failureReason === 'stars' ? 'fail' : 'complete'),
      })
    }
  },

  violation: (kind) => {
    const before = get().timer
    const timer = reduce(before, { type: 'VIOLATION', now: Date.now(), kind })
    if (timer === before) return
    // 免罚只挡「查岗超时」类，且只在真会扣星时才消耗。
    if (get().pardon && isTimeoutViolation(kind)) {
      set({
        patrol: null,
        lightPatrol: null,
        pardon: false,
        checkinStreak: 0,
        stamp: { id: (stampSeq += 1), kind: 'pardon' },
        catMessage: nextCatMessage('pardoned'),
      })
      return
    }
    set({
      timer,
      patrol: null,
      lightPatrol: null,
      checkinStreak: 0,
      stamp: { id: (stampSeq += 1), kind },
      catMessage: nextCatMessage(timer.stars === 0 ? 'fail' : 'violation'),
    })
    get().persist()
  },

  setPatrol: (deadline, anchor) => {
    const now = Date.now()
    peekSeq += 1
    set({
      patrol: { startedAt: now, deadline },
      peek: { id: peekSeq, anchor, tone: 'patrol', at: now },
      catMessage: nextCatMessage('patrol'),
    })
  },

  setLightPatrol: (deadline) => {
    set({ lightPatrol: { deadline } })
  },

  clearLightPatrol: () => set({ lightPatrol: null }),

  takeLeave: () => {
    const { timer } = get()
    if (timer.status !== 'running' || timer.phase !== 'focus') return
    set({
      leave: { until: Date.now() + LEAVE_MS },
      patrol: null,
      lightPatrol: null,
      peek: null,
      catMessage: nextCatMessage('leave'),
    })
  },

  returnEarly: () => set({ leave: null }),

  showPeek: (anchor, tone) => {
    peekSeq += 1
    set({ peek: { id: peekSeq, anchor, tone, at: Date.now() } })
  },

  dismissPeek: () => set({ peek: null }),

  ackPatrol: () => {
    if (!get().patrol) return
    const { checkinStreak, pardon } = get()
    const trust = advanceTrust(checkinStreak, pardon)
    set({
      patrol: null,
      peek: null,
      checkinStreak: trust.streak,
      pardon: trust.pardon,
      catMessage: nextCatMessage(trust.earned ? 'pardon' : 'approve'),
    })
  },

  clearPatrol: () => set({ patrol: null }),

  say: (tone) => set({ catMessage: nextCatMessage(tone) }),

  setResult: (result) => set({ result }),

  clearStamp: () => set({ stamp: null }),

  persist: () => {
    const { timer } = get()
    if (timer.status === 'idle' || timer.status === 'finished') {
      localRepository.clearActive()
    } else {
      localRepository.saveActive(timer)
    }
  },

  resetSession: () =>
    set({
      timer: timerFromSettings(readSettingsSnapshot()),
      patrol: null,
      lightPatrol: null,
      leave: null,
      checkinStreak: 0,
      pardon: false,
      peek: null,
      result: null,
    }),
}))

// 避免 store 初始化时与 useSettings 形成循环依赖：直接从 storage 读一次默认值。
function readSettingsSnapshot(): Settings {
  try {
    const raw = localStorage.getItem('lr.settings.v1')
    if (raw) return JSON.parse(raw) as Settings
  } catch {
    /* ignore */
  }
  return {
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
    supervisionEnabled: false,
    cameraWatch: false,
    backgroundMode: 'room',
    galleryId: 'image-01',
    galleryRotateMin: 10,
    galleryShuffle: false,
    ambienceId: 'rain',
    reducedMotion: 'system',
  }
}

export function buildDraftSession(timer: TimerState, settings: Settings): SessionDraft {
  const focusedSec = Math.round(timer.focusAccumMs / 1000)
  const plannedSec =
    timer.mode === 'stopwatch'
      ? 0
      : timer.mode === 'countdown'
        ? timer.focusSec
        : timer.focusSec * timer.totalRounds
  const status =
    timer.status !== 'finished'
      ? 'aborted'
      : timer.failureReason === 'stars'
        ? 'failed'
        : timer.failureReason === 'aborted'
          ? 'aborted'
          : 'completed'
  return {
    startedAt: timer.startedAt ?? Date.now(),
    endedAt: timer.endedAt ?? Date.now(),
    mode: timer.mode,
    scene: settings.scene,
    supervision: settings.supervision,
    plannedSec,
    focusedSec: Math.max(0, focusedSec),
    starsLeft: timer.stars,
    violations: timer.violations,
    status,
    failureReason: timer.failureReason,
  }
}
