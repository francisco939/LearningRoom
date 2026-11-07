import { describe, expect, it } from 'vitest'
import {
  createTimer,
  elapsedFocusMs,
  plannedSessionSec,
  progressRatio,
  reduce,
  remainingSec,
  totalFocusMs,
  type TimerConfig,
  type TimerState,
} from '@/lib/timer'

const T0 = 1_000_000

function makeTimer(overrides: Partial<TimerConfig> = {}): TimerState {
  return createTimer({
    mode: 'pomodoro',
    focusSec: 60,
    breakSec: 30,
    rounds: 2,
    autoStartBreak: true,
    autoStartFocus: true,
    ...overrides,
  })
}

function start(state: TimerState = makeTimer(), now = T0): TimerState {
  return reduce(state, { type: 'START', now })
}

describe('timer: start', () => {
  it('START 进入 running/focus，并从完整时长开始倒数', () => {
    const state = start()

    expect(state.status).toBe('running')
    expect(state.phase).toBe('focus')
    expect(state.startedAt).toBe(T0)
    expect(state.phaseEndsAt).toBe(T0 + 60_000)
    expect(state.stars).toBe(3)
    expect(state.round).toBe(1)
    expect(remainingSec(state, T0)).toBe(60)
  })

  it('剩余时间按时间戳计算，不依赖递减计数器', () => {
    const state = start()

    expect(remainingSec(state, T0 + 1_500)).toBe(59)
    expect(remainingSec(state, T0 + 59_999)).toBe(1)
    expect(remainingSec(state, T0 + 60_000)).toBe(0)
    expect(remainingSec(state, T0 + 999_999)).toBe(0)
  })

  it('START 会重置上一轮剩余的星星与违规记录', () => {
    let state = start()
    state = reduce(state, { type: 'VIOLATION', now: T0 + 1_000, kind: 'away' })
    state = reduce(state, { type: 'VIOLATION', now: T0 + 40_000, kind: 'away' })
    state = reduce(state, { type: 'VIOLATION', now: T0 + 80_000, kind: 'away' })
    expect(state.status).toBe('finished')

    const next = reduce(state, { type: 'START', now: T0 + 100_000 })
    expect(next.status).toBe('running')
    expect(next.stars).toBe(3)
    expect(next.violations).toEqual([])
    expect(next.failureReason).toBeNull()
  })
})

describe('timer: pause / resume', () => {
  it('PAUSE 冻结剩余时间，RESUME 顺延结束时间且不丢秒', () => {
    let state = start()

    state = reduce(state, { type: 'PAUSE', now: T0 + 10_000 })
    expect(state.status).toBe('paused')
    expect(state.pausedAt).toBe(T0 + 10_000)
    expect(remainingSec(state, T0 + 10_000)).toBe(50)
    expect(remainingSec(state, T0 + 40_000)).toBe(50)

    state = reduce(state, { type: 'RESUME', now: T0 + 30_000 })
    expect(state.status).toBe('running')
    expect(state.phaseEndsAt).toBe(T0 + 80_000)
    expect(remainingSec(state, T0 + 30_000)).toBe(50)
    expect(remainingSec(state, T0 + 50_000)).toBe(30)
    expect(elapsedFocusMs(state, T0 + 50_000)).toBe(30_000)
  })

  it('重复 PAUSE / 未暂停时 RESUME 是空操作', () => {
    const running = start()
    expect(reduce(running, { type: 'RESUME', now: T0 + 1_000 })).toBe(running)

    const paused = reduce(running, { type: 'PAUSE', now: T0 + 5_000 })
    expect(reduce(paused, { type: 'PAUSE', now: T0 + 6_000 })).toBe(paused)
  })
})

