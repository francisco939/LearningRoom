import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/store/useAuth'
import { useProgress } from '@/store/useProgress'
import { useSettings } from '@/store/useSettings'
import { mergeSync, normalizeRemote } from '@/lib/sync'

export function useSync() {
  const user = useAuth((s) => s.user)
  const sessions = useProgress((s) => s.sessions)
  const progress = useProgress((s) => s.progress)
  const settings = useSettings((s) => s.settings)
  const hydrateProgress = useProgress((s) => s.hydrate)
  const hydrateSettings = useSettings((s) => s.hydrate)

  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const initializedFor = useRef<string | null>(null)
  const lastPayload = useRef('')

  const push = useCallback(async () => {
    const currentUser = useAuth.getState().user
    if (!currentUser || !currentUser.emailVerified) return
    setSyncing(true)
    setError(null)
    try {
      const payload = mergeSync(
        {
          settings: useSettings.getState().settings,
          progress: useProgress.getState().progress,
          sessions: useProgress.getState().sessions,
        },
        null,
      )
      const signature = JSON.stringify(payload)
      if (signature !== lastPayload.current) {
        await api.putSync(payload)
        lastPayload.current = signature
      }
      setLastSynced(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败')
    } finally {
      setSyncing(false)
    }
  }, [])

  const syncNow = useCallback(async () => {
    const currentUser = useAuth.getState().user
    if (!currentUser || !currentUser.emailVerified) return
    setSyncing(true)
    setError(null)
    try {
      const remote = normalizeRemote(await api.getSync())
      const merged = mergeSync(
        {
          settings: useSettings.getState().settings,
          progress: useProgress.getState().progress,
          sessions: useProgress.getState().sessions,
        },
        remote,
      )
      if (merged.progress) hydrateProgress(merged.progress, merged.sessions)
      if (merged.settings) hydrateSettings(merged.settings)
      await api.putSync(merged)
      lastPayload.current = JSON.stringify(merged)
      setLastSynced(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败')
    } finally {
      setSyncing(false)
    }
  }, [hydrateProgress, hydrateSettings])

  useEffect(() => {
    if (!user || !user.emailVerified) {
      initializedFor.current = null
      return
    }
    if (initializedFor.current === user.id) return
    initializedFor.current = user.id
    void syncNow()
  }, [user, syncNow])

  useEffect(() => {
    if (!user?.emailVerified) return
    const id = window.setTimeout(() => void push(), 2000)
    return () => window.clearTimeout(id)
  }, [user, sessions, progress, settings, push])

  return {
    syncing,
    lastSynced,
    error,
    syncNow,
  }
}
