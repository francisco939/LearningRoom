import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Ambience } from '@/lib/audio'

class FakeAudio {
  static instances: FakeAudio[] = []
  static pendingPlay: Array<() => void> = []
  static autoResolve = true

  loop = false
  preload = ''
  volume = 1
  src: string
  paused = true

  constructor(src?: string) {
    this.src = src ?? ''
    FakeAudio.instances.push(this)
  }

  play(): Promise<void> {
    this.paused = false
    if (FakeAudio.autoResolve) return Promise.resolve()
    return new Promise((resolve) => {
      FakeAudio.pendingPlay.push(() => resolve())
    })
  }

  pause(): void {
    this.paused = true
  }
}

describe('Ambience', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeAudio.instances = []
    FakeAudio.pendingPlay = []
    FakeAudio.autoResolve = true
    vi.stubGlobal('Audio', FakeAudio)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('并发 start 只创建一份音轨，stop 后停止播放', async () => {
    const ambience = new Ambience()

    await Promise.all([ambience.start(0.6, 'rain'), ambience.start(0.6, 'rain')])

    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0].paused).toBe(false)

    ambience.stop()
    vi.advanceTimersByTime(600)

    expect(FakeAudio.instances[0].paused).toBe(true)
  })

  it('播放还没完成就 stop 时，不会留下仍在响的音轨', async () => {
    FakeAudio.autoResolve = false
    const ambience = new Ambience()

    const starting = ambience.start(0.5, 'cafe')
    await vi.advanceTimersByTimeAsync(0)
    ambience.stop()
    FakeAudio.pendingPlay.forEach((resolve) => resolve())
    await starting

    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0].paused).toBe(true)
  })

  it('stop 之后可以重新 start 播放', async () => {
    const ambience = new Ambience()

    await ambience.start(0.4, 'rain')
    ambience.stop()
    vi.advanceTimersByTime(600)
    await ambience.start(0.4, 'rain')

    expect(FakeAudio.instances).toHaveLength(2)
    expect(FakeAudio.instances[1].paused).toBe(false)
  })
})
