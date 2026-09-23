import { test as base, expect, type Locator, type Page } from '@playwright/test'

/**
 * Fixtures: piezas que cada prueba recibe ya preparadas.
 *
 * - Toda página arranca sin latencia simulada, para que las pruebas vayan rápido.
 * - `entrar(correo)` inicia sesión por la pantalla de login, como una persona.
 */

export const cuentas = {
  admin: 'admin@kmrestaurante.pe',
  cajero: 'ana@kmrestaurante.pe',
  mesero: 'lucia@kmrestaurante.pe',
} as const

interface Fixtures {
  entrar: (correo?: string) => Promise<void>
}

export const test = base.extend<Fixtures>({
  page: async ({ page }, usar) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'km.restaurante.mock.red',
        JSON.stringify({ latenciaMs: 0, tasaError: 0 }),
      )
    })
    await usar(page)
  },

  entrar: async ({ page }, usar) => {
    await usar(async (correo = cuentas.admin) => {
      await page.goto('/login')
      await page.getByLabel('Correo').fill(correo)
      await page.getByLabel('Contraseña').fill('demo')
      await page.getByRole('button', { name: 'Entrar' }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
    })
  },
})

export { expect }

/** Panel lateral (drawer) abierto en este momento. */
export const drawer = (page: Page) => page.getByRole('dialog').last()

/** Fila de una tabla que contiene el texto indicado. */
export const fila = (page: Page, texto: string | RegExp) =>
  page.getByRole('row').filter({ hasText: texto })

/** Elige una opción de un `KmSelect`: abre la lista y pulsa la opción. */
export async function elegir(control: Locator, opcion: string | RegExp) {
  await control.click()
  await control.page().getByRole('listbox').getByRole('option', { name: opcion }).click()
}
