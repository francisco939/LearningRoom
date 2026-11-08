import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { SceneStage } from '@/components/scene/SceneStage'
import { TopBar } from '@/components/hud/TopBar'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerRing } from '@/components/timer/TimerRing'
import { TimerControls } from '@/components/timer/TimerControls'
import { ModeSwitch } from '@/components/timer/ModeSwitch'
import { PortraitFrame, type CatState } from '@/components/supervisor/PortraitFrame'
import { PeekCat } from '@/components/supervisor/PeekCat'
import { CatBubble } from '@/components/supervisor/CatBubble'
import { ViolationStamp } from '@/components/supervisor/ViolationStamp'
import { HistoryPanel } from '@/components/panels/HistoryPanel'
import { AchievementsPanel } from '@/components/panels/AchievementsPanel'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { Onboarding } from '@/components/panels/Onboarding'
import { ResultOverlay } from '@/components/panels/ResultOverlay'
import { useSession } from '@/store/useSession'
import { useSettings } from '@/store/useSettings'
import { useProgress } from '@/store/useProgress'
import { useTimerEngine } from '@/hooks/useTimerEngine'
import { useSupervisor } from '@/hooks/useSupervisor'
import { useAmbience } from '@/hooks/useAmbience'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useNow } from '@/hooks/useNow'
import { useCatImage } from '@/hooks/useCatImage'
import { progressRatio, remainingSec } from '@/lib/timer'
import { sceneById } from '@/data/scenes'

type PanelId = 'history' | 'achievements' | 'settings' | null

export default function App() {
  useTimerEngine()
  useSupervisor()
  useAmbience()

  const settings = useSettings((s) => s.settings)
  const progress = useProgress((s) => s.progress)
  const timer = useSession((s) => s.timer)
  const resetSession = useSession((s) => s.resetSession)
  const patrol = useSession((s) => s.patrol)
  const peek = useSession((s) => s.peek)
  const result = useSession((s) => s.result)
  const reduced = useReducedMotion()
  const now = useNow(500)
  const { image } = useCatImage()

  const [panel, setPanel] = useState<PanelId>(null)
  const [onboarding, setOnboarding] = useState(!progress.onboarded)

  useHotkeys(() => setPanel(null))

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'on' : 'off'
  }, [reduced])

  // 未开始时，设置里的时长/模式变化要立即反映到主界面；开始后不打断当前计时。
  useEffect(() => {
    if (timer.status !== 'idle') return
    resetSession()
  }, [
    settings.mode,
    settings.focusMin,
    settings.breakMin,
    settings.rounds,
    settings.autoStartBreak,
    settings.autoStartFocus,
    timer.status,
    resetSession,
  ])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as {
      __lrPeek?: (tone: 'patrol' | 'yell', anchor?: 'window' | 'right' | 'left' | 'bottom') => void
    }
    w.__lrPeek = (tone, anchor = 'window') => {
      const session = useSession.getState()
      if (tone === 'patrol') session.setPatrol(Date.now() + 15_000, anchor)
      else session.showPeek(anchor, 'yell')
    }
  }, [])

  const scene = sceneById(settings.scene)
  const remaining = remainingSec(timer, now)
  const ratio = progressRatio(timer, now)

  const catState: CatState = patrol
    ? 'patrol'
    : timer.phase === 'break'
      ? 'sleep'
      : result?.session.status === 'failed'
        ? 'angry'
        : 'idle'

  return (
    <div
      className={
        peek?.tone === 'yell'
          ? 'stage-shake relative h-[100dvh] w-full overflow-hidden'
          : 'relative h-[100dvh] w-full overflow-hidden'
      }
    >
      <SceneStage scene={scene} reducedMotion={reduced}>
        <TopBar
          onOpenHistory={() => setPanel('history')}
          onOpenAchievements={() => setPanel('achievements')}
          onOpenSettings={() => setPanel('settings')}
        />

        <main className="absolute inset-0 z-10 flex items-center justify-center px-4 pb-[16vh] pt-[10vh]">
          <div className="relative grid place-items-center">
            <div className="timer-halo" aria-hidden />
            <TimerRing ratio={ratio} breaking={timer.phase === 'break'} />
            <div className="relative z-10 flex flex-col items-center">
              <TimerDisplay
                remaining={remaining}
                phase={timer.phase}
                mode={timer.mode}
                round={timer.round}
                totalRounds={timer.totalRounds}
              />
              <div className="mt-7">
                <ModeSwitch />
              </div>
              {timer.status === 'idle' && timer.mode !== 'stopwatch' && (
                <button
                  type="button"
                  onClick={() => setPanel('settings')}
                  aria-label="打开设置修改时长"
                  className="mt-4 flex items-center gap-1.5 rounded-full border border-paper/10 bg-black/25 px-3 py-1.5 text-[13px] tracking-[0.04em] text-paper/55 backdrop-blur-sm transition hover:border-amber/30 hover:text-paper/85"
                >
                  <SlidersHorizontal size={13} />
                  时间在「设置」里改 · 未开始时自动同步
                </button>
              )}
            </div>
          </div>
        </main>

        <PortraitFrame image={image} state={catState} away={Boolean(peek)} />
        <CatBubble />
        <PeekCat />
        {peek?.tone === 'yell' && <div key={peek.id} className="scene-flash" aria-hidden />}

        <div className="scene-label absolute bottom-7 left-7 z-20 hidden select-none sm:block">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.42em] text-paper/40">
            <span className="h-1 w-1 rounded-full bg-amber/80" />
            SCENE
          </div>
          <div className="mt-2 font-display text-[22px] tracking-[0.06em] text-paper/90">
            {scene.name}
          </div>
          <div className="mt-1 text-[12px] text-paper/45">{scene.subtitle}</div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <TimerControls onOpenSettings={() => setPanel('settings')} />
        </div>
      </SceneStage>

      <HistoryPanel open={panel === 'history'} onClose={() => setPanel(null)} />
      <AchievementsPanel open={panel === 'achievements'} onClose={() => setPanel(null)} />
      <SettingsPanel open={panel === 'settings'} onClose={() => setPanel(null)} />
      <ResultOverlay onOpenHistory={() => setPanel('history')} />
      <Onboarding open={onboarding} onDone={() => setOnboarding(false)} />
      <ViolationStamp />
    </div>
  )
}
