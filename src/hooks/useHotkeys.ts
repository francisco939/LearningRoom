import { useEffect } from 'react'
import { useSession } from '@/store/useSession'
import { useSettings } from '@/store/useSettings'
import { ambience } from '@/lib/audio'

export function useHotkeys(onEscape?: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const session = useSession.getState()
      const settings = useSettings.getState()
      const key = event.key.toLowerCase()

      if (key === ' ' || event.code === 'Space') {
        if (tag === 'button') return
        event.preventDefault()
        if (session.patrol) {
          session.ackPatrol()
          return
        }
        if (session.timer.status === 'running') {
          session.pause()
        } else if (session.timer.status === 'paused') {
          session.resume()
        } else {
          if (settings.settings.sound) void ambience.start(settings.settings.volume)
          session.start(settings.settings)
        }
        return
      }

      if (key === 's') {
        if (session.timer.status === 'running' || session.timer.status === 'paused') {
          session.skip()
        }
        return
      }

      if (key === 'r') {
        if (session.timer.status !== 'idle') {
          session.abort()
          session.setResult(null)
        }
        return
      }

      if (['1', '2', '3'].includes(key) && session.timer.status === 'idle') {
        const modes = ['pomodoro', 'countdown', 'stopwatch'] as const
        settings.update({ mode: modes[Number(key) - 1] })
        return
      }

      if (key === 'escape') {
        onEscape?.()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEscape])
}
