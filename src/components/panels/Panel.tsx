import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PanelProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function Panel({ open, title, subtitle, onClose, children, wide = false }: PanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'panel-scroll relative z-10 flex h-full w-full flex-col overflow-y-auto border-l border-paper/10',
          'bg-[#171210]/95 shadow-[-30px_0_80px_rgba(0,0,0,0.55)]',
          'animate-[rise_0.3s_ease-out]',
          wide ? 'sm:w-[620px]' : 'sm:w-[520px]',
        )}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-paper/10 bg-[#171210]/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="font-display text-2xl tracking-[0.12em] text-paper">{title}</h2>
            {subtitle && <p className="mt-1.5 text-[13px] text-paper/50">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="关闭面板"
            className="grid h-10 w-10 place-items-center rounded-full border border-paper/10 text-paper/60 transition hover:bg-paper/10 hover:text-paper"
          >
            <X size={17} />
          </button>
        </header>
        <div className="flex-1 px-6 py-5">{children}</div>
      </section>
    </div>
  )
}
