import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FIRST_PATROL_MAX_MS,
  FIRST_PATROL_MIN_MS,
  SUPERVISION_CONFIG,
  VIOLATION_COOLDOWN_MS,
  configFor,
  judgeAway,
  nextPatrolAt,
  withinCooldown,
} from '@/lib/supervision'

const T0 = 5_000_000

afterEach(() => {
  vi.restoreAllMocks()
})

describe('supervision: config', () => {
  it('三档巡查间隔都满足 min < max', () => {
    for (const mode of ['lenient', 'standard', 'strict'] as const) {
      const cfg = configFor(mode)
      expect(cfg.patrolMinMs).toBeGreaterThan(0)
      expect(cfg.patrolMaxMs).toBeGreaterThan(cfg.patrolMinMs)
    }
  })

  it('从宽松到严格，巡查更频繁、宽限更短、查岗更急、闲置阈值更低', () => {
    const { lenient, standard, strict } = SUPERVISION_CONFIG

    expect(lenient.patrolMinMs).toBeGreaterThan(standard.patrolMinMs)
    expect(standard.patrolMinMs).toBeGreaterThan(strict.patrolMinMs)

    expect(lenient.patrolMaxMs).toBeGreaterThan(standard.patrolMaxMs)
    expect(standard.patrolMaxMs).toBeGreaterThan(strict.patrolMaxMs)

    expect(lenient.awayGraceMs).toBeGreaterThan(standard.awayGraceMs)
    expect(standard.awayGraceMs).toBeGreaterThan(strict.awayGraceMs)

    expect(lenient.checkInMs).toBeGreaterThan(standard.checkInMs)
    expect(standard.checkInMs).toBeGreaterThan(strict.checkInMs)

    expect(lenient.idleMs).toBeGreaterThan(standard.idleMs)
    expect(standard.idleMs).toBeGreaterThan(strict.idleMs)
  })

  it('configFor 返回与配置表一致的引用', () => {
    expect(configFor('standard')).toBe(SUPERVISION_CONFIG.standard)
  })
})

describe('supervision: nextPatrolAt', () => {
  it('随机数为 0 时落在区间下界', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const cfg = configFor('standard')
    expect(nextPatrolAt(T0, cfg)).toBe(T0 + cfg.patrolMinMs)
  })

  it('随机数接近 1 时落在区间上界附近且不超过上界', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)

    const cfg = configFor('strict')
    const at = nextPatrolAt(T0, cfg)
    expect(at).toBeGreaterThan(T0 + cfg.patrolMinMs)
    expect(at).toBeLessThanOrEqual(T0 + cfg.patrolMaxMs)
  })

  it('first=true 时首轮巡查固定在 60–120 秒', () => {
    const cfg = configFor('lenient')

    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(nextPatrolAt(T0, cfg, true)).toBe(T0 + FIRST_PATROL_MIN_MS)

    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const middle = nextPatrolAt(T0, cfg, true)
    expect(middle).toBeGreaterThanOrEqual(T0 + FIRST_PATROL_MIN_MS)
    expect(middle).toBeLessThanOrEqual(T0 + FIRST_PATROL_MAX_MS)

    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const upper = nextPatrolAt(T0, cfg, true)
    expect(upper).toBeGreaterThanOrEqual(T0 + FIRST_PATROL_MIN_MS)
    expect(upper).toBeLessThanOrEqual(T0 + FIRST_PATROL_MAX_MS)
  })

  it('不同模式的首轮巡查使用同一段 60–120 秒，不随档位变化', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25)

    const lenient = nextPatrolAt(T0, configFor('lenient'), true)
    const strict = nextPatrolAt(T0, configFor('strict'), true)
    expect(lenient).toBe(strict)
  })
})

describe('supervision: judgeAway', () => {
  it('超过宽限才算离开，等于宽限不算', () => {
    const cfg = configFor('standard')

    expect(judgeAway(0, cfg)).toBe(false)
    expect(judgeAway(cfg.awayGraceMs - 1, cfg)).toBe(false)
    expect(judgeAway(cfg.awayGraceMs, cfg)).toBe(false)
    expect(judgeAway(cfg.awayGraceMs + 1, cfg)).toBe(true)
  })

  it('严格模式的宽限比宽松模式更容易触发', () => {
    const standard = configFor('standard')
    const strict = configFor('strict')

    expect(judgeAway(30_000, standard)).toBe(false)
    expect(judgeAway(30_000, strict)).toBe(true)
  })
})

describe('supervision: withinCooldown', () => {
  it('没有上次记录时不处于冷却', () => {
    expect(withinCooldown(undefined, T0)).toBe(false)
  })

  it('30 秒内为冷却，正好 30 秒及以后解除', () => {
    expect(withinCooldown(T0, T0 + 1)).toBe(true)
    expect(withinCooldown(T0, T0 + VIOLATION_COOLDOWN_MS - 1)).toBe(true)
    expect(withinCooldown(T0, T0 + VIOLATION_COOLDOWN_MS)).toBe(false)
    expect(withinCooldown(T0, T0 + VIOLATION_COOLDOWN_MS + 1)).toBe(false)
  })
})
