import type { Env } from './env'

const PRESENCE_STATE_KEY = 'presence-state'
const PRESENCE_TTL_MS = 60_000
const CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u

interface PresenceAttachment {
  clientId: string
  connectionId: string
}

interface PresenceEntry {
  connectionId: string
  focusing: boolean
  lastSeen: number
}

interface PresenceState {
  entries: Record<string, PresenceEntry>
  updatedAt: number
}

interface PresenceSnapshot {
  online: number
  focusing: number
  updatedAt: string
}

function attachmentOf(socket: WebSocket): PresenceAttachment | null {
  const value = socket.deserializeAttachment()
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<PresenceAttachment>
  if (typeof candidate.clientId !== 'string' || typeof candidate.connectionId !== 'string') {
    return null
  }
  return {
    clientId: candidate.clientId,
    connectionId: candidate.connectionId,
  }
}

export class PresenceRoom {
  private readonly ctx: DurableObjectState
  private queue: Promise<unknown> = Promise.resolve()

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.endsWith('/snapshot')) {
      const state = await this.loadState()
      return Response.json(this.snapshot(state))
    }

    if (url.pathname.endsWith('/ws')) {
      return this.lock(() => this.connect(request, url))
    }

    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Unknown presence operation' } },
      { status: 404 },
    )
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return
    if (message.length > 4096) return

    let payload: unknown
    try {
      payload = JSON.parse(message)
    } catch {
      return
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return
    const data = payload as Record<string, unknown>

    await this.lock(async () => {
      const attachment = attachmentOf(socket)
      if (!attachment) return

      const state = await this.loadState()
      const entry = state.entries[attachment.clientId]
      if (!entry || entry.connectionId !== attachment.connectionId) return

      const now = Date.now()
      entry.lastSeen = now

      let changed = false
      if (data.type === 'focus' && typeof data.focusing === 'boolean') {
        if (entry.focusing !== data.focusing) {
          entry.focusing = data.focusing
          state.updatedAt = now
          changed = true
        }
      }

      await this.saveState(state)
      await this.scheduleAlarm(state)
      if (changed) this.broadcast(this.snapshot(state))
    })
  }

  async webSocketClose(socket: WebSocket, code: number, reason: string): Promise<void> {
    await this.lock(async () => {
      const attachment = attachmentOf(socket)
      if (!attachment) return

      const state = await this.loadState()
      const entry = state.entries[attachment.clientId]
      if (!entry || entry.connectionId !== attachment.connectionId) return

      delete state.entries[attachment.clientId]
      state.updatedAt = Date.now()
      await this.saveState(state)
      await this.scheduleAlarm(state)
      this.broadcast(this.snapshot(state))
    })

    try {
      socket.close(code, reason)
    } catch {
      // The socket may already be closed.
    }
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    try {
      socket.close(1011, 'WebSocket error')
    } catch {
      // The socket may already be closed.
    }
  }

  async alarm(): Promise<void> {
    await this.lock(async () => {
      const now = Date.now()
      const state = await this.loadState()
      const expired = new Set<string>()

      for (const [clientId, entry] of Object.entries(state.entries)) {
        if (now - entry.lastSeen >= PRESENCE_TTL_MS) {
          delete state.entries[clientId]
          expired.add(clientId)
        }
      }

      const liveConnections = new Map<string, string>()
      for (const socket of this.ctx.getWebSockets()) {
        const attachment = attachmentOf(socket)
        if (!attachment) {
          try {
            socket.close(4000, 'Presence expired')
          } catch {
            // Already closed.
          }
          continue
        }
        const entry = state.entries[attachment.clientId]
        if (!entry || entry.connectionId !== attachment.connectionId) {
          expired.add(attachment.clientId)
          try {
            socket.close(4000, 'Presence expired')
          } catch {
            // Already closed.
          }
          continue
        }
        liveConnections.set(attachment.clientId, attachment.connectionId)
      }

      for (const clientId of Object.keys(state.entries)) {
        if (!liveConnections.has(clientId)) {
          delete state.entries[clientId]
          expired.add(clientId)
        }
      }

      if (expired.size > 0) {
        state.updatedAt = now
        await this.saveState(state)
        this.broadcast(this.snapshot(state))
      }
      await this.scheduleAlarm(state)
    })
  }

  private lock<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation)
    this.queue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  private async connect(request: Request, url: URL): Promise<Response> {
    const upgrade = request.headers.get('upgrade')?.toLowerCase()
    if (upgrade !== 'websocket') {
      return Response.json(
        {
          error: {
            code: 'UPGRADE_REQUIRED',
            message: 'Expected a WebSocket upgrade request',
          },
        },
        { status: 426 },
      )
    }

    const clientId = url.searchParams.get('clientId')?.trim() ?? ''
    if (!CLIENT_ID_PATTERN.test(clientId)) {
      return Response.json(
        {
          error: {
            code: 'INVALID_CLIENT_ID',
            message: 'clientId must be 1-128 safe characters',
          },
        },
        { status: 400 },
      )
    }

    for (const existing of this.ctx.getWebSockets()) {
      const attachment = attachmentOf(existing)
      if (attachment?.clientId === clientId) {
        try {
          existing.close(4001, 'Connection replaced')
        } catch {
          // Already closed.
        }
      }
    }

    const pair = new WebSocketPair()
    const [clientSocket, serverSocket] = Object.values(pair)
    if (!clientSocket || !serverSocket) {
      return new Response('WebSocket upgrade failed', { status: 500 })
    }

    const connectionId = crypto.randomUUID()
    serverSocket.serializeAttachment({ clientId, connectionId } satisfies PresenceAttachment)
    this.ctx.acceptWebSocket(serverSocket)

    const state = await this.loadState()
    state.entries[clientId] = {
      connectionId,
      focusing: false,
      lastSeen: Date.now(),
    }
    state.updatedAt = Date.now()
    await this.saveState(state)
    await this.scheduleAlarm(state)
    this.broadcast(this.snapshot(state))

    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    })
  }

  private snapshot(state: PresenceState): PresenceSnapshot {
    const entries = Object.values(state.entries)
    return {
      online: entries.length,
      focusing: entries.filter((entry) => entry.focusing).length,
      updatedAt: new Date(state.updatedAt).toISOString(),
    }
  }

  private broadcast(snapshot: PresenceSnapshot): void {
    const payload = JSON.stringify(snapshot)
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload)
      } catch {
        // A close event will reconcile stale entries.
      }
    }
  }

  private async loadState(): Promise<PresenceState> {
    const stored = await this.ctx.storage.get<PresenceState>(PRESENCE_STATE_KEY)
    if (stored && stored.entries) return stored
    return { entries: {}, updatedAt: Date.now() }
  }

  private async saveState(state: PresenceState): Promise<void> {
    await this.ctx.storage.put(PRESENCE_STATE_KEY, state)
  }

  private async scheduleAlarm(state: PresenceState): Promise<void> {
    const entries = Object.values(state.entries)
    if (entries.length === 0) {
      await this.ctx.storage.deleteAlarm()
      return
    }

    const nextExpiry = Math.min(...entries.map((entry) => entry.lastSeen + PRESENCE_TTL_MS))
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 500, nextExpiry + 100))
  }
}
