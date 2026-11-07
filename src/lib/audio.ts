const RAIN_SRC = `${import.meta.env.BASE_URL}audio/rain.m4a`
const HISS_SRC = `${import.meta.env.BASE_URL}audio/hiss.m4a`

class Ambience {
  private audio: HTMLAudioElement | null = null
  private hissAudio: HTMLAudioElement | null = null
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 0.5
  private started = false

  async start(volume: number): Promise<void> {
    this.volume = clamp01(volume)
    if (!this.audio) {
      const audio = new Audio(RAIN_SRC)
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0
      this.audio = audio
    }
    try {
      await this.audio.play()
      this.started = true
      this.fadeTo(this.volume, 900)
    } catch {
      this.started = false
    }
  }

  setVolume(volume: number): void {
    this.volume = clamp01(volume)
    if (this.audio && this.started) this.audio.volume = this.volume
  }

  stop(): void {
    if (!this.audio) return
    this.fadeTo(0, 400, () => {
      this.audio?.pause()
      this.started = false
    })
  }

  private fadeTo(target: number, ms: number, done?: () => void): void {
    const audio = this.audio
    if (!audio) return
    const from = audio.volume
    const start = performance.now()
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / ms)
      audio.volume = clamp01(from + (target - from) * t)
      if (t < 1) requestAnimationFrame(step)
      else done?.()
    }
    requestAnimationFrame(step)
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

      const growl = ctx.createOscillator()
      const growlGain = ctx.createGain()
      growl.type = 'sawtooth'
      growl.frequency.setValueAtTime(120, t0)
      growl.frequency.exponentialRampToValueAtTime(70, t0 + duration)
      growlGain.gain.setValueAtTime(0.0001, t0)
      growlGain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.04)
      growlGain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
      growl.connect(growlGain).connect(ctx.destination)
      growl.start(t0)
      growl.stop(t0 + duration)
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
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 1
    this.master.connect(this.ctx.destination)
    return this.ctx
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

export const ambience = new Ambience()
