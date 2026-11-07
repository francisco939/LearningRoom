import type { Mode, Phase, Status, Violation, ViolationKind } from './types'

export interface TimerState {
  mode: Mode
  phase: Phase
  status: Status
  round: number
  totalRounds: number
  focusSec: number
  breakSec: number
  autoStartBreak: boolean
  autoStartFocus: boolean
  startedAt: number | null
  endedAt: number | null
  phaseEndsAt: number | null
  pausedAt: number | null
  pausedTotalMs: number
  focusStartedAt: number | null
  focusPausedTotalMs: number
  focusAccumMs: number
  stars: number
  violations: Violation[]
  failureReason: 'stars' | 'aborted' | null
}

export type TimerEvent =
  | { type: 'START'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'SKIP'; now: number }
  | { type: 'END'; now: number }
  | { type: 'VIOLATION'; now: number; kind: ViolationKind; detail?: string }
  | { type: 'ABORT'; now: number }
  | { type: 'HYDRATE'; state: TimerState }

export interface TimerConfig {
  mode: Mode
  focusSec: number
  breakSec: number
  rounds: number
  autoStartBreak: boolean
  autoStartFocus: boolean
}

export const MAX_STARS = 3

export function createTimer(config: TimerConfig): TimerState {
  return {
    mode: config.mode,
    phase: 'idle',
    status: 'idle',
    round: 1,
    totalRounds: Math.max(1, config.rounds),
    focusSec: Math.max(1, config.focusSec),
    breakSec: Math.max(1, config.breakSec),
    autoStartBreak: config.autoStartBreak,
    autoStartFocus: config.autoStartFocus,
    startedAt: null,
    endedAt: null,
    phaseEndsAt: null,
    pausedAt: null,
    pausedTotalMs: 0,
    focusStartedAt: null,
    focusPausedTotalMs: 0,
    focusAccumMs: 0,
    stars: MAX_STARS,
    violations: [],
    failureReason: null,
  }
}

function beginPhase(
  state: TimerState,
  phase: Phase,
  now: number,
  durationSec: number,
  running: boolean,
): TimerState {
  return {
    ...state,
    phase,
    status: running ? 'running' : 'paused',
    phaseEndsAt: now + durationSec * 1000,
    pausedAt: running ? null : now,
    focusStartedAt: phase === 'focus' ? now : null,
    focusPausedTotalMs: 0,
  }
}

function finish(
  state: TimerState,
  now: number,
  failureReason: TimerState['failureReason'],
): TimerState {
  return {
    ...state,
    status: 'finished',
    phase: 'done',
    endedAt: now,
    phaseEndsAt: null,
    pausedAt: null,
    failureReason,
  }
}

