import { describe, expect, it } from 'vitest'
import { GALLERY, galleryById, galleryNeighbors } from '@/data/gallery'

describe('gallery manifest', () => {
  it('包含 30 项：20 静图 + 10 动态', () => {
    expect(GALLERY).toHaveLength(30)
    expect(GALLERY.filter((item) => item.kind === 'image')).toHaveLength(20)
    expect(GALLERY.filter((item) => item.kind === 'video')).toHaveLength(10)
  })

  it('首尾循环', () => {
    const first = GALLERY[0]
    const last = GALLERY[GALLERY.length - 1]
    expect(galleryNeighbors(first.id).prev.id).toBe(last.id)
    expect(galleryNeighbors(last.id).next.id).toBe(first.id)
  })

  it('未知 id 回退到第一项', () => {
    expect(galleryById('missing').id).toBe(GALLERY[0].id)
  })
})
