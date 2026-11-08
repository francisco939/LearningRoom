import { useRef, useState } from 'react'
import { Upload, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { useSettings } from '@/store/useSettings'
import { useProgress } from '@/store/useProgress'
import { useSession } from '@/store/useSession'
import { useCatImage } from '@/hooks/useCatImage'
import { SCENES } from '@/data/scenes'
import { ambience } from '@/lib/audio'
import type { SupervisionMode } from '@/lib/types'
import { Panel } from './Panel'
import { cn } from '@/lib/cn'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const SUPERVISION: { id: SupervisionMode; name: string; desc: string }[] = [
  { id: 'lenient', name: '宽松', desc: '8–15 分钟巡查，离开 90 秒才记过' },
  { id: 'standard', name: '标准', desc: '4–8 分钟巡查，离开 45 秒记过' },
  { id: 'strict', name: '严格', desc: '2–4 分钟巡查，离开 20 秒记过' },
]

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const resetSettings = useSettings((s) => s.reset)
  const resetProgress = useProgress((s) => s.reset)
  const resetSession = useSession((s) => s.resetSession)
  const setResult = useSession((s) => s.setResult)
  const { image, error, save, remove } = useCatImage()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <Panel open={open} onClose={onClose} title="设置" subtitle="所有数据只保存在这台设备上">
      <div className="space-y-8">
        <Section title="节奏">
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label="专注（分）"
              value={settings.focusMin}
              min={1}
              max={180}
              onChange={(value) => update({ focusMin: value })}
            />
            <NumberField
              label="休息（分）"
              value={settings.breakMin}
              min={1}
              max={60}
              onChange={(value) => update({ breakMin: value })}
            />
            <NumberField
              label="轮数"
              value={settings.rounds}
              min={1}
              max={12}
              onChange={(value) => update({ rounds: value })}
            />
          </div>
          <Toggle
            label="专注结束自动开始休息"
            checked={settings.autoStartBreak}
            onChange={(checked) => update({ autoStartBreak: checked })}
          />
          <Toggle
            label="休息结束自动开始下一轮"
            checked={settings.autoStartFocus}
            onChange={(checked) => update({ autoStartFocus: checked })}
          />
          <p className="text-[12px] leading-relaxed text-paper/35">
            未开始时修改会立即同步到主界面；开始后只影响下一场，不会打断当前计时。
          </p>
        </Section>

        <Section title="耄耋的巡查">
          <Toggle
            label="启用耄耋监督"
            checked={settings.supervisionEnabled}
            onChange={(checked) => update({ supervisionEnabled: checked })}
          />
          <div
            className={cn(
              'grid gap-2 transition',
              !settings.supervisionEnabled && 'pointer-events-none opacity-35',
            )}
          >
            {SUPERVISION.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => update({ supervision: item.id })}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition',
                  settings.supervision === item.id
                    ? 'border-amber/40 bg-amber/[0.07]'
                    : 'border-paper/8 bg-black/15 hover:border-paper/20',
                )}
              >
                <span>
                  <span className="block text-[15px] text-paper/85">{item.name}</span>
                  <span className="mt-0.5 block text-[12px] text-paper/40">{item.desc}</span>
                </span>
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    settings.supervision === item.id ? 'bg-amber' : 'bg-paper/20',
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed text-paper/35">
            {settings.supervisionEnabled
              ? '耄耋只看你是否在场：切走标签页、查岗不应声会扣星；它不打开摄像头。'
              : '纯自习模式：没有探头、查岗和扣星，计时、记录与场景照常。'}
          </p>
        </Section>

        <Section title="场景">
          <div className="grid gap-2 sm:grid-cols-3">
            {SCENES.map((scene) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => update({ scene: scene.id })}
                className={cn(
                  'overflow-hidden rounded-xl border text-left transition',
                  settings.scene === scene.id
                    ? 'border-amber/50 ring-1 ring-amber/20'
                    : 'border-paper/8 hover:border-paper/25',
                )}
              >
                <span
                  className="relative block h-16 w-full overflow-hidden"
                  style={{
                    background: `linear-gradient(160deg, ${scene.palette.wall} 0%, ${scene.palette.wall2} 55%, ${scene.palette.sky2} 100%)`,
                  }}
                >
                  <img
                    src={`${import.meta.env.BASE_URL}${scene.photo}`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
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
        </Section>

        <Section title="声音">
          <Toggle
            label="雨声与环境音"
            checked={settings.sound}
            onChange={(checked) => {
              update({ sound: checked })
              if (checked) void ambience.start(settings.volume)
              else ambience.stop()
            }}
          />
          <label className="flex items-center gap-3 text-[13px] text-paper/55">
            音量
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.volume * 100)}
              onChange={(event) => {
                const volume = Number(event.target.value) / 100
                update({ volume })
                ambience.setVolume(volume)
              }}
              className="h-1 flex-1 accent-[#e3a45c]"
            />
            <span className="tabular w-8 text-right text-paper/35">{Math.round(settings.volume * 100)}</span>
          </label>
        </Section>

        <Section title="督学形象">
          <label className="block">
            <span className="text-[12px] tracking-wider text-paper/40">督学名字</span>
            <input
              type="text"
              value={settings.catName}
              maxLength={8}
              placeholder="耄耋"
              onChange={(event) => update({ catName: event.target.value })}
              onBlur={() => {
                const name = settings.catName.trim() || '耄耋'
                if (name !== settings.catName) update({ catName: name })
              }}
              className="mt-1.5 w-full rounded-lg border border-paper/10 bg-black/20 px-3 py-2 text-[14px] text-paper/85 outline-none transition focus:border-amber/45"
            />
            <span className="mt-1 block text-[11px] text-paper/30">显示在相框下方，最多 8 个字</span>
          </label>

          <div className="mt-5 flex items-center gap-4">
            <div className="relative h-[90px] w-[72px] shrink-0 overflow-hidden rounded border border-paper/15 bg-black/30">
              {image ? (
                <img src={image} alt="自定义督学形象" className="h-full w-full object-cover" />
              ) : (
                <img
                  src={`${import.meta.env.BASE_URL}supervisor/maodie.webp`}
                  alt="默认督学形象"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-[12px] leading-relaxed text-paper/40">
                默认是项目自带的橘猫肖像。也可以换成自己的图，只保存在本机。
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 px-3 py-1.5 text-[12px] text-paper/70 transition hover:bg-paper/10"
                >
                  <Upload size={13} /> 上传图片
                </button>
                {settings.hasCustomCat && (
                  <button
                    type="button"
                    onClick={() => void remove()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 px-3 py-1.5 text-[12px] text-paper/55 transition hover:bg-paper/10"
                  >
                    <Trash2 size={13} /> 移除图片
                  </button>
                )}
              </div>
              {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void save(file)
                  event.target.value = ''
                }}
              />
            </div>
          </div>

        </Section>

        <Section title="动效">
          <div className="flex gap-2">
            {(
              [
                ['system', '跟随系统'],
                ['on', '减少动效'],
                ['off', '完整动效'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ reducedMotion: value })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[12px] transition',
                  settings.reducedMotion === value
                    ? 'border-amber/40 bg-amber/10 text-amber'
                    : 'border-paper/10 text-paper/45 hover:bg-paper/10',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="数据">
          <p className="text-[12px] leading-relaxed text-paper/40">
            记录、成就、鱼干与设置都存在浏览器本地。清理浏览器数据会一并丢失。
          </p>
          {confirmReset ? (
            <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
              <div className="flex items-start gap-2 text-[12px] text-paper/70">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
                确定要清空所有记录吗？此操作不可撤销。
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetProgress()
                    resetSettings()
                    resetSession()
                    setResult(null)
                    setConfirmReset(false)
                    void remove()
                    onClose()
                  }}
                  className="rounded-full bg-danger/85 px-3 py-1.5 text-[12px] text-paper transition hover:bg-danger"
                >
                  确认清空
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-full border border-paper/15 px-3 py-1.5 text-[12px] text-paper/60"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-paper/15 px-3 py-1.5 text-[12px] text-paper/60 transition hover:border-danger/40 hover:text-danger"
            >
              <RotateCcw size={13} /> 清空所有数据
            </button>
          )}
        </Section>
      </div>
    </Panel>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[12px] tracking-[0.28em] text-paper/40">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block rounded-xl border border-paper/10 bg-black/15 px-3 py-2">
      <span className="block text-[12px] text-paper/35">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next) && next >= min && next <= max) onChange(Math.round(next))
        }}
        className="tabular mt-1 w-full bg-transparent text-[15px] text-paper/90 outline-none"
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-paper/8 bg-black/15 px-3.5 py-2.5 text-left"
    >
      <span className="text-[13px] text-paper/70">{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition',
          checked ? 'bg-amber/80' : 'bg-paper/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-all',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
