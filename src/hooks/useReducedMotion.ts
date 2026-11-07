import { useEffect, useState } from 'react'
import { useSettings } from '@/store/useSettings'

const QUERY = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  const setting = useSettings((s) => s.settings.reducedMotion)
  const [system, setSystem] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const onChange = () => setSystem(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return setting === 'on' || (setting === 'system' && system)
}
