import { describe, expect, it } from 'vitest'
import { createTimer, reduce, type TimerConfig, type TimerState } from '@/lib/timer'
import { defaultSettings } from '@/lib/storage'
import type { Settings } from '@/lib/types'
import { buildDraftSession } from '@/store/useSession'

const T0 = 2_000_000

const settings: Settings = {
  ...defaultSettings,
  scene: 'dusk-library',
  supervision: 'strict',
}

function makeTimer(overrides: Partial<TimerConfig> = {}): TimerState {
  return createTimer({
    mode: 'pomodoro',
    focusSec: 60,
    breakSec: 30,
    rounds: 1,
    autoStartBreak: true,
    autoStartFocus: true,
    ...overrides,
  })
}

function start(state: TimerState = makeTimer()): TimerState {
  return reduce(state, { type: 'START', now: T0 })
}

describe('buildDraftSession: status mapping', () => {
  it('正常结束映射为 completed，并带出场景与监督模式', () => {
    let timer = start()
    timer = reduce(timer, { type: 'TICK', now: T0 + 60_000 })

    const draft = buildDraftSession(timer, settings)

    expect(draft.status).toBe('completed')
    expect(draft.scene).toBe('dusk-library')
    expect(draft.supervision).toBe('strict')
    expect(draft.startedAt).toBe(T0)
    expect(draft.endedAt).toBe(T0 + 60_000)
    expect(draft.starsLeft).toBe(3)
    expect(draft.violations).toEqual([])
    expect(draft.failureReason).toBeNull()
  })

  it('三星扣光映射为 failed，并保留违规记录', () => {
    let timer = start()
    timer = reduce(timer, { type: 'VIOLATION', now: T0 + 1_000, kind: 'away' })
    timer = reduce(timer, { type: 'VIOLATION', now: T0 + 40_000, kind: 'away' })
    timer = reduce(timer, { type: 'VIOLATION', now: T0 + 80_000, kind: 'away' })

    const draft = buildDraftSession(timer, settings)

    expect(timer.status).toBe('finished')
    expect(draft.status).toBe('failed')
    expect(draft.starsLeft).toBe(0)
    expect(draft.violations).toHaveLength(3)
    expect(draft.focusedSec).toBe(60)
  })

  it('主动中止映射为 aborted', () => {
    let timer = start()
    timer = reduce(timer, { type: 'ABORT', now: T0 + 20_000 })

    const draft = buildDraftSession(timer, settings)

    expect(draft.status).toBe('aborted')
    expect(draft.focusedSec).toBe(20)
  })
})

describe('buildDraftSession: focusedSec and plannedSec', () => {
  it('focusedSec 来自 focusAccumMs，不包含 break 与暂停时间', () => {
    let timer = start(makeTimer({ focusSec: 60, breakSec: 30, rounds: 2 }))
    timer = reduce(timer, { type: 'TICK', now: T0 + 60_000 })
    timer = reduce(timer, { type: 'TICK', now: T0 + 90_000 })
    timer = reduce(timer, { type: 'TICK', now: T0 + 150_000 })

    const draft = buildDraftSession(timer, settings)

    // 墙钟是 150 秒（60 专注 + 30 休息 + 60 专注），只应结算 120 秒专注。
    expect(draft.status).toBe('completed')
    expect(draft.focusedSec).toBe(120)
    expect(draft.plannedSec).toBe(120)
  })

  it('countdown 的 plannedSec 是单段专注时长', () => {
    let timer = start(makeTimer({ mode: 'countdown', focusSec: 60, rounds: 4 }))
    timer = reduce(timer, { type: 'TICK', now: T0 + 60_000 })

    const draft = buildDraftSession(timer, settings)
    expect(draft.plannedSec).toBe(60)
    expect(draft.focusedSec).toBe(60)
  })

  it('stopwatch 的 plannedSec 为 0，focusedSec 为实际计时', () => {
    let timer = start(makeTimer({ mode: 'stopwatch' }))
    timer = reduce(timer, { type: 'END', now: T0 + 12_000 })

    const draft = buildDraftSession(timer, settings)
    expect(draft.plannedSec).toBe(0)
    expect(draft.focusedSec).toBe(12)
    expect(draft.status).toBe('completed')
  })

  it('focusedSec 四舍五入到秒并夹到非负', () => {
    let timer = start(makeTimer({ focusSec: 61, rounds: 1 }))
    timer = reduce(timer, { type: 'ABORT', now: T0 + 1_900 })

    const draft = buildDraftSession(timer, settings)
    expect(draft.focusedSec).toBe(2)
    expect(draft.focusedSec).toBeGreaterThanOrEqual(0)
  })
})
