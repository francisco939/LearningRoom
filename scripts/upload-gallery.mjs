#!/usr/bin/env node
/**
 * 把 scripts/prepare-gallery.py 生成的视频上传到 R2。
 *
 * 用法：
 *   node scripts/upload-gallery.mjs [bucket]
 *
 * 默认 bucket：learningroom-media
 * 需要本机已 `wrangler login`，或设置 CLOUDFLARE_API_TOKEN。
 * 视频会写到 gallery/videos/<name>，与前端 gallery.ts 的 media key 对应。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const bucket = process.argv[2] || 'learningroom-media'
const source = join(process.cwd(), 'assets-src', 'gallery-out', 'videos')

if (!existsSync(source)) {
  console.error(`找不到 ${source}，先运行 python scripts/prepare-gallery.py`)
  process.exit(1)
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const files = readdirSync(source).filter((name) => name.endsWith('.mp4'))
if (files.length === 0) {
  console.error('没有可上传的 mp4')
  process.exit(1)
}

for (const file of files) {
  const key = `gallery/videos/${file}`
  console.log(`[r2] ${key}`)
  execFileSync(
    npx,
    ['wrangler', 'r2', 'object', 'put', `${bucket}/${key}`, `--file=${join(source, file)}`, '--remote'],
    { stdio: 'inherit' },
  )
}
console.log(`完成：${files.length} 个视频上传到 ${bucket}`)
