import type { ReactNode } from 'react'
import type { SceneDef } from '@/data/scenes'
import { sceneVars } from '@/lib/sceneVars'
import { RainCanvas } from './RainCanvas'
import { WindowView } from './WindowView'

interface SceneStageProps {
  scene: SceneDef
  reducedMotion: boolean
  children?: ReactNode
}

export function SceneStage({ scene, reducedMotion, children }: SceneStageProps) {
  return (
    <div className="scene" style={sceneVars(scene)} data-scene={scene.id}>
      <div className="scene-wall" />

      <div className="scene-window">
        <div className="window-glass">
          <WindowView scene={scene} />
          <RainCanvas enabled={scene.weather === 'rain' && !reducedMotion} />
          <div className="window-sheen" />
        </div>
        <div className="window-mullion-v" />
        <div className="window-mullion-h" />
      </div>

      {scene.lamp && (
        <div className="scene-lamp" aria-hidden>
          <div className="lamp-glow" />
          <div className="lamp-base" />
          <div className="lamp-arm" />
          <div className="lamp-shade" />
        </div>
      )}

      <div className="scene-desk" aria-hidden>
        <div className="desk-sheen" />
        <div className="desk-books">
          <span />
          <span />
          <span />
        </div>
        <div className="desk-mug" />
        <div className="desk-paper" />
        <div className="desk-plant">
          <div className="plant-leaf" />
          <div className="plant-leaf" />
          <div className="plant-leaf" />
          <div className="plant-pot" />
        </div>
      </div>

      {children}

      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />
    </div>
  )
}
