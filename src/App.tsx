import { useEffect, useState, type ReactNode } from 'react'
import { SceneStage } from '@/components/scene/SceneStage'
import { GalleryStage } from '@/components/scene/GalleryStage'
import { useGallery } from '@/hooks/useGallery'
import type { GalleryItem } from '@/data/gallery'
import { TopBar } from '@/components/hud/TopBar'
import { TimerDock } from '@/components/timer/TimerDock'
import { TimerControls } from '@/components/timer/TimerControls'
import { PortraitFrame, type CatState } from '@/components/supervisor/PortraitFrame'
import { PeekCat } from '@/components/supervisor/PeekCat'
import { CatBubble } from '@/components/supervisor/CatBubble'
import { ViolationStamp } from '@/components/supervisor/ViolationStamp'
import { HistoryPanel } from '@/components/panels/HistoryPanel'
import { AchievementsPanel } from '@/components/panels/AchievementsPanel'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { GalleryPanel } from '@/components/panels/GalleryPanel'
import { AccountPanel } from '@/components/panels/AccountPanel'
import { CommunityPanel } from '@/components/panels/CommunityPanel'
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
import { useAuth } from '@/store/useAuth'
import { usePresence } from '@/hooks/usePresence'
import { useSync } from '@/hooks/useSync'
import { progressRatio, remainingSec } from '@/lib/timer'
import { sceneById, type SceneDef } from '@/data/scenes'
import { PURE_STUDY_ROOM } from '@/lib/studyMode'

type PanelId =
  | 'history'
  | 'achievements'
  | 'settings'
  | 'gallery'
  | 'account'
  | 'community'
  | null

function readAuthParams(): { kind: 'verify' | 'reset' | null; token: string | null } {
  try {
    const params = new URLSearchParams(window.location.search)
    const kind = params.get('auth')
    const token = params.get('token')
    if ((kind === 'verify' || kind === 'reset') && token) return { kind, token }
  } catch {
    /* ignore */
  }
  return { kind: null, token: null }
}

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
  const gallery = useGallery()
  const presence = usePresence()
  const sync = useSync()
  const refreshAuth = useAuth((s) => s.refresh)
  const supervisionEnabled = !PURE_STUDY_ROOM && settings.supervisionEnabled

  const [initialAuth] = useState(readAuthParams)
  const [panel, setPanel] = useState<PanelId>(() => (initialAuth.kind ? 'account' : null))
  const [onboarding, setOnboarding] = useState(!progress.onboarded)
  const resetToken = initialAuth.kind === 'reset' ? initialAuth.token : null

  useHotkeys(() => setPanel(null))

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  useEffect(() => {
    if (!initialAuth.kind || !initialAuth.token) return
    if (initialAuth.kind === 'verify') {
      void useAuth.getState().verifyEmail(initialAuth.token)
    }
    window.history.replaceState({}, '', window.location.pathname)
  }, [initialAuth])

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
      if (!useSettings.getState().settings.supervisionEnabled) return
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
        supervisionEnabled && peek?.tone === 'yell'
          ? 'stage-shake relative h-[100dvh] w-full overflow-hidden'
          : 'relative h-[100dvh] w-full overflow-hidden'
      }
    >
      <BackgroundLayer
        mode={settings.backgroundMode}
        scene={scene}
        reducedMotion={reduced}
        current={gallery.current}
        previous={gallery.previous}
      >
        <TopBar
          onOpenHistory={() => setPanel('history')}
          onOpenAchievements={() => setPanel('achievements')}
          onOpenSettings={() => setPanel('settings')}
          onOpenGallery={() => setPanel('gallery')}
          onOpenAccount={() => setPanel('account')}
          onOpenCommunity={() => setPanel('community')}
          presence={presence}
        />

        <main className="absolute inset-0 z-10">
          <TimerDock
            remaining={remaining}
            ratio={ratio}
            compact={timer.status === 'running'}
            onOpenSettings={() => setPanel('settings')}
          />
        </main>

        {supervisionEnabled && (
          <>
            <PortraitFrame
              image={image}
              name={settings.catName}
              state={catState}
              away={Boolean(peek)}
            />
            <CatBubble />
            <PeekCat />
            {peek?.tone === 'yell' && <div key={peek.id} className="scene-flash" aria-hidden />}
          </>
        )}

        <div className="scene-label absolute bottom-7 left-7 z-20 hidden select-none sm:block">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.42em] text-paper/40">
            <span className="h-1 w-1 rounded-full bg-amber/80" />
            {settings.backgroundMode === 'gallery' ? 'GALLERY' : 'SCENE'}
          </div>
          <div className="mt-2 font-display text-[22px] tracking-[0.06em] text-paper/90">
            {settings.backgroundMode === 'gallery' ? gallery.current.title : scene.name}
          </div>
          <div className="mt-1 text-[12px] text-paper/45">
            {settings.backgroundMode === 'gallery'
              ? `${gallery.current.credit} · ${gallery.current.license}`
              : scene.subtitle}
          </div>
        </div>

        {timer.status !== 'running' && (
          <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <TimerControls onOpenSettings={() => setPanel('settings')} />
          </div>
        )}
      </BackgroundLayer>

      <AccountPanel
        open={panel === 'account'}
        onClose={() => setPanel(null)}
        resetToken={resetToken}
        sync={sync}
      />
      <CommunityPanel
        open={panel === 'community'}
        onClose={() => setPanel(null)}
        presence={presence}
      />
      <GalleryPanel
        open={panel === 'gallery'}
        onClose={() => setPanel(null)}
        currentId={gallery.current.id}
        onSelect={gallery.select}
        onPrev={gallery.prev}
        onNext={gallery.next}
      />
      <HistoryPanel open={panel === 'history'} onClose={() => setPanel(null)} />
      <AchievementsPanel open={panel === 'achievements'} onClose={() => setPanel(null)} />
      <SettingsPanel open={panel === 'settings'} onClose={() => setPanel(null)} />
      <ResultOverlay onOpenHistory={() => setPanel('history')} />
      <Onboarding open={onboarding} onDone={() => setOnboarding(false)} />
      {supervisionEnabled && <ViolationStamp />}
    </div>
  )
}

function BackgroundLayer({
  mode,
  scene,
  reducedMotion,
  current,
  previous,
  children,
}: {
  mode: 'gallery' | 'room'
  scene: SceneDef
  reducedMotion: boolean
  current: GalleryItem
  previous: GalleryItem | null
  children: ReactNode
}) {
  if (mode === 'gallery') {
    return (
      <GalleryStage current={current} previous={previous} reducedMotion={reducedMotion}>
        {children}
      </GalleryStage>
    )
  }
  return (
    <SceneStage scene={scene} reducedMotion={reducedMotion}>
      {children}
    </SceneStage>
  )
}
