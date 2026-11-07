import type { SceneId } from './types'

export type PeekAnchor = 'window' | 'left' | 'right' | 'bottom'

const ANCHORS: Record<SceneId, PeekAnchor[]> = {
  'rainy-study': ['window', 'right'],
  'dusk-library': ['window', 'left'],
  'dawn-desk': ['window', 'right', 'bottom'],
}

export function pickAnchor(scene: SceneId): PeekAnchor {
  const options = ANCHORS[scene] ?? ['window']
  return options[Math.floor(Math.random() * options.length)] ?? 'window'
}
