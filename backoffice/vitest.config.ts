import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/**
 * Configuración propia de pruebas: no carga el plugin de Tailwind, que no
 * aporta nada en un entorno jsdom y sí alarga el arranque.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    // Matchers de DOM (toBeInTheDocument…) y red mock sin latencia en cada archivo.
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
  },
})
