import type { CatMessage } from '@/lib/types'

const LINES: Record<CatMessage['tone'], string[]> = {
  idle: [
    '我眯一会儿，你别偷懒。',
    '椅子拉近点。',
    '书翻页了吗？',
    '别看我，看题。',
    '台灯够亮吗？',
  ],
  patrol: [
    '抬头。',
    '在学吗？',
    '我盯着呢。',
    '刚才那页讲什么的？',
    '手放回桌上。',
    '别以为我没看见。',
  ],
  approve: ['还行。', '算你过关。', '继续。', '嗯。', '这句我记下了。'],
  violation: [
    '哈——气。',
    '记一笔。',
    '你刚才去哪儿了？',
    '我数着呢。',
    '扣一颗。',
    '摄像头里没人。',
    '你坐哪儿去了？',
  ],
  fail: ['出去。', '今天到此为止。', '三颗都没了。', '明天再来。'],
  complete: ['下班。', '明天还来。', '赏你一条鱼干。', '这轮不错。', '尾巴借你摸一下。'],
  leave: ['去吧，我数着呢。', '快去快回。', '我数着呢，别超时。'],
  pardon: ['免你一次。', '算你走运。', '这次给你兜着。'],
  pardoned: ['这次算了。', '免罚用掉了。', '下不为例。'],
}

let lastByTone: Partial<Record<CatMessage['tone'], string>> = {}
let seq = 0

export function nextCatMessage(tone: CatMessage['tone']): CatMessage {
  const pool = LINES[tone]
  const filtered = pool.filter((line) => line !== lastByTone[tone])
  const text = filtered[Math.floor(Math.random() * filtered.length)] ?? pool[0]
  lastByTone = { ...lastByTone, [tone]: text }
  seq += 1
  return { id: seq, text, tone }
}

export function resetCatLines(): void {
  lastByTone = {}
}
