export interface LevelDef {
  minHours: number
  name: string
  note: string
}

export const LEVELS: LevelDef[] = [
  { minHours: 0, name: '陌生猫', note: '它还在打量你' },
  { minHours: 5, name: '面熟', note: '它记得你的味道了' },
  { minHours: 20, name: '常客', note: '它开始给你留位置' },
  { minHours: 50, name: '猫友', note: '它允许你摸一下' },
  { minHours: 100, name: '耄耋认可', note: '它把尾巴搭在你脚边' },
]

export function levelFor(totalFocusSec: number): { index: number; current: LevelDef; next: LevelDef | null } {
  const hours = totalFocusSec / 3600
  let index = 0
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (hours >= LEVELS[i].minHours) index = i
  }
  return {
    index,
    current: LEVELS[index],
    next: LEVELS[index + 1] ?? null,
  }
}
