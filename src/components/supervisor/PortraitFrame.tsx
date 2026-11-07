import { useState } from 'react'
import { CatFace } from './CatFace'

export type CatState = 'idle' | 'patrol' | 'sleep' | 'angry'

interface PortraitFrameProps {
  image: string | null
  state: CatState
}

const DEFAULT_SRC = `${import.meta.env.BASE_URL}supervisor/maodie.webp`

export function PortraitFrame({ image, state }: PortraitFrameProps) {
  const [failed, setFailed] = useState(false)
  const src = image ?? DEFAULT_SRC
  const showImage = !failed

  return (
    <div className="portrait" data-state={state} aria-label="耄耋督学">
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
