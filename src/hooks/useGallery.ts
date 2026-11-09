import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from '@/store/useSettings'
import {
  GALLERY,
  galleryById,
  galleryNeighbors,
  type GalleryItem,
} from '@/data/gallery'

export function useGallery() {
  const galleryId = useSettings((s) => s.settings.galleryId)
  const rotateMin = useSettings((s) => s.settings.galleryRotateMin)
  const shuffle = useSettings((s) => s.settings.galleryShuffle)
  const update = useSettings((s) => s.update)

  const [current, setCurrent] = useState<GalleryItem>(() => galleryById(galleryId))
  const [previous, setPrevious] = useState<GalleryItem | null>(null)
  const clearPrevious = useRef<number | null>(null)

  const show = useCallback(
    (item: GalleryItem) => {
      setPrevious((old) => (old?.id === item.id ? old : current))
      setCurrent(item)
      update({ galleryId: item.id })
      if (clearPrevious.current) window.clearTimeout(clearPrevious.current)
      clearPrevious.current = window.setTimeout(() => setPrevious(null), 1200)
    },
    [current, update],
  )

  const select = useCallback(
    (id: string) => {
      const item = galleryById(id)
      if (item.id !== current.id) show(item)
    },
    [current.id, show],
  )

  const next = useCallback(() => {
    if (GALLERY.length < 2) return
    let item = galleryNeighbors(current.id).next
    if (shuffle) {
      item = GALLERY[Math.floor(Math.random() * GALLERY.length)]
      if (item.id === current.id) item = galleryNeighbors(current.id).next
    }
    show(item)
  }, [current.id, shuffle, show])

  const prev = useCallback(() => {
    if (GALLERY.length < 2) return
    show(galleryNeighbors(current.id).prev)
  }, [current.id, show])

  useEffect(() => {
    if (rotateMin <= 0) return
    const id = window.setInterval(next, rotateMin * 60_000)
    return () => window.clearInterval(id)
  }, [next, rotateMin])

  useEffect(() => {
    return () => {
      if (clearPrevious.current) window.clearTimeout(clearPrevious.current)
    }
  }, [])

  return { current, previous, select, next, prev }
}
