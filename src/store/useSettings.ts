import { create } from 'zustand'
import type { Settings } from '@/lib/types'
import { defaultSettings, loadSettings, saveSettings } from '@/lib/storage'

interface SettingsStore {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  hydrate: (settings: Settings) => void
  reset: () => void
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: loadSettings(),
  update: (patch) => {
    const next: Settings = { ...get().settings, ...patch, version: 1 }
    saveSettings(next)
    set({ settings: next })
  },
  hydrate: (settings) => {
    saveSettings(settings)
    set({ settings })
  },
  reset: () => {
    saveSettings(defaultSettings)
    set({ settings: defaultSettings })
  },
}))
