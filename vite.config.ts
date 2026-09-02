import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Por defecto Vite no baja sintaxis moderna (??=, ||=, &&=, campos privados de clase...) que
  // trae alguna dependencia (p. ej. @supabase/supabase-js) — en un iPad con iOS viejo eso hace
  // que el navegador ni siquiera pueda interpretar el script y la página queda en blanco, sin
  // ningún error visible. Bajarlo a un target compatible con Safari 12 evita ese problema.
  build: {
    target: ['es2017', 'safari12'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Storage Control — Bodega Ramos',
        short_name: 'Storage Control',
        description: 'Control de inventario de la bodega de obras de arte de Ramos Delivery.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#F4EFE9',
        theme_color: '#C8321C',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
