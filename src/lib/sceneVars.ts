import type { CSSProperties } from 'react'
import type { SceneDef } from '@/data/scenes'

export function sceneVars(scene: SceneDef): CSSProperties {
  const p = scene.palette
  return {
    ['--wall' as string]: p.wall,
    ['--wall2' as string]: p.wall2,
    ['--floor' as string]: p.floor,
    ['--sky' as string]: p.sky,
    ['--sky2' as string]: p.sky2,
    ['--glow' as string]: p.glow,
    ['--accent' as string]: p.accent,
    ['--frame' as string]: p.frame,
    ['--desk' as string]: p.desk,
    ['--desk2' as string]: p.desk2,
    ['--window' as string]: p.window,
    ['--ink' as string]: p.ink,
  } as CSSProperties
}
