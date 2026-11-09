import { useEffect, useState } from 'react'
import { api, presenceWsUrl, type PresenceSnapshot } from '@/lib/api'
import { useSession } from '@/store/useSession'

const CLIENT_KEY = 'lr.clientId.v1'

function getClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_KEY)
    if (existing) return existing
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(CLIENT_KEY, id)
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export function usePresence() {
  const focusing = useSession((s) => s.timer.status === 'running' && s.timer.phase === 'focus')
  const [snapshot, setSnapshot] = useState<PresenceSnapshot | null>(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const clientId = getClientId()
    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let pollTimer: number | null = null
    let closed = false
    let attempts = 0

    const poll = async () => {
      try {
        const next = await api.getPresence()
        setSnapshot(next)
        setOffline(false)
      } catch {
        setOffline(true)
      }
    }

    const connect = () => {
      if (closed) return
      try {
        socket = new WebSocket(presenceWsUrl(clientId, focusing))
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(String(event.data)) as PresenceSnapshot
            if (typeof data.online === 'number') {
              setSnapshot(data)
              setOffline(false)
              attempts = 0
            }
          } catch {
            /* ignore malformed frame */
          }
        }
        socket.onclose = () => {
          socket = null
          if (closed) return
          reconnectTimer = window.setTimeout(connect, Math.min(30_000, 1500 * 2 ** attempts))
          attempts += 1
        }
        socket.onerror = () => socket?.close()
        socket.onopen = () => {
          attempts = 0
          setOffline(false)
        }
      } catch {
        setOffline(true)
        reconnectTimer = window.setTimeout(connect, 10_000)
      }
    }

    void poll()
    connect()
    pollTimer = window.setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) void poll()
    }, 30_000)

    return () => {
      closed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      if (pollTimer) window.clearInterval(pollTimer)
      socket?.close()
    }
  }, [focusing])

  return { ...(snapshot ?? { online: 0, focusing: 0, updatedAt: 0 }), offline }
}
