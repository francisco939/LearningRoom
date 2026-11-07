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
    <header className="absolute inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-white/5 bg-[#0b0908]/60 px-4 backdrop-blur-md sm:h-[80px] sm:px-7">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full border border-paper/15 bg-black/25 text-amber">
          <PawPrint size={19} />
        </span>
        <div className="leading-tight">
          <div className="font-display text-[18px] tracking-[0.18em] text-paper drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] sm:text-[21px]">
            LearningRoom
          </div>
          <div className="hidden text-[11px] tracking-[0.32em] text-paper/45 sm:block">
            耄 耋 自 习 室
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-paper/10 bg-black/25 px-3.5 py-2 sm:flex">
          <span className="text-[11px] tracking-widest text-paper/45">等级</span>
          <span className="text-[13px] text-paper/85">{level.current.name}</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full level-track">
            <span className="block h-full level-fill" style={{ width: `${ratio * 100}%` }} />
          </span>
        </div>

        <Stat icon={<Fish size={15} />} label="鱼干" value={progress.fish} />
        <Stat icon={<Flame size={15} />} label="连续" value={progress.streak} suffix="天" />

        <IconButton label="历史记录" onClick={onOpenHistory}>
          <History size={18} />
        </IconButton>
        <IconButton label="成就" onClick={onOpenAchievements}>
          <Trophy size={18} />
        </IconButton>
        <IconButton label="设置" onClick={onOpenSettings}>
          <Settings size={18} />
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
      <span className="tabular text-[13px] font-medium">{value}</span>
      {suffix && <span className="text-[11px] text-amber/60">{suffix}</span>}
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
