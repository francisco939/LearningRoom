import { useSession } from '@/store/useSession'

export function CatBubble() {
  const message = useSession((s) => s.catMessage)
  const patrol = useSession((s) => s.patrol)
  const peek = useSession((s) => s.peek)
  const status = useSession((s) => s.timer.status)

  if (!message || patrol || peek || status === 'idle' || status === 'finished') return null

  return (
    <div
      key={message.id}
      className="absolute right-4 top-[38%] z-40 hidden w-[224px] animate-[bubble-in_0.32s_cubic-bezier(0.22,1,0.36,1),fade-out_0.4s_6s_forwards] sm:right-[6%] sm:top-[44%] sm:block"
    >
      <div className="cat-bubble px-4 py-3">
        <div className="text-[11px] tracking-[0.24em] text-[#8a6a45]">耄耋</div>
        <p className="mt-1 text-[14px] leading-snug text-[#241b12]">{message.text}</p>
      </div>
    </div>
  )
}
