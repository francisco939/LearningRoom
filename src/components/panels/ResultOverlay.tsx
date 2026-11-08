import { ArrowRight, Fish, History, Star, X } from 'lucide-react'
import { useSession } from '@/store/useSession'
import { useProgress } from '@/store/useProgress'
import { useSettings } from '@/store/useSettings'
import { ACHIEVEMENTS } from '@/data/achievements'
import { formatDuration } from '@/lib/stats'
import { ambience } from '@/lib/audio'
import { cn } from '@/lib/cn'

interface ResultOverlayProps {
  onOpenHistory: () => void
}

export function ResultOverlay({ onOpenHistory }: ResultOverlayProps) {
  const result = useSession((s) => s.result)
  const setResult = useSession((s) => s.setResult)
  const start = useSession((s) => s.start)
  const resetSession = useSession((s) => s.resetSession)
  const settings = useSettings((s) => s.settings)
  const streak = useProgress((s) => s.progress.streak)

  if (!result) return null

  const { session, unlocked } = result
  const failed = session.status === 'failed'
  const aborted = session.status === 'aborted'
  const names = ACHIEVEMENTS.filter((a) => unlocked.includes(a.id))

  const close = () => {
    setResult(null)
    resetSession()
  }

  return (
    <div className="fixed inset-0 z-[55] grid place-items-center bg-black/60 px-4 backdrop-blur-[3px]">
      <div className="w-full max-w-lg rounded-2xl border border-paper/12 bg-[#1a1410]/96 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.7)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] tracking-[0.32em] text-amber/75">
              {failed ? '本轮作废' : aborted ? '提前收工' : '光荣下班'}
            </div>
            <h2 className="mt-3 font-display text-4xl tracking-wide text-paper">
              {failed ? '被赶出自习室' : aborted ? '这次就算了' : '这一轮坐完了'}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-paper/60">
              {failed
                ? '三颗星都没了。耄耋把门关上，让你明天再来。'
                : aborted
                  ? '你主动结束了这一轮。已专注的时间仍然记下。'
                  : settings.supervisionEnabled
                    ? '耄耋打了个哈欠，把尾巴从你脚边收回去。'
                    : '这一轮按你的节奏坐完了。'}
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭结算"
            onClick={close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-paper/10 text-paper/50 transition hover:bg-paper/10"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className={cn(
            'mt-6 grid gap-2',
            settings.supervisionEnabled ? 'grid-cols-3' : 'grid-cols-2',
          )}
        >
          <Metric label="专注" value={formatDuration(session.focusedSec)} />
          <Metric label="鱼干" value={`+${session.fishEarned}`} icon={<Fish size={13} />} />
          {settings.supervisionEnabled && (
            <Metric label="星级" value={`${session.starsLeft} / 3`} icon={<Star size={13} />} />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-paper/8 bg-black/20 px-3.5 py-2.5 text-[11px] text-paper/45">
          <span>连续自习 {streak} 天</span>
          <span>{session.status === 'completed' ? '已计入记录与成就' : '未计入连续天数'}</span>
        </div>

        {names.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber/25 bg-amber/[0.06] px-4 py-3">
            <div className="text-[11px] tracking-[0.2em] text-amber/75">新成就</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {names.map((item) => (
                <span
                  key={item.id}
                  className="rounded-full border border-amber/30 px-2.5 py-1 text-[12px] text-amber/90"
                >
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setResult(null)
              if (settings.sound) void ambience.start(settings.volume)
              start(settings)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-amber to-amber-deep px-5 py-2.5 text-[13px] font-medium text-ink',
              'transition hover:brightness-110',
            )}
          >
            再来一轮 <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              close()
              onOpenHistory()
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 px-4 py-2.5 text-[13px] text-paper/65 transition hover:bg-paper/10"
          >
            <History size={14} /> 看看记录
          </button>
          <button
            type="button"
            onClick={close}
            className="ml-auto rounded-full px-3 py-2 text-[13px] text-paper/40 transition hover:text-paper/60"
          >
            收工
          </button>
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-paper/8 bg-black/20 px-3 py-2.5">
      <div className="flex items-center gap-1 text-[11px] tracking-wider text-paper/40">
        {icon}
        {label}
      </div>
      <div className="tabular mt-1 text-[15px] text-paper/90">{value}</div>
    </div>
  )
}
