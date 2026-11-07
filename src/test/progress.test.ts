import { describe, expect, it } from 'vitest'
import { commitSession } from '@/lib/progress'
import { dayKey, previousDayKey, streakAfter } from '@/lib/stats'
import { buildSession, fishFor, type SessionDraft } from '@/lib/session'
import { defaultProgress } from '@/lib/storage'
import type { Progress, Session, SessionStatus } from '@/lib/types'

const at = (y: number, m: number, d: number, h = 12, min = 0): number =>
  new Date(y, m - 1, d, h, min, 0, 0).getTime()

function baseProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    ...defaultProgress,
    achievements: {},
    scenesUsed: [],
    ...overrides,
    version: 1,
  }
}

function makeSession(overrides: Partial<Session> = {}): Session {
  const focusedSec = overrides.focusedSec ?? 1500
  const status: SessionStatus = overrides.status ?? 'completed'
  const starsLeft = overrides.starsLeft ?? 3
  return {
    id: 'session-1',
    startedAt: at(2026, 1, 10, 9),
    endedAt: at(2026, 1, 10, 12),
    mode: 'pomodoro',
    scene: 'rainy-study',
    supervision: 'standard',
    plannedSec: 1500,
    focusedSec,
    starsLeft,
    violations: [],
    status,
    fishEarned: fishFor(status, focusedSec, starsLeft),
    ...overrides,
  }
}

describe('fish formula', () => {
  it('completed：每 10 分钟一条，外加剩余星数', () => {
    expect(fishFor('completed', 1500, 3)).toBe(5)
    expect(fishFor('completed', 600, 2)).toBe(3)
    expect(fishFor('completed', 0, 0)).toBe(0)
    expect(fishFor('completed', 599, 3)).toBe(3)
  })

  it('aborted：每 20 分钟一条，无星级奖励', () => {
    expect(fishFor('aborted', 1500, 3)).toBe(1)
    expect(fishFor('aborted', 1199, 3)).toBe(0)
    expect(fishFor('aborted', 1200, 3)).toBe(1)
    expect(fishFor('aborted', 3600, 0)).toBe(3)
  })

  it('failed：没有鱼干', () => {
    expect(fishFor('failed', 1500, 3)).toBe(0)
    expect(fishFor('failed', 0, 0)).toBe(0)
  })

  it('buildSession 会结算 fishEarned 并取整专注秒数', () => {
    const draft: SessionDraft = {
      startedAt: at(2026, 1, 10, 9),
      endedAt: at(2026, 1, 10, 9, 30),
      mode: 'pomodoro',
      scene: 'rainy-study',
      supervision: 'standard',
      plannedSec: 1500,
      focusedSec: 1500.6,
      starsLeft: 2,
      violations: [],
      status: 'completed',
      failureReason: null,
    }

    const session = buildSession(draft, 'fixed-id')
    expect(session.id).toBe('fixed-id')
    expect(session.focusedSec).toBe(1501)
    expect(session.fishEarned).toBe(4)
  })
})

describe('business day', () => {
  it('04:00 前属于前一天，04:00 起属于新一天', () => {
    expect(dayKey(at(2026, 1, 10, 3, 59))).toBe('2026-01-09')
    expect(dayKey(at(2026, 1, 10, 4, 0))).toBe('2026-01-10')
    expect(dayKey(at(2026, 1, 10, 4, 1))).toBe('2026-01-10')
    expect(dayKey(at(2026, 1, 10, 0, 30))).toBe('2026-01-09')
  })

  it('previousDayKey 跨月与跨年正确', () => {
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31')
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28')
    expect(previousDayKey('2026-01-10')).toBe('2026-01-09')
  })
})

describe('streak', () => {
  it('首次完成为 1', () => {
    expect(streakAfter(null, '2026-01-10', 0)).toBe(1)
    expect(streakAfter(null, '2026-01-10', 4)).toBe(1)
  })

  it('同一天不涨，连续一天 +1，断档重置为 1', () => {
    expect(streakAfter('2026-01-10', '2026-01-10', 5)).toBe(5)
    expect(streakAfter('2026-01-09', '2026-01-10', 5)).toBe(6)
    expect(streakAfter('2026-01-08', '2026-01-10', 5)).toBe(1)
    expect(streakAfter('2026-01-01', '2026-01-10', 5)).toBe(1)
  })
})

