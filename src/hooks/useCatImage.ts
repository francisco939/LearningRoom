import { useEffect, useState } from 'react'
import { useSettings } from '@/store/useSettings'
import { clearCustomCat, loadCustomCat, saveCustomCat } from '@/lib/catImage'

export function useCatImage() {
  const hasCustomCat = useSettings((s) => s.settings.hasCustomCat)
  const update = useSettings((s) => s.update)
  const [image, setImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasCustomCat) return
    let alive = true
    void loadCustomCat().then((value) => {
      if (alive) setImage(value)
    })
    return () => {
      alive = false
    }
  }, [hasCustomCat])

  const save = async (file: File) => {
    setError(null)
    try {
      const url = await saveCustomCat(file)
      setImage(url)
      update({ hasCustomCat: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片处理失败')
    }
  }

  const remove = async () => {
    await clearCustomCat()
    setImage(null)
    update({ hasCustomCat: false })
  }

  return { image: hasCustomCat ? image : null, error, save, remove }
}