describe('timer: ticking through phases', () => {
  it('非最后一轮 focus 到点进入 break，break 到点进入下一轮 focus', () => {
    let state = start()

    state = reduce(state, { type: 'TICK', now: T0 + 60_000 })
    expect(state.phase).toBe('break')
    expect(state.status).toBe('running')
    expect(state.round).toBe(1)
    expect(state.focusAccumMs).toBe(60_000)
    expect(state.phaseEndsAt).toBe(T0 + 90_000)
    expect(remainingSec(state, T0 + 60_000)).toBe(30)

    state = reduce(state, { type: 'TICK', now: T0 + 90_000 })
    expect(state.phase).toBe('focus')
    expect(state.status).toBe('running')
    expect(state.round).toBe(2)
    expect(state.phaseEndsAt).toBe(T0 + 150_000)
    expect(remainingSec(state, T0 + 90_000)).toBe(60)
  })

  it('最后一轮 focus 到点结束为 finished/completed', () => {
    let state = start()
    state = reduce(state, { type: 'TICK', now: T0 + 60_000 })
    state = reduce(state, { type: 'TICK', now: T0 + 90_000 })
    state = reduce(state, { type: 'TICK', now: T0 + 150_000 })

    expect(state.status).toBe('finished')
    expect(state.phase).toBe('done')
    expect(state.endedAt).toBe(T0 + 150_000)
    expect(state.failureReason).toBeNull()
    expect(state.focusAccumMs).toBe(120_000)
    expect(state.phaseEndsAt).toBeNull()
  })

  it('到点前 TICK 不产生任何变化', () => {
    const state = start()
    expect(reduce(state, { type: 'TICK', now: T0 + 59_999 })).toBe(state)
  })

  it('autoStartBreak=false 时 focus 结束后停在 paused，RESUME 顺延', () => {
    let state = start(makeTimer({ autoStartBreak: false }))
    state = reduce(state, { type: 'TICK', now: T0 + 60_000 })

    expect(state.phase).toBe('break')
    expect(state.status).toBe('paused')
    expect(state.pausedAt).toBe(T0 + 60_000)
    expect(state.phaseEndsAt).toBe(T0 + 90_000)

    state = reduce(state, { type: 'RESUME', now: T0 + 70_000 })
    expect(state.status).toBe('running')
    expect(state.phaseEndsAt).toBe(T0 + 100_000)
    expect(remainingSec(state, T0 + 70_000)).toBe(30)
  })

  it('autoStartFocus=false 时 break 结束后停在 paused', () => {
    let state = start(makeTimer({ autoStartFocus: false }))
    state = reduce(state, { type: 'TICK', now: T0 + 60_000 })
    expect(state.phase).toBe('break')
    expect(state.status).toBe('running')

    state = reduce(state, { type: 'TICK', now: T0 + 90_000 })
    expect(state.phase).toBe('focus')
    expect(state.status).toBe('paused')
    expect(state.round).toBe(2)
    expect(state.pausedAt).toBe(T0 + 90_000)
    expect(remainingSec(state, T0 + 100_000)).toBe(60)
  })
})

describe('timer: skip', () => {
  it('focus 中 SKIP 收集已专注时长并进入 break', () => {
    let state = start()
    state = reduce(state, { type: 'SKIP', now: T0 + 5_000 })

    expect(state.phase).toBe('break')
    expect(state.round).toBe(1)
    expect(state.focusAccumMs).toBe(5_000)
    expect(remainingSec(state, T0 + 5_000)).toBe(30)
  })

  it('break 中 SKIP 进入下一轮 focus', () => {
    let state = start()
    state = reduce(state, { type: 'SKIP', now: T0 + 5_000 })
    state = reduce(state, { type: 'SKIP', now: T0 + 6_000 })

    expect(state.phase).toBe('focus')
    expect(state.round).toBe(2)
    expect(remainingSec(state, T0 + 6_000)).toBe(60)
  })

  it('最后一轮 focus 中 SKIP 直接结束，且保留已专注时长', () => {
    let state = start(makeTimer({ rounds: 1 }))
    state = reduce(state, { type: 'SKIP', now: T0 + 5_000 })

    expect(state.status).toBe('finished')
    expect(state.failureReason).toBeNull()
    expect(state.focusAccumMs).toBe(5_000)
  })

  it('idle / finished 状态下 SKIP 是空操作', () => {
    const idle = makeTimer()
    expect(reduce(idle, { type: 'SKIP', now: T0 })).toBe(idle)

    let finished = start(makeTimer({ rounds: 1 }))
    finished = reduce(finished, { type: 'SKIP', now: T0 + 1_000 })
    expect(reduce(finished, { type: 'SKIP', now: T0 + 2_000 })).toBe(finished)
  })
})

