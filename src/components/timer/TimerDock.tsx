import { Pause } from 'lucide-react'
import { TimerDisplay } from './TimerDisplay'
import { TimerRing } from './TimerRing'
import { ModeSwitch } from './ModeSwitch'
import { TimerHint } from './TimerHint'
import { useSession } from '@/store/useSession'
import { cn } from '@/lib/cn'

interface TimerDockProps {
  remaining: number
  ratio: number
  compact: boolean
  onOpenSettings: () => void
}

export function TimerDock({ remaining, ratio, compact, onOpenSettings }: TimerDockProps) {
  const timer = useSession((s) => s.timer)
  const pause = useSession((s) => s.pause)

  return (
    <div
      className={cn('timer-dock', compact && 'is-compact')}
      data-compact={compact}
      onClick={compact ? pause : undefined}
      aria-label={compact ? '暂停计时并展开' : undefined}
      title={compact ? '点击暂停并展开' : undefined}
    >
      <div className="timer-halo" aria-hidden />
      <TimerRing ratio={ratio} breaking={timer.phase === 'break'} />
      <div className="relative z-10 flex flex-col items-center">
        <TimerDisplay
          remaining={remaining}
          phase={timer.phase}
          mode={timer.mode}
          round={timer.round}
          totalRounds={timer.totalRounds}
        />
        {!compact && (
          <>
            <div className="mt-7">
              <ModeSwitch />
            </div>
            {timer.status === 'idle' && timer.mode !== 'stopwatch' && (
              <TimerHint onOpenSettings={onOpenSettings} />
            )}
          </>
        )}
        {compact && (
          <span className="mt-2 flex items-center gap-1 text-[11px] tracking-[0.2em] text-paper/35">
            <Pause size={10} />
          </span>
        )}
      </div>
    </div>
  )
}
