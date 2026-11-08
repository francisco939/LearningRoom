import { useState } from 'react'
import { CatFace } from './CatFace'
import { cn } from '@/lib/cn'

export type CatState = 'idle' | 'patrol' | 'sleep' | 'angry'

interface PortraitFrameProps {
  image: string | null
  name: string
  state: CatState
  away?: boolean
}

const DEFAULT_SRC = `${import.meta.env.BASE_URL}supervisor/maodie.webp`

export function PortraitFrame({ image, name, state, away = false }: PortraitFrameProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const src = image ?? DEFAULT_SRC
  const displayName = name.trim() || '耄耋'
  const showImage = failedSrc !== src

  return (
    <div
      className={cn('portrait', away && 'is-away')}
      data-state={state}
      aria-label={`${displayName}督学`}
      aria-hidden={away}
    >
      <div className="portrait-frame">
        {showImage ? (
          <img
            className="portrait-img"
            src={src}
            alt={`${displayName}，一只上了年纪的橘猫，正眯着眼盯人`}
            onError={() => setFailedSrc(src)}
          />
        ) : (
          <CatFace className="cat-fallback" />
        )}
      </div>
      <div className="portrait-plaque" title={displayName}>
        {displayName}
      </div>
    </div>
  )
}
