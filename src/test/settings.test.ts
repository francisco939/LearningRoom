import { beforeEach, describe, expect, it } from 'vitest'
import { KEYS, defaultSettings, loadSettings, saveSettings } from '@/lib/storage'

describe('settings: cat name and supervision migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('旧设置缺少 catName / supervisionEnabled 时使用默认值', () => {
    const old: Record<string, unknown> = { ...defaultSettings }
    delete old.catName
    delete old.supervisionEnabled
    localStorage.setItem(KEYS.settings, JSON.stringify(old))

    const loaded = loadSettings()
    expect(loaded.catName).toBe('耄耋')
    expect(loaded.supervisionEnabled).toBe(true)
  })

  it('保留用户关闭监督的选择', () => {
    saveSettings({ ...defaultSettings, supervisionEnabled: false })
    expect(loadSettings().supervisionEnabled).toBe(false)
  })

  it('清理名字首尾空格并限制 8 个字', () => {
    saveSettings({ ...defaultSettings, catName: '  小橘  ' })
    expect(loadSettings().catName).toBe('小橘')

    saveSettings({ ...defaultSettings, catName: '一二三四五六七八九十' })
    expect(loadSettings().catName).toBe('一二三四五六七八')
  })

  it('空名字回退到默认「耄耋」', () => {
    saveSettings({ ...defaultSettings, catName: '   ' })
    expect(loadSettings().catName).toBe('耄耋')
  })
})
