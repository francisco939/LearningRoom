import { useEffect } from 'react'
import { useSession } from '@/store/useSession'

export function ViolationStamp() {
  const stamp = useSession((s) => s.stamp)
  const clear = useSession((s) => s.clearStamp)

  useEffect(() => {
    if (!stamp) return
    const id = window.setTimeout(clear, 1700)
    return () => window.clearTimeout(id)
  }, [stamp, clear])

  if (!stamp) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-45 grid place-items-center">
      <div className="stamp rounded-md px-8 py-4 text-2xl sm:text-3xl">
        记 过
        <div className="mt-1 text-center text-[10px] tracking-[0.3em] text-[#d9553f]/80">
          {stamp.kind === 'away' ? '擅自离座' : '查岗未应'}
        </div>
      </div>
    </div>
  )
}
