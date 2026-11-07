import type { AchievementId, Progress, Session } from '@/lib/types'

export interface AchievementDef {
  id: AchievementId
  name: string
  description: string
  test: (progress: Progress, session: Session) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-session',
    name: '初次见面',
    description: '完成第一场自习',
    test: (p) => p.completedSessions >= 1,
  },
  {
    id: 'first-pomodoro',
    name: '第一个番茄',
    description: '完成一轮番茄钟',
    test: (p, s) => p.completedSessions >= 1 && s.mode === 'pomodoro' && s.status === 'completed',
  },
  {
    id: 'ten-sessions',
    name: '十次报到',
    description: '累计完成 10 场自习',
    test: (p) => p.completedSessions >= 10,
  },
  {
    id: 'streak-3',
    name: '连坐三天',
    description: '连续 3 天完成自习',
    test: (p) => p.streak >= 3,
  },
  {
    id: 'streak-7',
    name: '一周不断',
    description: '连续 7 天完成自习',
    test: (p) => p.streak >= 7,
  },
  {
    id: 'clean-session',
    name: '滴水不漏',
    description: '三星完成一场自习',
    test: (p, s) => p.completedSessions >= 1 && s.starsLeft === 3 && s.status === 'completed',
  },
  {
    id: 'strict-clean',
    name: '在耄耋眼皮底下',
    description: '严格模式三星完成一场自习',
    test: (_p, s) => s.starsLeft === 3 && s.supervision === 'strict' && s.status === 'completed',
  },
  {
    id: 'night-owl',
    name: '夜猫子',
    description: '在 00:00–04:00 之间完成一场自习',
    test: (_p, s) => {
      if (s.status !== 'completed') return false
      const h = new Date(s.endedAt).getHours()
      return h >= 0 && h < 4
    },
  },
  {
    id: 'early-bird',
    name: '早起猫',
    description: '在 05:00–08:00 之间完成一场自习',
    test: (_p, s) => {
      if (s.status !== 'completed') return false
      const h = new Date(s.endedAt).getHours()
      return h >= 5 && h < 8
    },
  },
  {
    id: 'ten-hours',
    name: '十小时',
    description: '累计专注 10 小时',
    test: (p) => p.totalFocusSec >= 10 * 3600,
  },
  {
    id: 'fifty-hours',
    name: '五十小时',
    description: '累计专注 50 小时',
    test: (p) => p.totalFocusSec >= 50 * 3600,
  },
  {
    id: 'all-scenes',
    name: '三个房间',
    description: '在三个场景里都完成过自习',
    test: (_p) => _p.scenesUsed.length >= 3,
  },
  {
    id: 'fish-100',
    name: '一百条鱼干',
    description: '累计获得 100 条小鱼干',
    test: (p) => p.fish >= 100,
  },
]

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id)
