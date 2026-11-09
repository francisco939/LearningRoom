import { useCallback, useEffect, useRef } from 'react'
import { useSession } from '@/store/useSession'
import { useSettings } from '@/store/useSettings'
import { configFor, judgeAway, nextPatrolAt, withinCooldown } from '@/lib/supervision'
import { pickAnchor } from '@/lib/peek'
import { PURE_STUDY_ROOM } from '@/lib/studyMode'

export function useSupervisor(): void {
  const status = useSession((s) => s.timer.status)
  const phase = useSession((s) => s.timer.phase)
  const startedAt = useSession((s) => s.timer.startedAt)
  const patrol = useSession((s) => s.patrol)
  const supervision = useSettings((s) => s.settings.supervision)
  const supervisionEnabled = useSettings((s) => s.settings.supervisionEnabled)
  const enabled = !PURE_STUDY_ROOM && supervisionEnabled

  const patrolTimer = useRef<number | null>(null)
  const checkinTimer = useRef<number | null>(null)
  const hasPatrolled = useRef(false)
  const hiddenAt = useRef<number | null>(null)
  const lastActivity = useRef(0)
  const lastViolation = useRef(0)
  const prevPatrol = useRef(patrol)
  const triggerRef = useRef<() => void>(() => {})

  const clearTimers = useCallback(() => {
    if (patrolTimer.current) window.clearTimeout(patrolTimer.current)
    if (checkinTimer.current) window.clearTimeout(checkinTimer.current)
    patrolTimer.current = null
    checkinTimer.current = null
  }, [])

  const triggerPatrol = useCallback(() => {
    if (!useSettings.getState().settings.supervisionEnabled) return
    if (document.hidden) {
      // 页面在后台时不要丢掉这次巡查，稍后重试；否则一次错过就再也不会巡查。
      patrolTimer.current = window.setTimeout(() => triggerRef.current(), 5000)
      return
    }
    const now = Date.now()
    const cfg = configFor(supervision)
    const scene = useSettings.getState().settings.scene
    const anchor = pickAnchor(scene)
    hasPatrolled.current = true
    useSession.getState().setPatrol(now + cfg.checkInMs, anchor)
    lastActivity.current = now
    if (checkinTimer.current) window.clearTimeout(checkinTimer.current)
    checkinTimer.current = window.setTimeout(() => {
      if (!useSession.getState().patrol) return
      lastViolation.current = Date.now()
      useSession.getState().showPeek(anchor, 'yell')
      useSession.getState().violation('no-checkin')
      useSession.getState().clearPatrol()
    }, cfg.checkInMs)
  }, [supervision])

  const schedule = useCallback(
    (first: boolean) => {
      if (!useSettings.getState().settings.supervisionEnabled) return
      if (patrolTimer.current) window.clearTimeout(patrolTimer.current)
      const now = Date.now()
      const at = nextPatrolAt(now, configFor(supervision), first)
      patrolTimer.current = window.setTimeout(triggerPatrol, Math.max(1000, at - now))
    },
    [supervision, triggerPatrol],
  )

  useEffect(() => {
    triggerRef.current = triggerPatrol
  }, [triggerPatrol])

  // 关闭监督时清掉进行中的巡查/探头，避免界面残留。
  useEffect(() => {
    if (enabled) return
    clearTimers()
    useSession.getState().clearPatrol()
    useSession.getState().dismissPeek()
    useSession.getState().clearStamp()
  }, [enabled, clearTimers])

  // 新的一场开始：重置「首轮巡查」与活动计时。必须排在 schedule 之前，
  // 这样 StrictMode 的二次 effect 仍然会使用「首轮 60–120 秒」的节奏。
  useEffect(() => {
    hasPatrolled.current = false
    lastActivity.current = Date.now()
  }, [startedAt])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      return clearTimers
    }
    if (status === 'running' && phase === 'focus') {
      schedule(!hasPatrolled.current)
    } else {
      clearTimers()
    }
    return clearTimers
  }, [enabled, status, phase, schedule, clearTimers])

  useEffect(() => {
    if (!enabled) {
      prevPatrol.current = patrol
      return
    }
    if (prevPatrol.current && !patrol) {
      if (checkinTimer.current) window.clearTimeout(checkinTimer.current)
      checkinTimer.current = null
      if (status === 'running' && phase === 'focus') schedule(false)
    }
    prevPatrol.current = patrol
  }, [enabled, patrol, status, phase, schedule])

  useEffect(() => {
    if (!enabled) return
    const cfg = configFor(supervision)

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now()
        return
      }
      const hiddenMs = hiddenAt.current ? Date.now() - hiddenAt.current : 0
      hiddenAt.current = null
      if (hiddenMs <= 0) return
      const timer = useSession.getState().timer
      if (timer.status !== 'running' || timer.phase !== 'focus') return
      if (!judgeAway(hiddenMs, cfg)) return
      if (withinCooldown(lastViolation.current, Date.now())) return
      lastViolation.current = Date.now()
      useSession.getState().showPeek(pickAnchor(useSettings.getState().settings.scene), 'yell')
      useSession.getState().violation('away')
    }

    const touch = () => {
      lastActivity.current = Date.now()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pointerdown', touch, { passive: true })
    window.addEventListener('keydown', touch)
    window.addEventListener('pointermove', touch, { passive: true })

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointerdown', touch)
      window.removeEventListener('keydown', touch)
      window.removeEventListener('pointermove', touch)
    }
  }, [enabled, supervision])

  useEffect(() => {
    if (!enabled) return
    const cfg = configFor(supervision)
    const id = window.setInterval(() => {
      const timer = useSession.getState().timer
      if (timer.status !== 'running' || timer.phase !== 'focus') return
      if (useSession.getState().patrol) return
      const last = lastActivity.current || Date.now()
      if (Date.now() - last < cfg.idleMs) return
      triggerPatrol()
    }, 5000)
    return () => window.clearInterval(id)
  }, [enabled, supervision, triggerPatrol])
}
