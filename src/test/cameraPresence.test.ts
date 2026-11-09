import { describe, expect, it } from 'vitest'
import { createMotionGate, meanAbsDiff } from '@/lib/cameraPresence'

function frame(fill: number, w = 8, h = 8): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4)
  data.fill(fill)
  return data
}

// 把前 ratio 比例的像素变成白色，制造一个明显变化。
function whiten(data: Uint8ClampedArray, ratio = 0.5): Uint8ClampedArray {
  const n = Math.floor((data.length / 4) * ratio) * 4
  for (let i = 0; i < n; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 255
  }
  return data
}

describe('cameraPresence: meanAbsDiff', () => {
  it('相同帧差为 0', () => {
    expect(meanAbsDiff(frame(0), frame(0))).toBe(0)
  })

  it('全黑 vs 全白差为 1', () => {
    expect(meanAbsDiff(frame(0), frame(255))).toBeCloseTo(1)
  })

  it('部分变化按像素占比缩放', () => {
    expect(meanAbsDiff(frame(0), whiten(frame(0), 0.5))).toBeCloseTo(0.5)
  })

  it('长度不足一个像素时差为 0', () => {
    expect(meanAbsDiff(new Uint8ClampedArray(3), new Uint8ClampedArray(3))).toBe(0)
  })
})

describe('cameraPresence: createMotionGate', () => {
  it('静止画面不判活动', () => {
    const gate = createMotionGate({ settleFrames: 0 })
    const still = frame(40)
    gate.push(still)
    expect(gate.push(still)).toBe(false)
  })

  it('出现明显变化判为活动', () => {
    const gate = createMotionGate({ settleFrames: 0 })
    const still = frame(40)
    gate.push(still)
    expect(gate.push(whiten(frame(40), 0.5))).toBe(true)
  })

  it('预热帧内只更新基线、不判活动', () => {
    const gate = createMotionGate({ settleFrames: 4 })
    const still = frame(40)
    gate.push(still)
    for (let i = 0; i < 4; i += 1) {
      expect(gate.push(still)).toBe(false)
    }
    expect(gate.push(whiten(frame(40), 0.5))).toBe(true)
  })

  it('reset 后重新开始', () => {
    const gate = createMotionGate({ settleFrames: 0 })
    gate.push(frame(40))
    expect(gate.push(whiten(frame(40), 0.5))).toBe(true)
    gate.reset()
    expect(gate.push(frame(40))).toBe(false)
  })
})