describe('timer: violations', () => {
  it('每次违规扣一颗星并记录，3 次后 failed', () => {
    let state = start()

    state = reduce(state, { type: 'VIOLATION', now: T0 + 5_000, kind: 'away' })
    expect(state.stars).toBe(2)
    expect(state.violations).toHaveLength(1)

    state = reduce(state, { type: 'VIOLATION', now: T0 + 10_000, kind: 'no-checkin' })
    expect(state.stars).toBe(1)
    expect(state.violations).toHaveLength(2)

    state = reduce(state, { type: 'VIOLATION', now: T0 + 40_000, kind: 'away' })
    expect(state.stars).toBe(0)
    expect(state.status).toBe('finished')
    expect(state.failureReason).toBe('stars')
    expect(state.violations).toHaveLength(3)
    expect(state.focusAccumMs).toBe(40_000)
  })

  it('30 秒内同类违规只扣一次，不同类不受此冷却影响', () => {
    let state = start()
    state = reduce(state, { type: 'VIOLATION', now: T0 + 5_000, kind: 'away' })
    const afterFirst = state

    state = reduce(state, { type: 'VIOLATION', now: T0 + 20_000, kind: 'away' })
    expect(state).toBe(afterFirst)
    expect(state.stars).toBe(2)

    state = reduce(state, { type: 'VIOLATION', now: T0 + 20_000, kind: 'no-checkin' })
    expect(state.stars).toBe(1)
    expect(state.violations).toHaveLength(2)
  })

  it('超过 30 秒后同类违规重新生效', () => {
    let state = start()
    state = reduce(state, { type: 'VIOLATION', now: T0 + 5_000, kind: 'away' })
    state = reduce(state, { type: 'VIOLATION', now: T0 + 35_000, kind: 'away' })

    expect(state.stars).toBe(1)
    expect(state.violations).toHaveLength(2)
  })

  it('非 running / 非 focus 阶段忽略违规', () => {
    const idle = makeTimer()
    expect(reduce(idle, { type: 'VIOLATION', now: T0, kind: 'away' })).toBe(idle)

    const paused = reduce(start(), { type: 'PAUSE', now: T0 + 5_000 })
    expect(reduce(paused, { type: 'VIOLATION', now: T0 + 6_000, kind: 'away' })).toBe(paused)

    let onBreak = start()
    onBreak = reduce(onBreak, { type: 'TICK', now: T0 + 60_000 })
    expect(reduce(onBreak, { type: 'VIOLATION', now: T0 + 61_000, kind: 'away' })).toBe(onBreak)
  })
})

describe('timer: abort', () => {
  it('ABORT 结束为 aborted，并保留已专注时长', () => {
    let state = start()
    state = reduce(state, { type: 'ABORT', now: T0 + 20_000 })

    expect(state.status).toBe('finished')
    expect(state.phase).toBe('done')
    expect(state.failureReason).toBe('aborted')
    expect(state.focusAccumMs).toBe(20_000)
    expect(totalFocusMs(state, T0 + 20_000)).toBe(20_000)
  })

  it('暂停中 ABORT 只结算暂停前的时间', () => {
    let state = start()
    state = reduce(state, { type: 'PAUSE', now: T0 + 10_000 })
    state = reduce(state, { type: 'ABORT', now: T0 + 30_000 })

    expect(state.focusAccumMs).toBe(10_000)
  })

  it('已结束的会话再次 ABORT 不变', () => {
    let state = start()
    state = reduce(state, { type: 'ABORT', now: T0 + 20_000 })
    expect(reduce(state, { type: 'ABORT', now: T0 + 30_000 })).toBe(state)
  })
})

describe('timer: stopwatch', () => {
  it('running 时 remainingSec 是累计秒，END 结算累计时长', () => {
    let state = start(makeTimer({ mode: 'stopwatch' }))

    expect(remainingSec(state, T0)).toBe(0)
    expect(remainingSec(state, T0 + 5_000)).toBe(5)
    expect(remainingSec(state, T0 + 5_900)).toBe(5)

    state = reduce(state, { type: 'END', now: T0 + 12_500 })
    expect(state.status).toBe('finished')
    expect(state.failureReason).toBeNull()
    expect(state.focusAccumMs).toBe(12_500)
    expect(totalFocusMs(state, T0 + 20_000)).toBe(12_500)
  })

  it('END 对非秒表模式无效', () => {
    const state = start()
    expect(reduce(state, { type: 'END', now: T0 + 1_000 })).toBe(state)
  })
})

