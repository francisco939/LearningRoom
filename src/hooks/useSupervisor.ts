import { useCallback, useEffect, useRef } from 'react'
import { useSession } from '@/store/useSession'
import { useSettings } from '@/store/useSettings'
import { useCamera } from '@/store/useCamera'
import {
  LIGHT_PATROL_MS,
  LIGHT_WARN_MS,
  configFor,
  judgeAway,
  nextPatrolAt,
  withinCooldown,
} from '@/lib/supervision'
import { pickAnchor } from '@/lib/peek'
import type { PeekAnchor } from '@/lib/peek'
import { ambience } from '@/lib/audio'

export function useSupervisor(): void {
  const status = useSession((s) => s.timer.status)
  const phase = useSession((s) => s.timer.phase)
  const startedAt = useSession((s) => s.timer.startedAt)
  const patrol = useSession((s) => s.patrol)
  const lightPatrol = useSession((s) => s.lightPatrol)
  const leave = useSession((s) => s.leave)
  const supervision = useSettings((s) => s.settings.supervision)
  const enabled = useSettings((s) => s.settings.supervisionEnabled)

  const patrolTimer = useRef<number | null>(null)
  const lightTimer = useRef<number | null>(null)
  const warnTimer = useRef<number | null>(null)
  const checkinTimer = useRef<number | null>(null)
  const hasPatrolled = useRef(false)
  const hiddenAt = useRef<number | null>(null)
  const lastActivity = useRef(0)
  const lastViolation = useRef(0)
  const prevPatrol = useRef(patrol)
  const prevLight = useRef(lightPatrol)
  const prevLeave = useRef(leave)
  const escalating = useRef(false)
  const triggerRef = useRef<() => void>(() => {})

  const clearTimers = useCallback(() => {
    if (patrolTimer.current) window.clearTimeout(patrolTimer.current)
    if (lightTimer.current) window.clearTimeout(lightTimer.current)
    if (warnTimer.current) window.clearTimeout(warnTimer.current)
    if (checkinTimer.current) window.clearTimeout(checkinTimer.current)
    patrolTimer.current = null
    lightTimer.current = null
    warnTimer.current = null
    checkinTimer.current = null
  }, [])

  // 正式探头：轻巡查没通过才走到这里。先只响一声（1.2s 预警），再弹探头 + 15s 应声。
  const triggerFormal = useCallback(
    (anchor: PeekAnchor) => {
      if (useSession.getState().leave) return
      escalating.current = true
      useSession.getState().clearLightPatrol()
      if (useSettings.getState().settings.sound) void ambience.scratch()
      warnTimer.current = window.setTimeout(() => {
        escalating.current = false
        if (useSession.getState().leave) return
        if (useSession.getState().patrol) return
        const now = Date.now()
        const cfg = configFor(supervision)
        useSession.getState().setPatrol(now + cfg.checkInMs, anchor)
        lastActivity.current = now
        if (checkinTimer.current) window.clearTimeout(checkinTimer.current)
        checkinTimer.current = window.setTimeout(() => {
          if (!useSession.getState().patrol) return
          // 摄像头接管本次查岗时，由 useCameraWatch 判定「看不到你」，这里不再重复记过。
          if (useCamera.getState().active) return
          lastViolation.current = Date.now()
          useSession.getState().showPeek(anchor, 'yell')
          useSession.getState().violation('no-checkin')
          useSession.getState().clearPatrol()
        }, cfg.checkInMs)
      }, LIGHT_WARN_MS)
    },
    [supervision],
  )

  // 轻巡查：极轻一声 + 顶栏爪印闪，8s 内有鼠标动作就放过，否则升级正式探头。
  const triggerLight = useCallback(() => {
    if (!useSettings.getState().settings.supervisionEnabled) return
    if (useSession.getState().leave) return
    if (document.hidden) {
      // 页面在后台时不要丢掉这次巡查，稍后重试；否则一次错过就再也不会巡查。
      patrolTimer.current = window.setTimeout(() => triggerRef.current(), 5000)
      return
    }
    const now = Date.now()
    const scene = useSettings.getState().settings.scene
    const anchor = pickAnchor(scene)
    hasPatrolled.current = true
    lastActivity.current = now
    if (useSettings.getState().settings.sound) void ambience.scratch()
    useSession.getState().setLightPatrol(now + LIGHT_PATROL_MS)
    if (lightTimer.current) window.clearTimeout(lightTimer.current)
    lightTimer.current = window.setTimeout(() => {
      if (useSession.getState().lightPatrol) triggerFormal(anchor)
    }, LIGHT_PATROL_MS)
  }, [triggerFormal])

  const schedule = useCallback(
    (first: boolean) => {
      if (!useSettings.getState().settings.supervisionEnabled) return
      if (useSession.getState().leave) return
      if (patrolTimer.current) window.clearTimeout(patrolTimer.current)
      const now = Date.now()
      const at = nextPatrolAt(now, configFor(supervision), first)
      patrolTimer.current = window.setTimeout(triggerLight, Math.max(1000, at - now))
    },
    [supervision, triggerLight],
  )

  useEffect(() => {
    triggerRef.current = triggerLight
  }, [triggerLight])

  // 关闭监督时清掉进行中的巡查/探头/轻巡查，避免界面残留。
  useEffect(() => {
    if (enabled) return
    clearTimers()
    escalating.current = false
    useSession.getState().clearPatrol()
    useSession.getState().clearLightPatrol()
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

  // 正式探头清除后，排下一轮。
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

  // 轻巡查「放过」后（没升级正式探头）也排下一轮；escalating 挡住 1.2s 预警窗口内的假放过。
  useEffect(() => {
    if (!enabled) {
      prevLight.current = lightPatrol
      return
    }
    if (prevLight.current && !lightPatrol && !escalating.current && !useSession.getState().patrol) {
      if (status === 'running' && phase === 'focus') schedule(false)
    }
    prevLight.current = lightPatrol
  }, [enabled, lightPatrol, status, phase, schedule])

  // 请假结束（手动回来 / 60s 自动失效）后重新排巡查。
  useEffect(() => {
    if (!enabled) {
      prevLeave.current = leave
      return
    }
    if (prevLeave.current && !leave && status === 'running' && phase === 'focus') {
      schedule(false)
    }
    prevLeave.current = leave
  }, [enabled, leave, status, phase, schedule])

  // 轻巡查期间：有鼠标动作就放过（不弹喵）。
  useEffect(() => {
    if (!enabled || !lightPatrol) return
    const pass = () => {
      if (!useSession.getState().lightPatrol) return
      if (lightTimer.current) window.clearTimeout(lightTimer.current)
      lightTimer.current = null
      useSession.getState().clearLightPatrol()
    }
    window.addEventListener('pointerdown', pass, { passive: true })
    window.addEventListener('pointermove', pass, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', pass)
      window.removeEventListener('pointermove', pass)
    }
  }, [enabled, lightPatrol])

  // 请假：立即停掉一切巡查定时器，到期自动 returnEarly。
  useEffect(() => {
    if (!leave) return
    clearTimers()
    escalating.current = false
    const ms = Math.max(0, leave.until - Date.now())
    const id = window.setTimeout(() => useSession.getState().returnEarly(), ms)
    return () => window.clearTimeout(id)
  }, [leave, clearTimers])

  // 离座判定
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
      if (useSession.getState().leave) return
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

  // 无操作提前触发查岗（走轻巡查）
  useEffect(() => {
    if (!enabled) return
    const cfg = configFor(supervision)
    const id = window.setInterval(() => {
      if (useSession.getState().leave) return
      const timer = useSession.getState().timer
      if (timer.status !== 'running' || timer.phase !== 'focus') return
      if (useSession.getState().patrol || useSession.getState().lightPatrol) return
      const last = lastActivity.current || Date.now()
      if (Date.now() - last < cfg.idleMs) return
      triggerLight()
    }, 5000)
    return () => window.clearInterval(id)
  }, [enabled, supervision, triggerLight])
}
