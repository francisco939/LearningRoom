export interface AmbienceTrack {
  id: string
  name: string
  description: string
  src: string
  credit: string
  license: string
}

export const AMBIENCE: AmbienceTrack[] = [
  {
    id: 'rain',
    name: '雨',
    description: '窗外下雨，房间很干',
    src: 'audio/rain.m4a',
    credit: '用户提供',
    license: '仅用于本项目',
  },
  {
    id: 'cafe',
    name: '咖啡馆',
    description: '森林咖啡馆的爵士与杯碟',
    src: 'audio/ambience/cafe.m4a',
    credit: '用户提供',
    license: '仅用于本项目',
  },
  {
    id: 'library',
    name: '图书馆',
    description: '翻书、暖气与远处脚步',
    src: 'audio/ambience/library.m4a',
    credit: '用户提供',
    license: '仅用于本项目',
  },
  {
    id: 'fireplace',
    name: '壁炉',
    description: '木头燃烧的细响',
    src: 'audio/ambience/fireplace.m4a',
    credit: '用户提供',
    license: '仅用于本项目',
  },
  {
    id: 'night',
    name: '夜',
    description: '虫鸣、风与很远的车流',
    src: 'audio/ambience/night.m4a',
    credit: '用户提供',
    license: '仅用于本项目',
  },
]

export const AMBIENCE_MAP = new Map(AMBIENCE.map((track) => [track.id, track]))
export const DEFAULT_AMBIENCE_ID = 'rain'

export function ambienceById(id: string): AmbienceTrack {
  return AMBIENCE_MAP.get(id) ?? AMBIENCE[0]
}
