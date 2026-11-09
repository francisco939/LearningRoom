import { Users } from 'lucide-react'
import { Panel } from './Panel'
import type { PresenceSnapshot } from '@/lib/api'

interface CommunityPanelProps {
  open: boolean
  onClose: () => void
  presence: PresenceSnapshot & { offline: boolean }
}

export function CommunityPanel({ open, onClose, presence }: CommunityPanelProps) {
  return (
    <Panel open={open} onClose={onClose} title="交流区" subtitle="先做一个安静的在线人数">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-paper/10 bg-black/20 px-4 py-4">
          <div className="flex items-center gap-1.5 text-[11px] tracking-wider text-paper/40">
            <Users size={13} /> 在线
          </div>
          <div className="tabular mt-2 text-3xl text-paper/90">
            {presence.offline ? '—' : presence.online}
          </div>
        </div>
        <div className="rounded-xl border border-paper/10 bg-black/20 px-4 py-4">
          <div className="flex items-center gap-1.5 text-[11px] tracking-wider text-paper/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" /> 专注中
          </div>
          <div className="tabular mt-2 text-3xl text-paper/90">
            {presence.offline ? '—' : presence.focusing}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-paper/15 px-4 py-8 text-center">
        <p className="text-[14px] text-paper/55">交流区下一版开放</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-paper/30">
          先只统计在线人数。消息流、登录发言、举报和管理后台会在后续版本加入。
        </p>
      </div>

      {/*
        TODO(community): 下一版实现单房间消息流。
        - GET/POST /api/community/messages（登录后发言，200 字上限，限流，举报）
        - Durable Object 或 SSE 推送新消息 / 在线人数
        - 不在本版本创建 messages 表或发送框。
      */}
    </Panel>
  )
}