describe('commitSession: core counters', () => {
  it('首场完成会累计时长、鱼干、连续天数，并解锁基础成就', () => {
    const result = commitSession(makeSession(), baseProgress())
    const p = result.progress

    expect(result.fishEarned).toBe(5)
    expect(p.totalFocusSec).toBe(1500)
    expect(p.totalSessions).toBe(1)
    expect(p.completedSessions).toBe(1)
    expect(p.failedSessions).toBe(0)
    expect(p.fish).toBe(5)
    expect(p.streak).toBe(1)
    expect(p.lastCompletedDay).toBe('2026-01-10')
    expect(p.scenesUsed).toEqual(['rainy-study'])
    expect(result.unlocked).toContain('first-session')
    expect(result.unlocked).toContain('first-pomodoro')
    expect(result.unlocked).toContain('clean-session')
    expect(result.unlocked).not.toContain('strict-clean')
  })

  it('同一天再完成一场不增加连续天数', () => {
    const first = commitSession(makeSession(), baseProgress())
    const second = commitSession(
      makeSession({ id: 'session-2', endedAt: at(2026, 1, 10, 18) }),
      first.progress,
    )

    expect(second.progress.streak).toBe(1)
    expect(second.progress.completedSessions).toBe(2)
    expect(second.progress.fish).toBe(10)
    expect(second.progress.lastCompletedDay).toBe('2026-01-10')
  })

  it('连续两天完成，streak 变为 2', () => {
    const first = commitSession(makeSession(), baseProgress())
    const second = commitSession(
      makeSession({ id: 'session-2', endedAt: at(2026, 1, 11, 12) }),
      first.progress,
    )

    expect(second.progress.streak).toBe(2)
    expect(second.progress.bestStreak).toBe(2)
    expect(second.progress.lastCompletedDay).toBe('2026-01-11')
  })

  it('隔天断档后重置为 1', () => {
    const prev = baseProgress({
      lastCompletedDay: '2026-01-01',
      streak: 4,
      bestStreak: 4,
      completedSessions: 4,
    })
    const result = commitSession(
      makeSession({ endedAt: at(2026, 1, 5, 12) }),
      prev,
    )

    expect(result.progress.streak).toBe(1)
    expect(result.progress.bestStreak).toBe(4)
  })

  it('失败场次计入总数但不加连续天数、不发鱼干', () => {
    const prev = baseProgress({
      completedSessions: 3,
      streak: 5,
      lastCompletedDay: '2026-01-10',
      fish: 10,
      totalFocusSec: 1000,
    })
    const result = commitSession(
      makeSession({
        status: 'failed',
        endedAt: at(2026, 1, 11, 12),
        focusedSec: 900,
        fishEarned: 0,
      }),
      prev,
    )

    expect(result.progress.totalSessions).toBe(prev.totalSessions + 1)
    expect(result.progress.failedSessions).toBe(1)
    expect(result.progress.completedSessions).toBe(3)
    expect(result.progress.streak).toBe(5)
    expect(result.progress.lastCompletedDay).toBe('2026-01-10')
    expect(result.progress.fish).toBe(10)
    expect(result.progress.totalFocusSec).toBe(1900)
  })

  it('主动中止按半速发鱼干，且不计完成数与连续天数', () => {
    const result = commitSession(
      makeSession({ status: 'aborted', focusedSec: 1500, endedAt: at(2026, 1, 10, 12) }),
      baseProgress(),
    )

    expect(result.fishEarned).toBe(1)
    expect(result.progress.fish).toBe(1)
    expect(result.progress.completedSessions).toBe(0)
    expect(result.progress.streak).toBe(0)
    expect(result.progress.totalSessions).toBe(1)
  })
})

describe('commitSession: achievements', () => {
  it('严格模式三星完成解锁 strict-clean', () => {
    const result = commitSession(makeSession({ supervision: 'strict' }), baseProgress())
    expect(result.unlocked).toContain('strict-clean')
  })

  it('连续 3 天完成解锁 streak-3', () => {
    let progress = baseProgress()
    let unlocked: string[] = []

    for (const day of [10, 11, 12]) {
      const result = commitSession(
        makeSession({ id: `day-${day}`, endedAt: at(2026, 1, day, 12) }),
        progress,
      )
      progress = result.progress
      unlocked = result.unlocked
    }

    expect(progress.streak).toBe(3)
    expect(unlocked).toContain('streak-3')
    expect(unlocked).not.toContain('streak-7')
  })

  it('三个场景都完成后解锁 all-scenes', () => {
    const prev = baseProgress({ scenesUsed: ['rainy-study', 'dusk-library'] })
    const result = commitSession(
      makeSession({ scene: 'dawn-desk', supervision: 'lenient' }),
      prev,
    )

    expect(result.progress.scenesUsed).toEqual(['rainy-study', 'dusk-library', 'dawn-desk'])
    expect(result.unlocked).toContain('all-scenes')
  })

  it('累计鱼干跨过 100 解锁 fish-100', () => {
    const prev = baseProgress({ fish: 99, completedSessions: 3 })
    const result = commitSession(makeSession({ focusedSec: 1500 }), prev)

    expect(result.progress.fish).toBe(104)
    expect(result.unlocked).toContain('fish-100')
  })

  it('已解锁的成就不重复解锁，时间戳保持不变', () => {
    const first = commitSession(makeSession(), baseProgress())
    const unlockedAt = first.progress.achievements['first-session']
    expect(unlockedAt).toBeTypeOf('number')

    const second = commitSession(
      makeSession({ id: 'session-2', endedAt: at(2026, 1, 10, 18) }),
      first.progress,
    )

    expect(second.unlocked).not.toContain('first-session')
    expect(second.unlocked).not.toContain('clean-session')
    expect(second.progress.achievements['first-session']).toBe(unlockedAt)
  })

  it('失败场次不会解锁 first-session', () => {
    const result = commitSession(makeSession({ status: 'failed', starsLeft: 0 }), baseProgress())
    expect(result.unlocked).not.toContain('first-session')
  })
})

describe('commitSession: regressions', () => {
  // 回归：只有完成的场次才计入「三个房间」的场景集合。
  it('回归：中止场次不应计入 all-scenes 的场景集合', () => {
    const prev = baseProgress({ scenesUsed: ['rainy-study', 'dusk-library'] })
    const result = commitSession(makeSession({ scene: 'dawn-desk', status: 'aborted' }), prev)

    expect(result.progress.scenesUsed).not.toContain('dawn-desk')
  })

  // 回归：strict-clean 只对完成的场次生效。
  it('回归：中止场次不应解锁 strict-clean', () => {
    const result = commitSession(
      makeSession({ supervision: 'strict', status: 'aborted' }),
      baseProgress(),
    )

    expect(result.unlocked).not.toContain('strict-clean')
  })

  // 回归：night-owl / early-bird 只对完成的场次生效。
  it('回归：中止场次不应解锁 night-owl', () => {
    const result = commitSession(
      makeSession({ status: 'aborted', endedAt: at(2026, 1, 10, 1, 30) }),
      baseProgress(),
    )

    expect(result.unlocked).not.toContain('night-owl')
  })
})