describe('timer: reload / hydrate', () => {
  it('序列化恢复后继续 TICK，与未中断的状态一致，不漂移', () => {
    const original = start()
    const halfway = reduce(original, { type: 'TICK', now: T0 + 30_000 })
    const restored = JSON.parse(JSON.stringify(halfway)) as TimerState

    expect(remainingSec(restored, T0 + 45_000)).toBe(15)

    const fromRestored = reduce(restored, { type: 'TICK', now: T0 + 60_000 })
    const fromOriginal = reduce(halfway, { type: 'TICK', now: T0 + 60_000 })

    expect(fromRestored).toEqual(fromOriginal)
    expect(fromRestored.phase).toBe('break')
    expect(fromRestored.phaseEndsAt).toBe(T0 + 90_000)
  })

  it('HYDRATE 原样返回注入的状态', () => {
    const state = start()
    expect(reduce(makeTimer(), { type: 'HYDRATE', state })).toBe(state)
  })

  it('暂停后刷新恢复，RESUME 仍按暂停点顺延', () => {
    let state = start()
    state = reduce(state, { type: 'PAUSE', now: T0 + 10_000 })
    const restored = JSON.parse(JSON.stringify(state)) as TimerState

    const resumed = reduce(restored, { type: 'RESUME', now: T0 + 30_000 })
    expect(resumed.phaseEndsAt).toBe(T0 + 80_000)
    expect(remainingSec(resumed, T0 + 50_000)).toBe(30)
  })
})

describe('timer: aggregate focus time', () => {
  it('break 阶段只累计已完成的专注时段', () => {
    let state = start()
    state = reduce(state, { type: 'TICK', now: T0 + 60_000 })

    expect(state.phase).toBe('break')
    expect(totalFocusMs(state, T0 + 75_000)).toBe(60_000)
  })

  it('第一轮 focus 中 ABORT 只保留真实经过的时间', () => {
    let state = start()
    state = reduce(state, { type: 'ABORT', now: T0 + 20_000 })
    expect(state.focusAccumMs).toBe(20_000)
  })

  // 已知缺陷：elapsedFocusMs 用整场 startedAt 计算，进入第二轮后会把
  // 第一轮 focus + 整段 break 也算成当前 focus，导致 totalFocusMs 立刻翻倍。
  // 期望值为 60_000，实际为 120_000（详见测试报告）。
  it('回归：跨 break 进入下一轮后 totalFocusMs 不应立刻翻倍', () => {
    let state = start()
    state = reduce(state, { type: 'TICK', now: T0 + 60_000 })
    state = reduce(state, { type: 'TICK', now: T0 + 90_000 })

    expect(totalFocusMs(state, T0 + 90_000)).toBe(60_000)
  })

  // 同一根因：第二轮只过了 5 秒就 ABORT，却结算了整整 60 秒。
  it('回归：第二轮 ABORT 不应把整轮 focus 都计入', () => {
    let state = start()
    state = reduce(state, { type: 'TICK', now: T0 + 60_000 })
    state = reduce(state, { type: 'TICK', now: T0 + 90_000 })
    state = reduce(state, { type: 'ABORT', now: T0 + 95_000 })

    expect(state.focusAccumMs).toBe(65_000)
  })
})

describe('timer: derived values', () => {
  it('plannedSessionSec 按模式给出计划专注时长', () => {
    expect(plannedSessionSec(makeTimer())).toBe(150)
    expect(plannedSessionSec(makeTimer({ mode: 'countdown', rounds: 4 }))).toBe(60)
    expect(plannedSessionSec(makeTimer({ mode: 'stopwatch' }))).toBe(0)
  })

  it('progressRatio 在专注阶段按比例推进，idle 为 0', () => {
    expect(progressRatio(makeTimer(), T0)).toBe(0)

    let state = start()
    expect(progressRatio(state, T0 + 30_000)).toBeCloseTo(0.5, 2)

    state = reduce(state, { type: 'TICK', now: T0 + 60_000 })
    expect(progressRatio(state, T0 + 60_000)).toBe(0)
    expect(progressRatio(state, T0 + 75_000)).toBeCloseTo(0.5, 2)
  })
})
