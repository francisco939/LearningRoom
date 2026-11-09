import { ChevronLeft, ChevronRight, Images } from 'lucide-react'
import { GALLERY, gallerySrc, galleryPoster } from '@/data/gallery'
import { cn } from '@/lib/cn'
import { Panel } from './Panel'

interface GalleryPanelProps {
  open: boolean
  onClose: () => void
  currentId: string
  onSelect: (id: string) => void
  onPrev: () => void
  onNext: () => void
}

export function GalleryPanel({
  open,
  onClose,
  currentId,
  onSelect,
  onPrev,
  onNext,
}: GalleryPanelProps) {
  return (
    <Panel
      open={open}
      onClose={onClose}
      title="动态图集"
      subtitle="30 个房间背景 · 自动轮换，也可以手动挑一个"
    >
      <div className="flex items-center justify-between rounded-xl border border-paper/10 bg-black/20 px-3 py-2.5">
        <span className="flex items-center gap-2 text-[13px] text-paper/60">
          <Images size={14} className="text-amber/80" />
          当前：{GALLERY.find((item) => item.id === currentId)?.title ?? '未选择'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            aria-label="上一张"
            className="grid h-8 w-8 place-items-center rounded-full text-paper/55 transition hover:bg-paper/10 hover:text-paper"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="下一张"
            className="grid h-8 w-8 place-items-center rounded-full text-paper/55 transition hover:bg-paper/10 hover:text-paper"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GALLERY.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'group overflow-hidden rounded-xl border text-left transition',
              item.id === currentId
                ? 'border-amber/55 bg-amber/[0.08]'
                : 'border-paper/10 bg-black/20 hover:border-paper/25',
            )}
          >
            <span className="relative block aspect-[16/9] overflow-hidden bg-black/40">
              <img
                src={item.kind === 'video' ? galleryPoster(item) : gallerySrc(item)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                onError={(event) => {
                  const image = event.currentTarget
                  if (image.dataset.fallback) {
                    image.style.opacity = '0'
                    return
                  }
                  image.dataset.fallback = '1'
                  image.src = `${import.meta.env.BASE_URL}gallery/images/01.webp`
                }}
              />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[9px] tracking-wider text-paper/70">
                {item.kind === 'video' ? '动态' : '静态'}
              </span>
            </span>
            <span className="block px-2.5 py-2">
              <span className="block truncate text-[13px] text-paper/80">{item.title}</span>
              <span className="mt-0.5 block truncate text-[10px] text-paper/35">{item.credit}</span>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  )
}
