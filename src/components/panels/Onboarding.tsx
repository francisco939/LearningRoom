import { useState } from 'react'
import { ArrowRight, Check, Headphones, MapPin, Timer } from 'lucide-react'
import { useSettings } from '@/store/useSettings'
import { useProgress } from '@/store/useProgress'
import { SCENES } from '@/data/scenes'
import { cn } from '@/lib/cn'

interface OnboardingProps {
  open: boolean
  onDone: () => void
}

export function Onboarding({ open, onDone }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const setOnboarded = useProgress((s) => s.setOnboarded)

  if (!open) return null

  const finish = () => {
    setOnboarded()
    onDone()
  }

  const steps = [
    {
      icon: <MapPin size={16} />,
      eyebrow: 'STILL HERE',
      title: '先选一个地方',
      body: '不必决定得太认真。选一个现在愿意坐下来的房间，之后随时可以换。',
      extra: (
        <div className="mt-5 grid gap-2">
          {SCENES.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => update({ scene: scene.id })}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-2 text-left transition',
                settings.scene === scene.id
                  ? 'border-amber/45 bg-amber/[0.08]'
                  : 'border-paper/10 bg-black/20 hover:border-paper/25',
              )}
            >
              <img
                src={`${import.meta.env.BASE_URL}${scene.photo}`}
                alt=""
                className="h-12 w-20 shrink-0 rounded-md object-cover"
                onError={(event) => {
                  event.currentTarget.style.visibility = 'hidden'
                }}
              />
              <span>
                <span className="block text-[14px] text-paper/85">{scene.name}</span>
                <span className="mt-0.5 block text-[12px] text-paper/40">{scene.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: <Headphones size={16} />,
      eyebrow: 'SOUND ON',
      title: '给房间一点声音',
      body: '雨声、咖啡馆、图书馆、壁炉或夜。环境音只是背景，不会打断你；开始后也可以在设置里换。',
      extra: (
        <div className="mt-5 flex flex-wrap gap-2">
          {['雨声', '咖啡馆', '图书馆', '壁炉', '夜'].map((label) => (
            <span
              key={label}
              className="rounded-full border border-paper/10 bg-black/20 px-3 py-1.5 text-[12px] text-paper/55"
            >
              {label}
            </span>
          ))}
        </div>
      ),
    },
    {
      icon: <Timer size={16} />,
      eyebrow: 'ONE THING',
      title: '让时间变得有意义',
      body: '按下开始后，计时器会缩到右下角，把画面让给房间。暂停或结束时，它会回到中间。',
      extra: (
        <div className="mt-5 grid gap-2">
          {[
            { label: '25 + 5 × 4', hint: '经典番茄', focus: 25, rest: 5, rounds: 4 },
            { label: '45 + 10 × 2', hint: '长时间块', focus: 45, rest: 10, rounds: 2 },
            { label: '50 + 10 × 1', hint: '一口气', focus: 50, rest: 10, rounds: 1 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                update({ focusMin: preset.focus, breakMin: preset.rest, rounds: preset.rounds })
              }
              className="flex items-center justify-between rounded-xl border border-paper/10 bg-black/20 px-4 py-3 text-left transition hover:border-amber/35 hover:bg-amber/[0.05]"
            >
              <span>
                <span className="block text-[15px] text-paper/85">{preset.label}</span>
                <span className="text-[12px] text-paper/40">{preset.hint}</span>
              </span>
              <ArrowRight size={15} className="text-paper/30" />
            </button>
          ))}
        </div>
      ),
    },
  ]

  const current = steps[step]

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 px-4 backdrop-blur-[3px]">
      <div className="w-full max-w-md rounded-2xl border border-paper/12 bg-[#1a1410]/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.7)] sm:p-8">
        <div className="flex items-center gap-2 text-amber/80">
          {current.icon}
          <span className="text-[11px] tracking-[0.32em]">{current.eyebrow}</span>
        </div>
        <h2 className="mt-4 font-display text-3xl tracking-wide text-paper sm:text-[34px]">
          {current.title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-paper/65">{current.body}</p>
        {current.extra}

        <div className="mt-7 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 rounded-full transition-all',
                  index === step ? 'w-6 bg-amber' : 'w-1.5 bg-paper/20',
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="rounded-full px-3 py-2 text-[13px] text-paper/50 transition hover:text-paper"
              >
                返回
              </button>
            )}
            <button
              type="button"
              onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-amber to-amber-deep px-5 py-2.5 text-[13px] font-medium text-ink transition hover:brightness-110"
            >
              {step === steps.length - 1 ? '开始自习' : '下一步'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {step < steps.length - 1 && (
          <button
            type="button"
            onClick={finish}
            className="mt-4 w-full text-center text-[11px] tracking-widest text-paper/30 transition hover:text-paper/50"
          >
            跳过
          </button>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] tracking-wider text-paper/25">
          <Check size={11} /> 无需登录 · 记录只保存在本机
        </div>
      </div>
    </div>
  )
}
