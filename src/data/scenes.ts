import type { SceneId } from '@/lib/types'

export interface ScenePalette {
  wall: string
  wall2: string
  floor: string
  sky: string
  sky2: string
  glow: string
  accent: string
  frame: string
  desk: string
  desk2: string
  window: string
  ink: string
}

export interface SceneDef {
  id: SceneId
  name: string
  subtitle: string
  motif: 'city' | 'library' | 'garden'
  weather: 'rain' | 'none'
  lamp: boolean
  palette: ScenePalette
}

export const SCENES: SceneDef[] = [
  {
    id: 'rainy-study',
    name: '雨夜书房',
    subtitle: '城市在窗外漏水，台灯还亮着',
    motif: 'city',
    weather: 'rain',
    lamp: true,
    palette: {
      wall: '#171310',
      wall2: '#241c16',
      floor: '#0f0b09',
      sky: '#0c1824',
      sky2: '#274050',
      glow: '#e3a45c',
      accent: '#b86b2e',
      frame: '#3a2a1c',
      desk: '#4a2f1d',
      desk2: '#2b1a10',
      window: '#0a1118',
      ink: '#f4e8d2',
    },
  },
  {
    id: 'dusk-library',
    name: '黄昏图书馆',
    subtitle: '尘埃落在旧书脊上，没人催你',
    motif: 'library',
    weather: 'none',
    lamp: true,
    palette: {
      wall: '#241a12',
      wall2: '#3a2a1b',
      floor: '#150f0a',
      sky: '#6b3f22',
      sky2: '#c98a4b',
      glow: '#f0c27a',
      accent: '#a6472f',
      frame: '#4b3420',
      desk: '#5b3a22',
      desk2: '#33200f',
      window: '#2a1a10',
      ink: '#f7ead2',
    },
  },
  {
    id: 'dawn-desk',
    name: '清晨书桌',
    subtitle: '天刚亮，猫比你来得早',
    motif: 'garden',
    weather: 'none',
    lamp: false,
    palette: {
      wall: '#1b2422',
      wall2: '#2c3a35',
      floor: '#121816',
      sky: '#9fb9b2',
      sky2: '#e6d6b8',
      glow: '#d9c79a',
      accent: '#6e7f6a',
      frame: '#3b352a',
      desk: '#57503c',
      desk2: '#332f24',
      window: '#dfe8df',
      ink: '#f2ecd9',
    },
  },
]

export function sceneById(id: SceneId): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]
}
