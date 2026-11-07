import { useState } from 'react'
import { ArrowRight, Check, Eye, PawPrint, Timer } from 'lucide-react'
import { useSettings } from '@/store/useSettings'
import { useProgress } from '@/store/useProgress'
import { cn } from '@/lib/cn'

interface OnboardingProps {
  open: boolean
  onDone: () => void
}

export function Onboarding({ open, onDone }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const update = useSettings((s) => s.update)
  const setOnboarded = useProgress((s) => s.setOnboarded)

  if (!open) return null

  const finish = () => {
    setOnboarded()
    onDone()
  }

  const steps = [
    {
      icon: <PawPrint size={16} />,
      eyebrow: '退休监学猫',
      title: '这是耄耋',
      body: '它不抓老鼠了，改抓摸鱼。你负责坐住，它负责偶尔抬头看你一眼。',
      extra: (
        <div className="mx-auto mt-5 w-32 overflow-hidden rounded-lg border border-paper/20 bg-black/30 p-1 shadow-xl">
          <img
            src={`${import.meta.env.BASE_URL}supervisor/maodie.webp`}
            alt="一只上了年纪的橘猫，正眯着眼盯人"
            className="aspect-[4/5] w-full rounded object-cover"
          />
        </div>
      ),
    },
    {
      icon: <Timer size={16} />,
      eyebrow: '先定个节奏',
      title: '选一种坐法',
      body: '番茄钟适合大多数人；倒计时适合只想坐一段；秒表适合不想被结束打断的人。',
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
                <span className="block text-sm text-paper/85">{preset.label}</span>
                <span className="text-[11px] text-paper/35">{preset.hint}</span>
              </span>
              <ArrowRight size={15} className="text-paper/30" />
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: <Eye size={16} />,
      eyebrow: '规则很简单',
      title: '它只看你在不在',
      body: '耄耋不打开摄像头，也不读你的屏幕。它只在意两件事：你有没有突然消失，以及它叫你的时候你有没有应声。',
      extra: (
        <ul className="mt-5 space-y-2 text-left text-xs text-paper/55">
          {[
            '切走标签页超时，扣一颗星',
            '巡查时 15 秒内按空格或点「喵」',
            '三颗星扣光，这一轮作废',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check size={14} className="mt-0.5 shrink-0 text-amber" />
              {item}
            </li>
          ))}
        </ul>
      ),
    },
  ]

  const current = steps[step]

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 px-4 backdrop-blur-[3px]">
      <div className="w-full max-w-md rounded-2xl border border-paper/12 bg-[#1a1410]/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.7)] sm:p-8">
        <div className="flex items-center gap-2 text-amber/80">
          {current.icon}
          <span className="text-[10px] tracking-[0.32em]">{current.eyebrow}</span>
        </div>
        <h2 className="mt-4 font-display text-2xl tracking-wide text-paper sm:text-[28px]">
          {current.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-paper/60">{current.body}</p>
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
                className="rounded-full px-3 py-2 text-xs text-paper/45 transition hover:text-paper"
              >
                返回
              </button>
            )}
            <button
              type="button"
              onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-amber to-amber-deep px-5 py-2.5 text-xs font-medium text-ink transition hover:brightness-110"
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
            className="mt-4 w-full text-center text-[10px] tracking-widest text-paper/25 transition hover:text-paper/50"
          >
            跳过
          </button>
        )}
      </div>
    </div>
  )
}
