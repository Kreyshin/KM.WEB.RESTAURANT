import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas end-to-end: la app real, en un navegador real, con los datos de
 * ejemplo. Cada prueba abre un contexto limpio, así que siempre parte de la
 * semilla inicial.
 */
export default defineConfig({
  testDir: 'e2e',
  // En CI un `test.only` olvidado haría pasar la suite ejecutando una sola prueba.
  forbidOnly: !!process.env.CI,
  // Un reintento en CI para distinguir un fallo real de una intermitencia.
  retries: process.env.CI ? 1 : 0,
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],

  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    // Evidencia para depurar: traza completa y captura solo cuando algo falla.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    // En local reutiliza el servidor si ya lo tienes abierto.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
