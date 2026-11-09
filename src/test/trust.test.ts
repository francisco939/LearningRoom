import { describe, expect, it } from 'vitest'
import { TRUST_STREAK, advanceTrust, isTimeoutViolation } from '@/lib/trust'

describe('trust: advanceTrust', () => {
  it('无免罚时逐次递增，未满不获得', () => {
    expect(advanceTrust(0, false)).toEqual({ streak: 1, pardon: false, earned: false })
    expect(advanceTrust(1, false)).toEqual({ streak: 2, pardon: false, earned: false })
  })

  it('攒满 TRUST_STREAK 次获得免罚并清零', () => {
    expect(TRUST_STREAK).toBe(3)
    const result = advanceTrust(TRUST_STREAK - 1, false)
    expect(result).toEqual({ streak: 0, pardon: true, earned: true })
  })

  it('已持有免罚时不再累计、不能重复获得', () => {
    expect(advanceTrust(2, true)).toEqual({ streak: 2, pardon: true, earned: false })
    expect(advanceTrust(0, true)).toEqual({ streak: 0, pardon: true, earned: false })
  })
})

describe('trust: isTimeoutViolation', () => {
  it('查岗未应与看不到你属于超时类', () => {
    expect(isTimeoutViolation('no-checkin')).toBe(true)
    expect(isTimeoutViolation('absent')).toBe(true)
  })

  it('离座不属于超时类，不免罚', () => {
    expect(isTimeoutViolation('away')).toBe(false)
  })
})
