import { useSettings } from '@/store/useSettings'
import { useSession } from '@/store/useSession'
import type { Mode } from '@/lib/types'
import { cn } from '@/lib/cn'

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'pomodoro', label: '番茄钟', hint: '25 + 5' },
  { id: 'countdown', label: '倒计时', hint: '一段' },
  { id: 'stopwatch', label: '秒表', hint: '不限' },
]

export function ModeSwitch() {
  const mode = useSettings((s) => s.settings.mode)
  const update = useSettings((s) => s.update)
  const status = useSession((s) => s.timer.status)

  if (status !== 'idle') return null

  return (
    <div className="glass flex items-center gap-1 rounded-full p-1" role="tablist" aria-label="计时模式">
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          onClick={() => update({ mode: item.id })}
          className={cn(
            'rounded-full px-4 py-2 text-[13px] tracking-wide transition',
            mode === item.id
              ? 'bg-paper text-ink shadow-sm'
              : 'text-paper/55 hover:bg-paper/10 hover:text-paper',
          )}
        >
          {item.label}
          <span className={cn('ml-1.5 text-[11px]', mode === item.id ? 'text-ink/45' : 'text-paper/35')}>
            {item.hint}
          </span>
        </button>
      ))}
    </div>
  )
}
