import { useEffect } from 'react'
import { useSession } from '@/store/useSession'
import { useSettings } from '@/store/useSettings'
import { useProgress } from '@/store/useProgress'
import { buildDraftSession } from '@/store/useSession'
import { buildSession } from '@/lib/session'
import { newId } from '@/lib/id'
import { ambience } from '@/lib/audio'
import { formatClock } from '@/lib/stats'
import { remainingSec } from '@/lib/timer'
import { localRepository } from '@/lib/repository'

const committed = new Set<string>()

export function useTimerEngine(): void {
  const status = useSession((s) => s.timer.status)
  const startedAt = useSession((s) => s.timer.startedAt)
  const endedAt = useSession((s) => s.timer.endedAt)

  useEffect(() => {
    useSession.getState().tick(Date.now())
  }, [])

  useEffect(() => {
    if (status !== 'running') return
    const id = window.setInterval(() => useSession.getState().tick(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status !== 'running' && status !== 'paused') return
    const id = window.setInterval(() => useSession.getState().persist(), 5000)
    return () => window.clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status !== 'finished' || !endedAt) return
    const key = `${startedAt ?? 0}-${endedAt}`
    if (committed.has(key)) return
    committed.add(key)

    const timer = useSession.getState().timer
    const settings = useSettings.getState().settings
    const session = buildSession(buildDraftSession(timer, settings), newId())
    const result = useProgress.getState().record(session)
    useSession.getState().setResult({ session, unlocked: result.unlocked })
    localRepository.clearActive()
    void ambience.chime(session.status === 'completed' ? 'done' : 'break')
    window.setTimeout(() => ambience.stop(), 1600)
  }, [status, endedAt, startedAt])

  useEffect(() => {
    const id = window.setInterval(() => {
      const timer = useSession.getState().timer
      if (timer.status === 'running') {
        const label = timer.phase === 'break' ? '休息' : '专注'
        document.title = `${formatClock(remainingSec(timer, Date.now()))} ${label} · 耄耋自习室`
      } else {
        document.title = 'LearningRoom · 耄耋自习室'
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [])
}
