import { useState } from 'react'
import { CatFace } from './CatFace'
import { cn } from '@/lib/cn'

export type CatState = 'idle' | 'patrol' | 'sleep' | 'angry'

interface PortraitFrameProps {
  image: string | null
  state: CatState
  away?: boolean
}

const DEFAULT_SRC = `${import.meta.env.BASE_URL}supervisor/maodie.webp`

export function PortraitFrame({ image, state, away = false }: PortraitFrameProps) {
  const [failed, setFailed] = useState(false)
  const src = image ?? DEFAULT_SRC
  const showImage = !failed

  return (
    <div
      className={cn('portrait', away && 'is-away')}
      data-state={state}
      aria-label="耄耋督学"
      aria-hidden={away}
    >
      <div className="portrait-frame">
        {showImage ? (
          <img
            className="portrait-img"
            src={src}
            alt="一只上了年纪的橘猫，正眯着眼盯人"
            onError={() => setFailed(true)}
          />
        ) : (
          <CatFace className="cat-fallback" />
        )}
      </div>
      <div className="portrait-plaque">耄 耋</div>
    </div>
  )
}
