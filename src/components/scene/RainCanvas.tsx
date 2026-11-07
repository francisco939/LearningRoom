import { useEffect, useRef } from 'react'

interface RainCanvasProps {
  enabled: boolean
}

interface Drop {
  x: number
  y: number
  len: number
  speed: number
  alpha: number
}

export function RainCanvas({ enabled }: RainCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !enabled) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let width = 0
    let height = 0
    const drops: Drop[] = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      len: 6 + Math.random() * 18,
      speed: 0.25 + Math.random() * 0.55,
      alpha: 0.15 + Math.random() * 0.45,
    }))

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.lineWidth = 1
      for (const drop of drops) {
        ctx.strokeStyle = `rgba(196, 219, 236, ${drop.alpha})`
        ctx.beginPath()
        ctx.moveTo(drop.x * width, drop.y * height)
        ctx.lineTo(drop.x * width - 1.5, drop.y * height + drop.len)
        ctx.stroke()
        drop.y += drop.speed / height
        if (drop.y > 1) {
          drop.y = -0.05
          drop.x = Math.random()
        }
      }
      raf = requestAnimationFrame(draw)
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])

  if (!enabled) return null
  return <canvas ref={ref} className="rain-canvas" aria-hidden />
}
