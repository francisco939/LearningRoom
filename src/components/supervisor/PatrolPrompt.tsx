import { useSession, type PatrolState } from '@/store/useSession'
import { useNow } from '@/hooks/useNow'

export function PatrolPrompt() {
  const patrol = useSession((s) => s.patrol)
  if (!patrol) return null
  return <PatrolContent patrol={patrol} />
}

function PatrolContent({ patrol }: { patrol: PatrolState }) {
  const message = useSession((s) => s.catMessage)
  const ack = useSession((s) => s.ackPatrol)
  const now = useNow(100)

  const total = Math.max(1, patrol.deadline - patrol.startedAt)
  const remain = Math.max(0, patrol.deadline - now)
  const ratio = Math.max(0, Math.min(1, remain / total))
  const seconds = Math.ceil(remain / 1000)
  const r = 20
  const c = 2 * Math.PI * r

  return (
    <div className="absolute right-4 top-[36%] z-40 w-[230px] sm:right-[6.5%] sm:top-[44%] sm:w-[250px]">
      <div className="cat-bubble px-4 py-3">
        <div className="text-[10px] tracking-[0.24em] text-[#8a6a45]">耄耋 · 查岗</div>
        <p className="mt-1 text-[15px] leading-snug text-[#241b12]">{message.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="tabular text-[11px] text-[#8a6a45]">还有 {seconds} 秒</span>
          <button
            type="button"
            onClick={ack}
            className="patrol-ack relative grid h-11 w-11 place-items-center rounded-full bg-[#2a211a] text-[13px] font-medium shadow-lg transition hover:scale-105 active:scale-95"
            style={{ color: '#f4e8d2' }}
            aria-label="我在，回应耄耋"
          >
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
              <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(244,232,210,0.18)" strokeWidth="2.5" />
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
      <p className="mt-2 text-right text-[10px] text-paper/35">按空格也可以</p>
    </div>
  )
}
