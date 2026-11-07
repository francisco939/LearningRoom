import { del, get, set } from 'idb-keyval'

const CAT_KEY = 'lr-cat-image'
const MAX_SOURCE_BYTES = 10 * 1024 * 1024
const MAX_EDGE = 720

export async function loadCustomCat(): Promise<string | null> {
  try {
    const value = await get<string>(CAT_KEY)
    return typeof value === 'string' && value.startsWith('data:image/') ? value : null
  } catch {
    return null
  }
}

export async function saveCustomCat(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('图片太大了，换一张 10MB 以内的')
  }
  const dataUrl = await compress(file)
  await set(CAT_KEY, dataUrl)
  return dataUrl
}

export async function clearCustomCat(): Promise<void> {
  try {
    await del(CAT_KEY)
  } catch {
    /* ignore */
  }
}

async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持图片处理')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', 0.86)
}
