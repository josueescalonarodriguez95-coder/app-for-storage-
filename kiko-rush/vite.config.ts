import { defineConfig } from 'vite'

export default defineConfig({
  // Rutas relativas: el build funciona servido desde cualquier carpeta (GitHub Pages, itch.io, etc.).
  base: './',
  build: {
    target: ['es2019', 'safari13'],
    chunkSizeWarningLimit: 1200,
  },
})
