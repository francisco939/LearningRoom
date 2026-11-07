import { Play, Pause, SkipForward, Square, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { useSession } from '@/store/useSession'
import { useSettings } from '@/store/useSettings'
import { ambience } from '@/lib/audio'
import { cn } from '@/lib/cn'

interface TimerControlsProps {
  onOpenSettings: () => void
}

export function TimerControls({ onOpenSettings }: TimerControlsProps) {
  const timer = useSession((s) => s.timer)
  const patrol = useSession((s) => s.patrol)
  const start = useSession((s) => s.start)
  const pause = useSession((s) => s.pause)
  const resume = useSession((s) => s.resume)
  const skip = useSession((s) => s.skip)
  const end = useSession((s) => s.end)
  const abort = useSession((s) => s.abort)
  const setResult = useSession((s) => s.setResult)
  const say = useSession((s) => s.say)
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)

  const running = timer.status === 'running'
  const paused = timer.status === 'paused'
  const idle = timer.status === 'idle'

  const primary = () => {
    if (patrol) {
      useSession.getState().ackPatrol()
      return
    }
    if (running) {
      pause()
      return
    }
    if (paused) {
      resume()
      return
    }
    setResult(null)
    if (settings.sound) void ambience.start(settings.volume)
    start(settings)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="glass flex items-center gap-1 rounded-full px-2 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <IconButton
          label={settings.sound ? '关闭雨声' : '打开雨声'}
          onClick={() => {
            const next = !settings.sound
            update({ sound: next })
            if (next) void ambience.start(settings.volume)
            else ambience.stop()
          }}
        >
          {settings.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </IconButton>

        <span className="mx-1 h-6 w-px bg-paper/10" />

        {!idle && (
          <IconButton
            label="放弃本轮"
            onClick={() => {
              abort()
              setResult(null)
              say('violation')
            }}
          >
            <RotateCcw size={16} />
          </IconButton>
        )}

        {timer.mode === 'stopwatch' && !idle ? (
          <PrimaryButton label="结束计时" onClick={end}>
            <Square size={20} fill="currentColor" />
          </PrimaryButton>
        ) : (
          <PrimaryButton
            label={running ? '暂停' : paused ? '继续' : '开始专注'}
            onClick={primary}
          >
            {running ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </PrimaryButton>
        )}

        {!idle && timer.mode !== 'stopwatch' && (
          <IconButton label="跳到下一阶段" onClick={skip}>
            <SkipForward size={17} />
          </IconButton>
        )}

        <span className="mx-1 h-6 w-px bg-paper/10" />

        <IconButton label="设置" onClick={onOpenSettings}>
          <span className="text-[11px] tracking-widest">设置</span>
        </IconButton>
      </div>

      <p className="text-[11px] text-paper/35">
        {patrol
          ? '耄耋在看你 —— 按空格或点「喵」'
          : running
            ? '空格暂停 · S 跳过 · R 放弃'
            : paused
              ? '空格继续'
              : '空格开始 · 1/2/3 切换模式'}
      </p>
    </div>
  )
}

function PrimaryButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'mx-2 grid h-14 w-14 place-items-center rounded-full text-ink',
        'bg-gradient-to-b from-amber to-amber-deep',
        'shadow-[0_10px_28px_rgba(227,164,92,0.28),inset_0_1px_0_rgba(255,255,255,0.4)]',
        'transition hover:brightness-110 active:scale-95',
      )}
    >
      {children}
    </button>
  )
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-9 min-w-9 place-items-center rounded-full px-2 text-paper/70 transition hover:bg-paper/10 hover:text-paper active:scale-95"
    >
      {children}
    </button>
  )
}
