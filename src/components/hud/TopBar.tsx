import { Fish, Flame, History, Settings, Trophy, PawPrint } from 'lucide-react'
import { useProgress } from '@/store/useProgress'
import { levelFor } from '@/data/levels'
import { cn } from '@/lib/cn'

interface TopBarProps {
  onOpenHistory: () => void
  onOpenAchievements: () => void
  onOpenSettings: () => void
}

export function TopBar({ onOpenHistory, onOpenAchievements, onOpenSettings }: TopBarProps) {
  const progress = useProgress((s) => s.progress)
  const level = levelFor(progress.totalFocusSec)
  const nextHours = level.next?.minHours ?? level.current.minHours
  const prevHours = level.current.minHours
  const ratio =
    nextHours === prevHours
      ? 1
      : Math.min(1, Math.max(0, (progress.totalFocusSec / 3600 - prevHours) / (nextHours - prevHours)))

  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 bg-gradient-to-b from-black/55 to-transparent px-4 py-4 sm:px-7 sm:py-5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-paper/15 bg-black/25 text-amber">
          <PawPrint size={17} />
        </span>
        <div className="leading-tight">
          <div className="font-display text-[15px] tracking-[0.22em] text-paper drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] sm:text-base">
            LearningRoom
          </div>
          <div className="hidden text-[10px] tracking-[0.32em] text-paper/40 sm:block">
            耄 耋 自 习 室
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-paper/10 bg-black/25 px-3 py-1.5 sm:flex">
          <span className="text-[10px] tracking-widest text-paper/45">等级</span>
          <span className="text-xs text-paper/85">{level.current.name}</span>
          <span className="h-1 w-16 overflow-hidden rounded-full level-track">
            <span className="block h-full level-fill" style={{ width: `${ratio * 100}%` }} />
          </span>
        </div>

        <Stat icon={<Fish size={14} />} label="鱼干" value={progress.fish} />
        <Stat icon={<Flame size={14} />} label="连续" value={progress.streak} suffix="天" />

        <IconButton label="历史记录" onClick={onOpenHistory}>
          <History size={17} />
        </IconButton>
        <IconButton label="成就" onClick={onOpenAchievements}>
          <Trophy size={17} />
        </IconButton>
        <IconButton label="设置" onClick={onOpenSettings}>
          <Settings size={17} />
        </IconButton>
      </div>
    </header>
  )
}

function Stat({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
}) {
  return (
    <div
      className="fish-pill flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-amber"
      title={`${label} ${value}${suffix ?? ''}`}
    >
      {icon}
      <span className="tabular text-xs font-medium">{value}</span>
      {suffix && <span className="text-[10px] text-amber/60">{suffix}</span>}
    </div>
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
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full border border-paper/10 bg-black/25 text-paper/70',
        'transition hover:border-paper/25 hover:bg-black/40 hover:text-paper active:scale-95',
      )}
    >
      {children}
    </button>
  )
}
