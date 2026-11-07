import { useEffect, useState } from 'react'
import { SceneStage } from '@/components/scene/SceneStage'
import { TopBar } from '@/components/hud/TopBar'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerRing } from '@/components/timer/TimerRing'
import { TimerControls } from '@/components/timer/TimerControls'
import { ModeSwitch } from '@/components/timer/ModeSwitch'
import { PortraitFrame, type CatState } from '@/components/supervisor/PortraitFrame'
import { PatrolPrompt } from '@/components/supervisor/PatrolPrompt'
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
  const patrol = useSession((s) => s.patrol)
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
    <div className="relative h-[100dvh] w-full overflow-hidden">
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
            </div>
          </div>
        </main>

        <PortraitFrame image={image} state={catState} />
        <CatBubble />
        <PatrolPrompt />

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
