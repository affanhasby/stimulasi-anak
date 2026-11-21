/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves from /<repo>/: set BASE_PATH at deploy time. Local dev stays at /.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  resolve: {
    // Content data stays in the PRD folder (single source of truth, edited there + build_csv.py).
    alias: { '@data': fileURLToPath(new URL('./PRD dan Data', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Own service worker (src/sw.ts): precache plus Web Push handlers for immunization reminders.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      manifest: {
        name: 'Stimulasi Anak',
        short_name: 'Stimulasi Anak',
        lang: 'id',
        display: 'standalone',
        start_url: base,
        scope: base,
        description: 'Stimulasi harian, jadwal imunisasi, dan catatan si Kecil.',
        theme_color: '#f4f6f3',
        background_color: '#f4f6f3',
        // Rendered from public/icons/icon.svg and maskable.svg (the brand plate) at build-asset time.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
})
