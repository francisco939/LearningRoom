import { useEffect, useState } from 'react'
import { Fish, Flame, History, Images, Settings, Trophy, PawPrint, UserRound, Users } from 'lucide-react'
import { useProgress } from '@/store/useProgress'
import { useSettings } from '@/store/useSettings'
import { useSession } from '@/store/useSession'
import { useAuth } from '@/store/useAuth'
import type { PresenceSnapshot } from '@/lib/api'
import { levelFor } from '@/data/levels'
import { cn } from '@/lib/cn'

/** 计时进行中，无操作这么久后顶栏自动收上去。 */
const HIDE_AFTER_MS = 10_000
const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const

interface TopBarProps {
  onOpenHistory: () => void
  onOpenAchievements: () => void
  onOpenSettings: () => void
  onOpenGallery: () => void
  onOpenAccount: () => void
  onOpenCommunity: () => void
  presence: PresenceSnapshot & { offline: boolean }
}

export function TopBar({
  onOpenHistory,
  onOpenAchievements,
  onOpenSettings,
  onOpenGallery,
  onOpenAccount,
  onOpenCommunity,
  presence,
}: TopBarProps) {
  const progress = useProgress((s) => s.progress)
  const user = useAuth((s) => s.user)
  const supervisionEnabled = useSettings((s) => s.settings.supervisionEnabled)
  const catEnabled = supervisionEnabled
  const lightPatrol = useSession((s) => s.lightPatrol)
  const running = useSession((s) => s.timer.status === 'running')
  const startedAt = useSession((s) => s.timer.startedAt ?? 0)
  // 记录「哪一次计时的顶栏已经闲置收起了」，换一次计时就自然恢复显示，无需额外重置。
  const [idleSession, setIdleSession] = useState<number | null>(null)
  const hidden = running && idleSession === startedAt

  // 计时进行中：15 秒没操作就把顶栏收起来；一动鼠标/键盘/滚轮就重新出现并重新计时。
  useEffect(() => {
    if (!running) return
    let timer = window.setTimeout(() => setIdleSession(startedAt), HIDE_AFTER_MS)
    const wake = () => {
      setIdleSession(null)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdleSession(startedAt), HIDE_AFTER_MS)
    }
    for (const event of WAKE_EVENTS) window.addEventListener(event, wake, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const event of WAKE_EVENTS) window.removeEventListener(event, wake)
    }
  }, [running, startedAt])
  const checkinStreak = useSession((s) => s.checkinStreak)
  const pardon = useSession((s) => s.pardon)
  const level = levelFor(progress.totalFocusSec)
  const nextHours = level.next?.minHours ?? level.current.minHours
  const prevHours = level.current.minHours
  const ratio =
    nextHours === prevHours
      ? 1
      : Math.min(1, Math.max(0, (progress.totalFocusSec / 3600 - prevHours) / (nextHours - prevHours)))

  return (
    <header
      className={cn(
        'absolute inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-white/5 bg-[#0b0908]/60 px-4 backdrop-blur-md sm:h-[80px] sm:px-7',
        'transition-transform duration-500 ease-out',
        hidden ? '-translate-y-full pointer-events-none' : 'translate-y-0',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full border border-paper/15 bg-black/25 text-amber">
          <PawPrint size={19} />
        </span>
        {lightPatrol && (
          <span
            className="grid h-7 w-7 animate-pulse place-items-center rounded-full bg-amber/20 text-amber"
            title="耄耋在轻巡查"
          >
            <PawPrint size={14} />
          </span>
        )}
        <div className="leading-tight">
          <div className="font-display text-[18px] tracking-[0.18em] text-paper drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] sm:text-[21px]">
            LearningRoom
          </div>
          <div className="hidden text-[11px] tracking-[0.32em] text-paper/45 sm:block">
            自 习 室
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {catEnabled && (
          <div className="hidden items-center gap-2 rounded-full border border-paper/10 bg-black/25 px-3.5 py-2 sm:flex">
            <span className="text-[11px] tracking-widest text-paper/45">等级</span>
            <span className="text-[13px] text-paper/85">{level.current.name}</span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full level-track">
              <span className="block h-full level-fill" style={{ width: `${ratio * 100}%` }} />
            </span>
          </div>
        )}

        {catEnabled && (pardon || checkinStreak > 0) && (
          <div className="hidden items-center gap-1.5 rounded-full border border-amber/25 bg-amber/10 px-3 py-1.5 sm:flex">
            <PawPrint size={13} className="text-amber" />
            <span className="text-[12px] text-amber">{pardon ? '免罚' : `信任 ${checkinStreak}/3`}</span>
          </div>
        )}

        <Stat icon={<Fish size={15} />} label="鱼干" value={progress.fish} />
        <Stat icon={<Flame size={15} />} label="连续" value={progress.streak} suffix="天" />

        <button
          type="button"
          onClick={onOpenCommunity}
          className="fish-pill hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] text-amber/85 sm:flex"
          title={presence.offline ? '在线人数暂不可用' : `${presence.online} 人在线`}
        >
          <Users size={14} />
          {presence.offline ? '离线' : `${presence.online} 在线`}
        </button>

        <IconButton label={user ? '账户' : '登录'} onClick={onOpenAccount}>
          <UserRound size={18} />
        </IconButton>
        <IconButton label="背景" onClick={onOpenGallery}>
          <Images size={18} />
        </IconButton>
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
