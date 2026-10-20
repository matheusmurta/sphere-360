/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sphere 360',
        short_name: 'Sphere 360',
        description: 'Galeria imersiva de fotos 360° com suporte a VR Cardboard',
        lang: 'pt-BR',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ]
  if (mode === 'https') plugins.push(basicSsl())

  return {
    plugins,
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { host: mode === 'https' ? true : undefined },
    test: {
      environment: 'jsdom',
      include: ['tests/unit/**/*.spec.ts'],
      setupFiles: ['tests/unit/setup.ts'],
    },
  }
})
