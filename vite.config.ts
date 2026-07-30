import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sunny Bench NYC',
        short_name: 'Sunny Bench',
        description: 'Find a nearby NYC street bench likely to be sunny right now.',
        theme_color: '#f4a83b',
        background_color: '#fff9e9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/data\.cityofnewyork\.us\/resource\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'nyc-bench-data', networkTimeoutSeconds: 5, expiration: { maxEntries: 20, maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'sunny-bench-weather', networkTimeoutSeconds: 4, expiration: { maxEntries: 10, maxAgeSeconds: 1800 } },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: { cacheName: 'sunny-bench-map-tiles', expiration: { maxEntries: 120, maxAgeSeconds: 604800 } },
          },
        ],
      },
    }),
  ],
})
