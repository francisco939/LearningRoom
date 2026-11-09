import { useCallback, useEffect, useRef } from 'react'
import { useSession } from '@/store/useSession'
import { useSettings } from '@/store/useSettings'
import { useCamera } from '@/store/useCamera'
import {
  acquireCamera,
  CameraUnavailableError,
  createMotionGate,
  MOTION,
} from '@/lib/cameraPresence'

// 摄像头查岗：只在耄耋探头查岗的那几秒开摄像头，用帧差判断画面里是否有人/在动。
// 检测到动静 → 自动过关（ackPatrol）；到点仍无动静 → 记过「看不到你」。
// 摄像头启动失败时交回 useSupervisor 现有的手动「喵」超时，不影响原逻辑。
export function useCameraWatch(): void {
  const patrol = useSession((s) => s.patrol)
  const cameraWatch = useSettings((s) => s.settings.cameraWatch)
  const supervisionEnabled = useSettings((s) => s.settings.supervisionEnabled)

  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const deadlineRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    if (deadlineRef.current !== null) window.clearTimeout(deadlineRef.current)
    deadlineRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    videoRef.current?.remove()
    videoRef.current = null
    useCamera.getState().setActive(false)
  }, [])

  useEffect(() => {
    const enabled = cameraWatch && supervisionEnabled
    if (!patrol || !enabled) {
      stop()
      return
    }

    let cancelled = false
    const gate = createMotionGate()
    useCamera.getState().setPresent(false)
    useCamera.getState().setActive(true)
    useCamera.getState().setStatus('watching')

    const cleanup = () => {
      cancelled = true
      stop()
      if (useCamera.getState().status === 'watching') useCamera.getState().setStatus('granted')
    }

    void acquireCamera()
      .then((cam) => {
        if (cancelled) {
          cam.stop()
          return
        }

        // 到点兜底：窗口结束仍无动静 → 「看不到你」。
        deadlineRef.current = window.setTimeout(() => {
          const session = useSession.getState()
          if (!session.patrol) return
          const anchor = session.peek?.anchor ?? 'window'
          session.showPeek(anchor, 'yell')
          session.violation('absent')
        }, Math.max(0, patrol.deadline - Date.now()))

        const video = document.createElement('video')
        video.muted = true
        video.playsInline = true
        video.autoplay = true
        video.srcObject = cam.stream
        Object.assign(video.style, {
          position: 'fixed',
          left: '-9999px',
          top: '0',
          width: '2px',
          height: '2px',
          opacity: '0',
          pointerEvents: 'none',
        })
        video.setAttribute('aria-hidden', 'true')
        document.body.appendChild(video)
        videoRef.current = video
        streamRef.current = cam.stream

        const { frameWidth: W, frameHeight: H } = MOTION
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        const sample = () => {
          if (!ctx || video.readyState < 2) return
          try {
            ctx.drawImage(video, 0, 0, W, H)
            const data = ctx.getImageData(0, 0, W, H).data
            if (!gate.push(data)) return
            useCamera.getState().setPresent(true)
            if (useSession.getState().patrol) useSession.getState().ackPatrol()
          } catch {
            /* 忽略单帧采样失败 */
          }
        }

        intervalRef.current = window.setInterval(sample, MOTION.sampleIntervalMs)
        video.addEventListener('loadeddata', sample, { once: true })
      })
      .catch((err) => {
        if (cancelled) return
        // 摄像头不可用：交回 useSupervisor 的手动超时，不再接管本次窗口。
        useCamera.getState().setActive(false)
        if (err instanceof CameraUnavailableError) {
          useCamera.getState().setStatus(err.reason === 'denied' ? 'denied' : 'unsupported', err.message)
        } else {
          useCamera.getState().setStatus('unsupported', '无法打开摄像头')
        }
      })

    return cleanup
  }, [patrol, cameraWatch, supervisionEnabled, stop])
}
