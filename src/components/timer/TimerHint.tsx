import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

interface TimerHintProps {
  onOpenSettings: () => void
}

export function TimerHint({ onOpenSettings }: TimerHintProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), 10_000)
    return () => window.clearTimeout(id)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => {
        setVisible(false)
        onOpenSettings()
      }}
      aria-label="打开设置修改时长"
      className="timer-hint hint-fade mt-4 flex items-center gap-1.5 rounded-full border border-paper/10 bg-black/25 px-3 py-1.5 text-[13px] tracking-[0.04em] text-paper/55 backdrop-blur-sm transition hover:border-amber/30 hover:text-paper/85"
    >
      <SlidersHorizontal size={13} />
      时间在「设置」里改 · 未开始时自动同步
    </button>
  )
}
