import { useEffect, useRef, useState } from 'react'
import type { PeekState } from '@/store/useSession'
import { cn } from '@/lib/cn'

interface SheetManifest {
  fps: number
  cell: number
  cols: number
  rows: number
  count: number
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
      <FramePlayer key={tone} tone={tone} onReady={() => setReady(true)} />
    </div>
  )
}

function FramePlayer({ tone, onReady }: { tone: PeekState['tone']; onReady: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const asset = tone === 'yell' ? 'yell' : 'peek'
    const base = `${import.meta.env.BASE_URL}supervisor/${asset}`
    let cancelled = false
    let raf = 0

    const start = async () => {
      const response = await fetch(`${base}.json`, { cache: 'no-cache' })
      if (!response.ok) throw new Error('manifest missing')
      const manifest = (await response.json()) as SheetManifest

      const image = new Image()
      image.src = `${base}-sheet.webp`
      await image.decode()
      if (cancelled) return

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { fps, cell, cols, count } = manifest
      canvas.width = cell
      canvas.height = cell

      let frame = 0
      let last = performance.now()
      let acc = 0

      const draw = () => {
        const col = frame % cols
        const row = Math.floor(frame / cols)
        ctx.clearRect(0, 0, cell, cell)
        ctx.drawImage(image, col * cell, row * cell, cell, cell, 0, 0, cell, cell)
      }

      draw()
      onReadyRef.current()

      const loop = (now: number) => {
        acc += now - last
        last = now
        const step = 1000 / fps
        let advanced = false
        while (acc >= step && frame < count - 1) {
          frame += 1
          acc -= step
          advanced = true
        }
        if (advanced) draw()
        if (frame < count - 1) raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    void start().catch(() => {
      /* 静态贴纸回退 */
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [tone])

  return <canvas ref={canvasRef} className="peek-video" aria-hidden />
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
