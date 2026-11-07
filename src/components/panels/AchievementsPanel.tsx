import { Check, Lock } from 'lucide-react'
import { ACHIEVEMENTS } from '@/data/achievements'
import { useProgress } from '@/store/useProgress'
import { Panel } from './Panel'
import { cn } from '@/lib/cn'

interface AchievementsPanelProps {
  open: boolean
  onClose: () => void
}

export function AchievementsPanel({ open, onClose }: AchievementsPanelProps) {
  const achievements = useProgress((s) => s.progress.achievements)
  const unlocked = Object.keys(achievements).length

  return (
    <Panel open={open} onClose={onClose} title="成就" subtitle={`${unlocked} / ${ACHIEVEMENTS.length} 已获得`} wide>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((item) => {
          const unlockedAt = achievements[item.id]
          const done = Boolean(unlockedAt)
          return (
            <div
              key={item.id}
              className={cn(
                'relative flex items-start gap-3 rounded-xl border p-3.5 transition',
                done
                  ? 'border-amber/30 bg-amber/[0.06]'
                  : 'border-paper/8 bg-black/15 opacity-70',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border',
                  done ? 'border-amber/40 bg-amber/15 text-amber' : 'border-paper/15 text-paper/30',
                )}
              >
                {done ? <Check size={16} /> : <Lock size={14} />}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={cn('text-[15px]', done ? 'text-paper' : 'text-paper/65')}>{item.name}</h3>
                  {unlockedAt && (
                    <span className="text-[11px] text-amber/70">
                      {new Date(unlockedAt).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-paper/45">{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
