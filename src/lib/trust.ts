import type { ViolationKind } from './types'

export const TRUST_STREAK = 3

export interface TrustState {
  streak: number
  pardon: boolean
  earned: boolean
}

/**
 * 连续成功应声推进信任值：攒满 TRUST_STREAK 次获得一次「免罚」并清零。
 * 已持有免罚时不再累计（也不能再获得）。
 */
export function advanceTrust(streak: number, pardon: boolean): TrustState {
  if (pardon) return { streak, pardon, earned: false }
  const next = streak + 1
  if (next >= TRUST_STREAK) return { streak: 0, pardon: true, earned: true }
  return { streak: next, pardon: false, earned: false }
}

/** 免罚只挡「查岗超时」类（未应声 / 摄像头看不到你），不挡离座。 */
export function isTimeoutViolation(kind: ViolationKind): boolean {
  return kind === 'no-checkin' || kind === 'absent'
}
