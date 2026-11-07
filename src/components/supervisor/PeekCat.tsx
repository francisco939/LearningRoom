import { useEffect } from 'react'
import { useSession } from '@/store/useSession'
import { useNow } from '@/hooks/useNow'
import { ambience } from '@/lib/audio'
import { cn } from '@/lib/cn'
import { PeekVisual } from './PeekVisual'

export function PeekCat() {
  const peek = useSession((s) => s.peek)
  const patrol = useSession((s) => s.patrol)
  const message = useSession((s) => s.catMessage)
  const ack = useSession((s) => s.ackPatrol)
  const dismiss = useSession((s) => s.dismissPeek)
  const now = useNow(patrol ? 100 : 1000)

  useEffect(() => {
    if (peek?.tone === 'yell') void ambience.hiss()
  }, [peek?.id, peek?.tone])

  useEffect(() => {
    if (!peek || peek.tone !== 'yell') return
    const id = window.setTimeout(dismiss, 2600)
    return () => window.clearTimeout(id)
  }, [peek, dismiss])

  if (!peek) return null

  const yelling = peek.tone === 'yell'
  const total = patrol ? Math.max(1, patrol.deadline - patrol.startedAt) : 1
  const remain = patrol ? Math.max(0, patrol.deadline - now) : 0
  const ratio = patrol ? Math.max(0, Math.min(1, remain / total)) : 0
  const seconds = Math.ceil(remain / 1000)
  const r = 20
  const c = 2 * Math.PI * r

  return (
    <div
      key={peek.id}
      className={cn('peek', `peek-${peek.anchor}`)}
      data-tone={peek.tone}
      aria-live={yelling ? 'assertive' : 'polite'}
    >
      <div className="peek-inner">
        <PeekVisual tone={peek.tone} />

        {yelling ? (
          <div className="peek-shout" role="alert">
            哈——！
          </div>
        ) : (
          patrol && (
            <div className="cat-bubble peek-bubble">
              <div className="text-[10px] tracking-[0.24em] text-[#8a6a45]">耄耋 · 查岗</div>
              <p className="mt-1 text-[14px] leading-snug text-[#241b12]">{message.text}</p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="tabular text-[11px] text-[#8a6a45]">还有 {seconds} 秒</span>
                <button
                  type="button"
                  onClick={ack}
                  className="patrol-ack relative grid h-10 w-10 place-items-center rounded-full bg-[#2a211a] text-[13px] font-medium shadow-lg transition hover:scale-105 active:scale-95"
                  style={{ color: '#f4e8d2' }}
                  aria-label="我在，回应耄耋"
                >
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
                    <circle
                      cx="24"
                      cy="24"
                      r={r}
                      fill="none"
                      stroke="rgba(244,232,210,0.18)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r={r}
                      fill="none"
                      stroke="#e3a45c"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={c}
                      strokeDashoffset={c * (1 - ratio)}
                    />
                  </svg>
                  喵
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
