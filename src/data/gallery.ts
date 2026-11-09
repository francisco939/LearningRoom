export type GalleryKind = 'image' | 'video'

export interface GalleryItem {
  id: string
  kind: GalleryKind
  /** 仓库内相对路径，或 R2 上的 media key */
  src: string
  poster?: string
  title: string
  credit: string
  license: string
  sourceUrl?: string
}

const imageTitles = [
  '雨停之前',
  '靠窗的位置',
  '旧书与台灯',
  '午后的一页',
  '海边的清晨',
  '雪后的窗',
  '安静的走廊',
  '咖啡馆角落',
  '林间小屋',
  '黄昏的桌面',
  '图书馆深处',
  '夜航',
  '清晨的厨房',
  '雨中的车站',
  '山间书房',
  '有风的下午',
  '灯塔与雾',
  '书页之间',
  '壁炉旁',
  '天光',
]

const videoTitles = ['雨窗', '壁炉', '咖啡馆', '夜林', '海浪']
const userVideoTitles = ['我的房间', '我的窗外', '我的桌面', '我的夜晚', '我的清晨']

export const GALLERY: GalleryItem[] = [
  ...imageTitles.map((title, index) => {
    const n = String(index + 1).padStart(2, '0')
    return {
      id: `image-${n}`,
      kind: 'image' as const,
      src: `gallery/images/${n}.webp`,
      title,
      credit: 'Pexels',
      license: 'Pexels License',
      sourceUrl: 'https://www.pexels.com/',
    }
  }),
  ...videoTitles.map((title, index) => {
    const n = String(index + 1).padStart(2, '0')
    return {
      id: `pexels-${n}`,
      kind: 'video' as const,
      src: `gallery/videos/pexels-${n}.mp4`,
      poster: `gallery/posters/pexels-${n}.webp`,
      title,
      credit: 'Pexels',
      license: 'Pexels License',
      sourceUrl: 'https://www.pexels.com/videos/',
    }
  }),
  ...userVideoTitles.map((title, index) => {
    const n = String(index + 1).padStart(2, '0')
    return {
      id: `user-${n}`,
      kind: 'video' as const,
      src: `gallery/videos/user-${n}.mp4`,
      poster: `gallery/posters/user-${n}.webp`,
      title,
      credit: '作者提供',
      license: '作者授权，仅用于本项目',
    }
  }),
]

export const GALLERY_MAP = new Map(GALLERY.map((item) => [item.id, item]))
export const DEFAULT_GALLERY_ID = GALLERY[0].id

export function galleryById(id: string): GalleryItem {
  return GALLERY_MAP.get(id) ?? GALLERY[0]
}

export function galleryIndex(id: string): number {
  const index = GALLERY.findIndex((item) => item.id === id)
  return index < 0 ? 0 : index
}

export function gallerySrc(item: GalleryItem): string {
  const explicit = (import.meta.env.VITE_MEDIA_BASE as string | undefined)?.trim()
  // 默认使用仓库内视频，保证没有 Cloudflare/R2 时也能完整运行。
  // 配好 R2 后再通过 VITE_MEDIA_BASE 切到 media 域名。
  const media = explicit || ''
  const base = item.kind === 'video' && media ? media : import.meta.env.BASE_URL
  return `${base.replace(/\/?$/, '/')}${item.src}`
}

export function galleryPoster(item: GalleryItem): string {
  if (!item.poster) return `${import.meta.env.BASE_URL}gallery/images/01.webp`
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${item.poster}`
}

export function galleryNeighbors(id: string): { prev: GalleryItem; next: GalleryItem } {
  const index = galleryIndex(id)
  return {
    prev: GALLERY[(index - 1 + GALLERY.length) % GALLERY.length],
    next: GALLERY[(index + 1) % GALLERY.length],
  }
}
