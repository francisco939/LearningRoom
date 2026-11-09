import { ambienceById, DEFAULT_AMBIENCE_ID } from '@/data/ambience'

const HISS_SRC = `${import.meta.env.BASE_URL}audio/hiss.m4a`

class Ambience {
  private audio: HTMLAudioElement | null = null
  private hissAudio: HTMLAudioElement | null = null
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 0.5
  private started = false
  private trackId = DEFAULT_AMBIENCE_ID

  async start(volume: number, trackId = this.trackId): Promise<void> {
    this.volume = clamp01(volume)

    if (this.audio && this.started) {
      this.audio.volume = this.volume
      if (trackId !== this.trackId) await this.setTrack(trackId)
      await this.audio.play().catch(() => {})
      return
    }

    this.trackId = trackId
    const track = ambienceById(trackId)
    const audio = new Audio(`${import.meta.env.BASE_URL}${track.src}`)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0

    try {
      await audio.play()
      this.audio = audio
      this.started = true
      fadeElement(audio, 0, this.volume, 900)
    } catch {
      this.started = false
    }
  }

  async setTrack(trackId: string): Promise<void> {
    if (trackId === this.trackId) return
    this.trackId = trackId
    if (!this.started || !this.audio) return

    const old = this.audio
    const track = ambienceById(trackId)
    const next = new Audio(`${import.meta.env.BASE_URL}${track.src}`)
    next.loop = true
    next.preload = 'auto'
    next.volume = 0

    try {
      await next.play()
      this.audio = next
      fadeElement(next, 0, this.volume, 900)
      fadeElement(old, old.volume, 0, 700, () => old.pause())
    } catch {
      // 新音轨加载失败时继续播放旧音轨。
    }
  }

  setVolume(volume: number): void {
    this.volume = clamp01(volume)
    if (this.audio && this.started) this.audio.volume = this.volume
  }

  stop(): void {
    if (!this.audio) {
      this.started = false
      return
    }
    const audio = this.audio
    this.started = false
    fadeElement(audio, audio.volume, 0, 500, () => audio.pause())
  }

  async hiss(): Promise<void> {
    try {
      if (!this.hissAudio) {
        const audio = new Audio(HISS_SRC)
        audio.preload = 'auto'
        audio.volume = 0.75
        this.hissAudio = audio
      }
      this.hissAudio.currentTime = 0
      await this.hissAudio.play()
    } catch {
      await this.synthHiss()
    }
  }

  private async synthHiss(): Promise<void> {
    try {
      const ctx = this.ensureContext()
      if (!ctx) return
      await ctx.resume()
      const duration = 0.55
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1

      const source = ctx.createBufferSource()
      source.buffer = buffer
      const band = ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 1900
      band.Q.value = 0.8
      const gain = ctx.createGain()
      const t0 = ctx.currentTime
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
      source.connect(band).connect(gain).connect(ctx.destination)
      source.start(t0)
      source.stop(t0 + duration)
    } catch {
      /* audio is optional */
    }
  }

  async scratch(): Promise<void> {
    try {
      const ctx = this.ensureContext()
      if (!ctx) return
      await ctx.resume()
      const duration = 0.35
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1

      const source = ctx.createBufferSource()
      source.buffer = buffer
      const band = ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.Q.value = 1.1
      const t0 = ctx.currentTime
      band.frequency.setValueAtTime(3200, t0)
      band.frequency.exponentialRampToValueAtTime(1200, t0 + duration)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
      source.connect(band).connect(gain).connect(ctx.destination)
      source.start(t0)
      source.stop(t0 + duration)
    } catch {
      /* audio is optional */
    }
  }

  async chime(kind: 'done' | 'break' = 'done'): Promise<void> {
    try {
      const ctx = this.ensureContext()
      if (!ctx) return
      await ctx.resume()
      const notes = kind === 'done' ? [523.25, 659.25, 783.99] : [392, 493.88]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        const t0 = ctx.currentTime + i * 0.14
        gain.gain.setValueAtTime(0, t0)
        gain.gain.linearRampToValueAtTime(0.16, t0 + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t0)
        osc.stop(t0 + 1.15)
      })
    } catch {
      /* audio is optional */
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 1
    this.master.connect(this.ctx.destination)
    return this.ctx
  }
}

function fadeElement(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  ms: number,
  done?: () => void,
): void {
  const start = performance.now()
  const step = () => {
    const t = Math.min(1, (performance.now() - start) / ms)
    audio.volume = clamp01(from + (to - from) * t)
    if (t < 1) requestAnimationFrame(step)
    else done?.()
  }
  requestAnimationFrame(step)
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

export const ambience = new Ambience()
