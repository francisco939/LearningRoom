import { ChevronLeft, ChevronRight, Home, Images } from 'lucide-react'
import { GALLERY, gallerySrc, galleryPoster } from '@/data/gallery'
import { SCENES } from '@/data/scenes'
import { cn } from '@/lib/cn'
import { useSettings } from '@/store/useSettings'
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
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const galleryMode = settings.backgroundMode === 'gallery'

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="背景"
      subtitle="房间场景或动态图集，选一个待着的地方"
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => update({ backgroundMode: 'room' })}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition',
            !galleryMode
              ? 'border-amber/45 bg-amber/[0.07]'
              : 'border-paper/8 bg-black/15 hover:border-paper/20',
          )}
        >
          <Home size={16} className={galleryMode ? 'text-paper/35' : 'text-amber/80'} />
          <span>
            <span className="block text-[14px] text-paper/85">房间场景</span>
            <span className="mt-0.5 block text-[11px] text-paper/35">雨夜 / 黄昏 / 清晨</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => update({ backgroundMode: 'gallery' })}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition',
            galleryMode
              ? 'border-amber/45 bg-amber/[0.07]'
              : 'border-paper/8 bg-black/15 hover:border-paper/20',
          )}
        >
          <Images size={16} className={galleryMode ? 'text-amber/80' : 'text-paper/35'} />
          <span>
            <span className="block text-[14px] text-paper/85">动态图集</span>
            <span className="mt-0.5 block text-[11px] text-paper/35">30 张，自动轮换</span>
          </span>
        </button>
      </div>

      {!galleryMode ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {SCENES.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => update({ backgroundMode: 'room', scene: scene.id })}
              className={cn(
                'overflow-hidden rounded-xl border text-left transition',
                settings.scene === scene.id
                  ? 'border-amber/50 ring-1 ring-amber/20'
                  : 'border-paper/8 hover:border-paper/25',
              )}
            >
              <span
                className="relative block h-20 w-full overflow-hidden"
                style={{
                  background: `linear-gradient(160deg, ${scene.palette.wall} 0%, ${scene.palette.wall2} 55%, ${scene.palette.sky2} 100%)`,
                }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}${scene.photo}`}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              </span>
              <span className="block px-3 py-2">
                <span className="block text-[13px] text-paper/80">{scene.name}</span>
                <span className="mt-0.5 block text-[12px] text-paper/35">{scene.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-paper/10 bg-black/20 px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-[13px] text-paper/60">
              <Images size={14} className="shrink-0 text-amber/80" />
              <span className="truncate">
                当前：{GALLERY.find((item) => item.id === currentId)?.title ?? '未选择'}
              </span>
            </span>
            <div className="flex shrink-0 items-center gap-1">
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-paper/40">轮换</span>
            {[
              [5, '5 分钟'],
              [10, '10 分钟'],
              [15, '15 分钟'],
              [0, '关闭'],
            ].map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => update({ galleryRotateMin: Number(value) })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[12px] transition',
                  settings.galleryRotateMin === value
                    ? 'border-amber/40 text-amber/90'
                    : 'border-paper/10 text-paper/45 hover:text-paper/75',
                )}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => update({ galleryShuffle: !settings.galleryShuffle })}
              className={cn(
                'ml-auto rounded-full border px-3 py-1.5 text-[12px] transition',
                settings.galleryShuffle
                  ? 'border-amber/40 text-amber/90'
                  : 'border-paper/10 text-paper/45 hover:text-paper/75',
              )}
            >
              随机顺序
            </button>
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
                  <span className="mt-0.5 block truncate text-[10px] text-paper/35">
                    {item.credit}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}
