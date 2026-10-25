import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from https://<user>.github.io/daily/
const base = '/daily/'

export default defineConfig({
  base,
  define: {
    __APP_BUILD__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version waits until the app is closed, so a running session is never reloaded.
      registerType: 'prompt',
      injectRegister: false,
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Daily',
        short_name: 'Daily',
        description: 'Gewohnheiten, Sport, Denktraining und Fokus.',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#12161f',
        theme_color: '#12161f',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
