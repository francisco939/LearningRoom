import type { Session } from './types'

const DAY_START_HOUR = 4

export function dayKey(ts: number): string {
  const d = new Date(ts - DAY_START_HOUR * 60 * 60 * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function streakAfter(prevDay: string | null, today: string, current: number): number {
  if (!prevDay) return 1
  if (prevDay === today) return Math.max(1, current)
  if (prevDay === previousDayKey(today)) return current + 1
  return 1
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h} 小时 ${m} 分`
  if (m > 0) return `${m} 分钟`
  return `${sec} 秒`
}

export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function sevenDaySeries(sessions: Session[], now: number): { day: string; label: string; sec: number }[] {
  const out: { day: string; label: string; sec: number }[] = []
  const base = new Date(now)
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const key = dayKey(d.getTime())
    const sec = sessions
      .filter((s) => dayKey(s.endedAt) === key)
      .reduce((sum, s) => sum + s.focusedSec, 0)
    out.push({ day: key, label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], sec })
  }
  return out
}

export function todayFocusSec(sessions: Session[], now: number): number {
  const key = dayKey(now)
  return sessions.filter((s) => dayKey(s.endedAt) === key).reduce((sum, s) => sum + s.focusedSec, 0)
}
