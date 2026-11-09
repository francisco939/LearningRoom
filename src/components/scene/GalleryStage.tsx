import { useState, type ReactNode } from 'react'
import { galleryPoster, gallerySrc, type GalleryItem } from '@/data/gallery'

interface GalleryStageProps {
  current: GalleryItem
  previous: GalleryItem | null
  reducedMotion: boolean
  children?: ReactNode
}

function Media({
  item,
  previous = false,
  still = false,
}: {
  item: GalleryItem
  previous?: boolean
  still?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const poster = galleryPoster(item)
  const fallback =
    item.kind === 'video'
      ? poster
      : `${import.meta.env.BASE_URL}scenes/rainy-study.webp`
  const src = failed ? fallback : gallerySrc(item)
  const className = previous ? 'gallery-layer gallery-out' : 'gallery-layer gallery-in'

  if (item.kind === 'video' && !failed && !previous && !still) {
    return (
      <video
        className={className}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <img
      className={className}
      src={failed ? src : previous || still ? poster : src}
      alt=""
      aria-hidden
      onError={() => setFailed(true)}
    />
  )
}

export function GalleryStage({ current, previous, reducedMotion, children }: GalleryStageProps) {
  return (
    <div className="gallery-stage">
      {previous && <Media key={`prev-${previous.id}`} item={previous} previous />}
      <Media key={current.id} item={current} still={reducedMotion} />
      <div className="gallery-grade" aria-hidden />
      {children}
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />
    </div>
  )
}
