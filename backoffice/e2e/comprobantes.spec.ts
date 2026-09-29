import { drawer, elegir, expect, test } from './fixtures'

/**
 * F8 · Comprobantes (D-013). La caja cobra y emite; aquí se ve el estado del
 * envío, se corrige lo rechazado y se anula con nota de crédito.
 */

/** Cobra la cuenta de ejemplo, que con la configuración por defecto emite boleta. */
async function cobrarLaCuenta(page: import('@playwright/test').Page) {
  await page.goto('/caja')
  await page.getByRole('button', { name: /Cuenta 1041/ }).click()
  await page.getByRole('button', { name: /Comandar/ }).click()
  await page.getByRole('button', { name: 'Cobrar' }).click()
  await drawer(page)
    .getByRole('button', { name: /^Cobrar S\// })
    .click()
  await expect(page.getByText(/NV01-905/)).toBeVisible()
}

test.describe('Comprobantes', () => {
  test.beforeEach(async ({ entrar }) => {
    await entrar()
  })

  test('la caja emite y envía el comprobante al cobrar', async ({ page }) => {
    await cobrarLaCuenta(page)
    await expect(page.getByText(/Boleta B001-18343 emitida/)).toBeVisible()

    await page.goto('/facturacion')
    await expect(page.getByText('B001-18343')).toBeVisible()
    await expect(page.getByText('Aceptado')).toBeVisible()
  })

  test('sin ventas pendientes lo dice, y no finge trabajo', async ({ page }) => {
    await page.goto('/facturacion')
    await page.getByRole('tab', { name: /Sin comprobante/ }).click()
    await expect(page.getByText('Todas las ventas cobradas tienen su comprobante')).toBeVisible()
  })

  test('la factura exige RUC válido antes de emitirse', async ({ page }) => {
    // Se apaga la emisión automática para emitir a mano desde Facturación.
    await page.goto('/configuracion/local')
    await page.getByRole('switch', { name: 'Emitir el comprobante al cobrar' }).click()

    await cobrarLaCuenta(page)
    await page.goto('/facturacion')
    await page.getByRole('tab', { name: /Sin comprobante/ }).click()
    await page.getByRole('button', { name: 'Emitir' }).click()

    const d = drawer(page)
    await elegir(d.getByLabel('Tipo'), 'Factura')
    await d.getByLabel('Número').fill('20100070979')
    await d.getByLabel('Razón social').fill('Karma Corp S.A.C.')
    await d.getByLabel('Dirección fiscal').fill('Av. Javier Prado 1234')
    await d.getByRole('button', { name: 'Emitir' }).click()
    await expect(d).toContainText('Revisa los 11 dígitos')

    await d.getByLabel('Número').fill('20100070970')
    await d.getByRole('button', { name: 'Emitir' }).click()
    await expect(page.getByText(/F001-2432 emitida/)).toBeVisible()
  })

  test('anular emite una nota de crédito que anula la venta', async ({ page }) => {
    await cobrarLaCuenta(page)
    await page.goto('/facturacion')
    await page.getByRole('button', { name: 'Nota de crédito' }).click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toContainText('devuelve al almacén lo que se consumió')
    await dialogo.getByLabel('Detalle').fill('El cliente se retractó')
    await dialogo.getByRole('button', { name: 'Emitir nota' }).click()

    await expect(page.getByText(/BC01-58 emitida/)).toBeVisible()
    await expect(page.getByText('Anulación de la operación')).toBeVisible()
  })
})
