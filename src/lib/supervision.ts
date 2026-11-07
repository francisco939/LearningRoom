import type { SupervisionMode } from './types'

export interface SupervisionConfig {
  patrolMinMs: number
  patrolMaxMs: number
  awayGraceMs: number
  checkInMs: number
  idleMs: number
}

export const SUPERVISION_CONFIG: Record<SupervisionMode, SupervisionConfig> = {
  lenient: {
    patrolMinMs: 8 * 60_000,
    patrolMaxMs: 15 * 60_000,
    awayGraceMs: 90_000,
    checkInMs: 20_000,
    idleMs: 10 * 60_000,
  },
  standard: {
    patrolMinMs: 4 * 60_000,
    patrolMaxMs: 8 * 60_000,
    awayGraceMs: 45_000,
    checkInMs: 15_000,
    idleMs: 5 * 60_000,
  },
  strict: {
    patrolMinMs: 2 * 60_000,
    patrolMaxMs: 4 * 60_000,
    awayGraceMs: 20_000,
    checkInMs: 10_000,
    idleMs: 2 * 60_000,
  },
}

export const FIRST_PATROL_MIN_MS = 60_000
export const FIRST_PATROL_MAX_MS = 120_000
export const VIOLATION_COOLDOWN_MS = 30_000

export function configFor(mode: SupervisionMode): SupervisionConfig {
  return SUPERVISION_CONFIG[mode]
}

export function nextPatrolAt(now: number, cfg: SupervisionConfig, first = false): number {
  const min = first ? FIRST_PATROL_MIN_MS : cfg.patrolMinMs
  const max = first ? FIRST_PATROL_MAX_MS : cfg.patrolMaxMs
  return now + min + Math.random() * Math.max(0, max - min)
}

export function judgeAway(hiddenMs: number, cfg: SupervisionConfig): boolean {
  return hiddenMs > cfg.awayGraceMs
}

export function withinCooldown(lastAt: number | undefined, now: number): boolean {
  return lastAt !== undefined && now - lastAt < VIOLATION_COOLDOWN_MS
}
