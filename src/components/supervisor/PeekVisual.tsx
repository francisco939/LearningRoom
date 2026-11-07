import { useEffect, useRef, useState } from 'react'
import type { PeekState } from '@/store/useSession'
import { cn } from '@/lib/cn'

const CANVAS = 480

function keyGreen(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const dominance = g - Math.max(r, b)
    if (g > 70 && dominance > 34) {
      data[i + 3] = 0
    } else if (dominance > 16) {
      const alpha = Math.max(0, Math.min(255, (1 - (dominance - 16) / 18) * 255))
      data[i + 3] = Math.min(data[i + 3], alpha)
      data[i + 1] = Math.round((r + b) / 2)
    }
  }
}

interface PeekVisualProps {
  tone: PeekState['tone']
}

export function PeekVisual({ tone }: PeekVisualProps) {
  const [ready, setReady] = useState(false)

  return (
    <div className="peek-cat">
      <div className={cn('peek-static', ready && 'is-hidden')}>
        <img
          className="peek-img"
          src={`${import.meta.env.BASE_URL}supervisor/maodie-peek.webp?v=2`}
          alt="耄耋从边缘探出头来"
          draggable={false}
        />
        {tone === 'yell' && <YellMouth />}
      </div>
      <KeyedVideo key={tone} tone={tone} onReady={() => setReady(true)} />
    </div>
  )
}

function KeyedVideo({ tone, onReady }: { tone: PeekState['tone']; onReady: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onReadyRef = useRef(onReady)
  const readyRef = useRef(false)
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const asset = tone === 'yell' ? 'yell' : 'peek'
    const base = `${import.meta.env.BASE_URL}supervisor/${asset}`
    let alive = true

    const pick = async () => {
      for (const ext of ['webm', 'mp4']) {
        try {
          const response = await fetch(`${base}.${ext}`, { method: 'HEAD' })
          const type = response.headers.get('content-type') ?? ''
          if (response.ok && type.startsWith('video/')) {
            if (alive) setSrc(`${base}.${ext}`)
            return
          }
        } catch {
          /* try next */
        }
      }
    }
    void pick()
    return () => {
      alive = false
    }
  }, [tone])

  useEffect(() => {
    if (!src) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let raf = 0
    let stopped = false

    const draw = () => {
      if (stopped) return
      if (video.readyState >= 2 && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, CANVAS, CANVAS)
        const frame = ctx.getImageData(0, 0, CANVAS, CANVAS)
        keyGreen(frame.data)
        ctx.putImageData(frame, 0, 0)
        if (!readyRef.current) {
          readyRef.current = true
          onReadyRef.current()
        }
      }
      raf = requestAnimationFrame(draw)
    }

    const start = async () => {
      try {
        await video.play()
        draw()
      } catch {
        /* 自动播放失败时保留静态回退 */
      }
    }
    void start()

    const onEnded = () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
    video.addEventListener('ended', onEnded)

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      video.removeEventListener('ended', onEnded)
      video.pause()
    }
  }, [src])

  return (
    <>
      {src && (
        <video
          ref={videoRef}
          className="peek-video-source"
          src={src}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
      )}
      <canvas ref={canvasRef} width={CANVAS} height={CANVAS} className="peek-video" aria-hidden />
    </>
  )
}

function YellMouth() {
  return (
    <svg className="cat-yell-mouth" viewBox="0 0 100 100" aria-hidden>
      <ellipse cx="50" cy="50" rx="30" ry="27" fill="#2a0b0a" />
      <ellipse cx="50" cy="68" rx="16" ry="13" fill="#b4525a" />
      <path d="M31 35 L38 51 L27 49 Z" fill="#fff8ea" />
      <path d="M69 35 L62 51 L73 49 Z" fill="#fff8ea" />
      <path
        d="M36 76 Q50 84 64 76"
        fill="none"
        stroke="#7d2626"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}