export function reduce(state: TimerState, event: TimerEvent): TimerState {
  switch (event.type) {
    case 'HYDRATE':
      return event.state

    case 'START': {
      const fresh = createTimer({
        mode: state.mode,
        focusSec: state.focusSec,
        breakSec: state.breakSec,
        rounds: state.totalRounds,
        autoStartBreak: state.autoStartBreak,
        autoStartFocus: state.autoStartFocus,
      })
      return beginPhase(
        {
          ...fresh,
          startedAt: event.now,
          stars: MAX_STARS,
          violations: [],
        },
        'focus',
        event.now,
        state.focusSec,
        true,
      )
    }

    case 'PAUSE': {
      if (state.status !== 'running') return state
      return { ...state, status: 'paused', pausedAt: event.now }
    }

    case 'RESUME': {
      if (state.status !== 'paused' || state.phaseEndsAt === null) return state
      const delta = state.pausedAt ? event.now - state.pausedAt : 0
      return {
        ...state,
        status: 'running',
        phaseEndsAt: state.phaseEndsAt + delta,
        pausedAt: null,
        pausedTotalMs: state.pausedTotalMs + delta,
        focusPausedTotalMs:
          state.phase === 'focus' ? state.focusPausedTotalMs + delta : state.focusPausedTotalMs,
      }
    }

    case 'TICK': {
      if (state.status !== 'running' || state.phaseEndsAt === null) return state
      if (event.now < state.phaseEndsAt) return state

      if (state.phase === 'focus') {
        const focusAccumMs = state.focusAccumMs + state.focusSec * 1000
        if (state.mode === 'pomodoro' && state.round < state.totalRounds) {
          return beginPhase(
            { ...state, focusAccumMs },
            'break',
            event.now,
            state.breakSec,
            state.autoStartBreak,
          )
        }
        return finish({ ...state, focusAccumMs }, event.now, null)
      }

      if (state.phase === 'break') {
        return beginPhase(
          { ...state, round: state.round + 1, focusAccumMs: state.focusAccumMs },
          'focus',
          event.now,
          state.focusSec,
          state.autoStartFocus,
        )
      }
      return state
    }

    case 'SKIP': {
      if (state.status === 'idle' || state.status === 'finished') return state
      if (state.phase === 'focus') {
        const focusAccumMs = state.focusAccumMs + elapsedFocusMs(state, event.now)
        if (state.mode === 'pomodoro' && state.round < state.totalRounds) {
          return beginPhase(
            { ...state, focusAccumMs },
            'break',
            event.now,
            state.breakSec,
            state.autoStartBreak,
          )
        }
        return finish({ ...state, focusAccumMs }, event.now, null)
      }
      if (state.phase === 'break') {
        return beginPhase(
          { ...state, round: state.round + 1 },
          'focus',
          event.now,
          state.focusSec,
          state.autoStartFocus,
        )
      }
      return state
    }

    case 'END': {
      if (state.mode !== 'stopwatch' || state.status === 'finished') return state
      return finish({ ...state, focusAccumMs: elapsedFocusMs(state, event.now) }, event.now, null)
    }

    case 'VIOLATION': {
      if (state.status !== 'running' || state.phase !== 'focus') return state
      if (state.violations.some((v) => v.kind === event.kind && event.now - v.at < 30_000)) {
        return state
      }
      const stars = Math.max(0, state.stars - 1)
      const violations = [...state.violations, { at: event.now, kind: event.kind, detail: event.detail }]
      if (stars === 0) {
        return finish(
          { ...state, stars, violations, focusAccumMs: state.focusAccumMs + elapsedFocusMs(state, event.now) },
          event.now,
          'stars',
        )
      }
      return { ...state, stars, violations }
    }

    case 'ABORT': {
      if (state.status === 'finished') return state
      return finish(
        { ...state, focusAccumMs: state.focusAccumMs + elapsedFocusMs(state, event.now) },
        event.now,
        'aborted',
      )
    }

    default:
      return state
  }
}

export function elapsedFocusMs(state: TimerState, now: number): number {
  if (state.phase !== 'focus' || state.focusStartedAt === null) return 0
  const end = state.pausedAt ?? now
  const total = Math.max(0, end - state.focusStartedAt - state.focusPausedTotalMs)
  if (state.mode === 'stopwatch') return total
  return Math.min(total, state.focusSec * 1000)
}

export function totalFocusMs(state: TimerState, now: number): number {
  return state.focusAccumMs + elapsedFocusMs(state, now)
}

export function remainingSec(state: TimerState, now: number): number {
  if (state.mode === 'stopwatch' && state.phase === 'focus') {
    return Math.floor(totalFocusMs(state, now) / 1000)
  }
  if (state.phase === 'idle') return state.focusSec
  if (state.phaseEndsAt === null) return 0
  const end = state.pausedAt ?? now
  return Math.max(0, Math.ceil((state.phaseEndsAt - end) / 1000))
}

export function progressRatio(state: TimerState, now: number): number {
  if (state.phase === 'idle') return 0
  if (state.mode === 'stopwatch') {
    const cycle = 25 * 60 * 1000
    return Math.min(1, (totalFocusMs(state, now) % cycle) / cycle)
  }
  const duration = (state.phase === 'break' ? state.breakSec : state.focusSec) * 1000
  if (duration <= 0) return 0
  return Math.min(1, 1 - remainingSec(state, now) / (duration / 1000))
}

export function plannedSessionSec(state: TimerState): number {
  if (state.mode === 'stopwatch') return 0
  if (state.mode === 'countdown') return state.focusSec
  return state.focusSec * state.totalRounds + state.breakSec * Math.max(0, state.totalRounds - 1)
}

export function isFocusPhase(state: TimerState): boolean {
  return state.phase === 'focus' && state.status === 'running'
}
