import { useEffect } from 'react'
import { useSettings } from '@/store/useSettings'
import { useSession } from '@/store/useSession'
import { ambience } from '@/lib/audio'

export function useAmbience(): void {
  const sound = useSettings((s) => s.settings.sound)
  const volume = useSettings((s) => s.settings.volume)
  const ambienceId = useSettings((s) => s.settings.ambienceId)
  const status = useSession((s) => s.timer.status)

  useEffect(() => {
    ambience.setVolume(volume)
  }, [volume])

  useEffect(() => {
    if (sound && status === 'running') {
      void ambience.start(volume, ambienceId)
    } else {
      ambience.stop()
    }
  }, [sound, status, volume, ambienceId])
}
