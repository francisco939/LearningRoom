import { cn } from '@/lib/cn'
import type { Mode, Phase } from '@/lib/types'

interface TimerDisplayProps {
  remaining: number
  phase: Phase
  mode: Mode
  round: number
  totalRounds: number
}

function formatTimer(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function phaseLabel(phase: Phase, mode: Mode): string {
  if (phase === 'break') return '休息'
  if (phase === 'focus') return mode === 'stopwatch' ? '计时中' : '专注'
  if (phase === 'done') return '已结束'
  return '准备开始'
}

export function TimerDisplay({ remaining, phase, mode, round, totalRounds }: TimerDisplayProps) {
  const showRounds = mode === 'pomodoro' && phase !== 'idle'

  return (
    <div className="flex flex-col items-center select-none">
      <div className="mb-1 flex items-center gap-2 text-[11px] tracking-[0.42em] text-paper/75 uppercase drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
        <span>{phaseLabel(phase, mode)}</span>
        {phase === 'break' && <span className="text-amber/90">· 耄耋在打盹</span>}
      </div>

      <div
        className={cn(
          'timer-digits tabular font-display leading-none text-paper',
          'text-[clamp(64px,13.5vw,164px)]',
          'drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]',
        )}
        role="timer"
        aria-label={`剩余 ${formatTimer(remaining)}`}
      >
        {formatTimer(remaining)}
      </div>

      {showRounds && (
        <div className="mt-4 flex items-center gap-1.5" aria-label={`第 ${round} 轮，共 ${totalRounds} 轮`}>
          {Array.from({ length: Math.min(totalRounds, 12) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500',
                i < round - 1 ? 'w-2 bg-amber/55' : i === round - 1 ? 'w-7 bg-amber' : 'w-2 bg-paper/20',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
