import { useMemo } from 'react'
import { Fish, Flame, Clock3, CheckCircle2 } from 'lucide-react'
import { useProgress } from '@/store/useProgress'
import { useNow } from '@/hooks/useNow'
import { dayKey, formatDuration, previousDayKey, sevenDaySeries, todayFocusSec } from '@/lib/stats'
import type { Session } from '@/lib/types'
import { Panel } from './Panel'
import { cn } from '@/lib/cn'

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
}

export function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const sessions = useProgress((s) => s.sessions)
  const progress = useProgress((s) => s.progress)
  const now = useNow(60_000)

  const series = useMemo(() => sevenDaySeries(sessions, now), [sessions, now])
  const maxSec = Math.max(1, ...series.map((d) => d.sec))
  const today = todayFocusSec(sessions, now)

  const groups = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const session of sessions) {
      const key = dayKey(session.endedAt)
      const list = map.get(key) ?? []
      list.push(session)
      map.set(key, list)
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 30)
  }, [sessions])

  return (
    <Panel open={open} onClose={onClose} title="专注记录" subtitle="时间静悄悄地留在这里" wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary icon={<Clock3 size={15} />} label="累计专注" value={formatDuration(progress.totalFocusSec)} />
        <Summary icon={<CheckCircle2 size={15} />} label="完成场次" value={`${progress.completedSessions}`} />
        <Summary icon={<Flame size={15} />} label="连续天数" value={`${progress.streak}`} />
        <Summary icon={<Fish size={15} />} label="小鱼干" value={`${progress.fish}`} />
      </div>

      <div className="mt-6 rounded-xl border border-paper/10 bg-black/15 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[13px] tracking-[0.2em] text-paper/55">最近七天</h3>
          <span className="tabular text-[12px] text-paper/40">今天 {formatDuration(today)}</span>
        </div>
        <div className="mt-4 flex h-28 items-end gap-2">
          {series.map((day) => (
            <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end">
                <div
                  className={cn(
                    'w-full rounded-sm transition-all',
                    day.sec > 0 ? 'bg-gradient-to-t from-amber-deep/70 to-amber' : 'bg-paper/10',
                  )}
                  style={{ height: `${Math.max(day.sec > 0 ? 8 : 3, (day.sec / maxSec) * 100)}%` }}
                  title={`${day.day} · ${formatDuration(day.sec)}`}
                />
              </div>
              <span className="text-[11px] text-paper/40">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-paper/15 px-5 py-10 text-center">
            <p className="text-[15px] text-paper/65">还没有专注记录</p>
            <p className="mt-1.5 text-[13px] text-paper/40">完成、停止或中断的专注都会出现在这里。</p>
          </div>
        )}

        {groups.map(([day, list]) => (
          <div key={day}>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-[13px] tracking-[0.2em] text-paper/55">{dayLabel(day, now)}</h3>
              <span className="h-px flex-1 bg-paper/10" />
              <span className="tabular text-[11px] text-paper/35">
                {formatDuration(list.reduce((sum, s) => sum + s.focusedSec, 0))}
              </span>
            </div>
            <ul className="space-y-2">
              {list.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center gap-3 rounded-lg border border-paper/8 bg-black/15 px-3 py-2.5"
                >
                  <span className="tabular w-11 text-[12px] text-paper/45">
                    {new Date(session.startedAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-[13px] text-paper/80">{modeLabel(session.mode)}</span>
                  <span className="tabular text-[13px] text-paper/55">{formatDuration(session.focusedSec)}</span>
                  <span className="ml-auto flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          i < session.starsLeft ? 'bg-amber' : 'bg-paper/15',
                        )}
                      />
                    ))}
                  </span>
                  <StatusBadge status={session.status} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-paper/10 bg-black/15 p-3">
      <div className="flex items-center gap-1.5 text-amber/80">{icon}</div>
      <div className="mt-2 text-[11px] tracking-wider text-paper/40">{label}</div>
      <div className="tabular mt-1 text-[15px] text-paper/90">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: Session['status'] }) {
  const map = {
    completed: { label: '完成', className: 'bg-sage/20 text-sage' },
    failed: { label: '被赶出', className: 'bg-danger/20 text-danger' },
    aborted: { label: '放弃', className: 'bg-paper/10 text-paper/45' },
  } as const
  const item = map[status]
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[11px]', item.className)}>{item.label}</span>
  )
}

function modeLabel(mode: Session['mode']): string {
  if (mode === 'pomodoro') return '番茄钟'
  if (mode === 'countdown') return '倒计时'
  return '秒表'
}

function dayLabel(key: string, now: number): string {
  const today = dayKey(now)
  if (key === today) return '今天'
  if (key === previousDayKey(today)) return '昨天'
  const [, m, d] = key.split('-')
  return `${Number(m)} 月 ${Number(d)} 日`
}
