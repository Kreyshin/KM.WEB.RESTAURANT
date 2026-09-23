import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/**
 * `vite build --mode demo` genera la demo pública para GitHub Pages: vive bajo
 * `/KM.WEB.RESTAURANT/demo/` y usa rutas con hash, porque Pages no sabe servir
 * el `index.html` de una SPA en subrutas.
 */
export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? '/KM.WEB.RESTAURANT/demo/' : '/',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : 'dist',
  },
  server: {
    port: 5173,
  },
}))
