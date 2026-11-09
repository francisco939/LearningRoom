import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 相对 base：同时兼容 github.io/LearningRoom/ 和自定义域名根路径。
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'supervisor/maodie.webp'],
      manifest: {
        name: 'LearningRoom · 自习室',
        short_name: 'LearningRoom',
        description: '选一个地方，调好声音，让时间变得有意义。',
        lang: 'zh-CN',
        theme_color: '#14100d',
        background_color: '#14100d',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'],
        globIgnores: ['gallery/**'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.*\.m4a$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ambience-audio',
              expiration: { maxEntries: 8, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\/gallery\/images\/.*\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gallery-images',
              expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // 编辑器原子写入会在源码目录留下临时目录，Vite 的 watcher 不应跟踪它们。
      ignored: ['**/*.tmpdir/**', '**/*.tmp', '**/.DS_Store'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
