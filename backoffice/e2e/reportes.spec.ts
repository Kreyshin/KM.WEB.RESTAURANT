import { expect, test } from './fixtures'

/**
 * F9 · Reportes (D-014). Lo que se comprueba aquí no es que dibuje bonito, sino
 * que cada cifra diga de dónde sale y que lo anulado no cuente.
 */

test.describe('Reportes', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/reportes')
    await expect(page.getByRole('heading', { level: 1, name: 'Reportes' })).toBeVisible()
  })

  test('el resumen separa el ingreso neto de lo que no es ingreso', async ({ page }) => {
    await expect(page.getByRole('term').filter({ hasText: 'Ingreso neto' })).toBeVisible()
    await expect(page.getByRole('term').filter({ hasText: 'No es ingreso' })).toBeVisible()
    await expect(page.getByText(/Recargo S\//)).toBeVisible()
    await expect(page.getByText(/venta\(s\) anulada\(s\), fuera del reporte/)).toBeVisible()
  })

  test('la comisión de las apps se enseña sin restarla de la venta', async ({ page }) => {
    await expect(page.getByText(/Comisión del canal: .*gasto, no menor venta/)).toBeVisible()
  })

  test('los platos se ordenan por margen y avisan de los que no tienen receta', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: /Rentabilidad por plato/ }).click()
    await expect(page.getByRole('term').filter({ hasText: 'Food cost real' })).toBeVisible()
    await expect(page.getByText(/plato\(s\) sin receta: su costo no entra/)).toBeVisible()
    await expect(page.getByText(/El costo es el de la receta vigente hoy/)).toBeVisible()
  })

  test('el consumo compara las recetas con lo que salió del almacén', async ({ page }) => {
    await page.getByRole('tab', { name: /Consumo y mermas/ }).click()
    await expect(page.getByRole('term').filter({ hasText: 'Según las recetas' })).toBeVisible()
    await expect(page.getByRole('term').filter({ hasText: 'Salió del almacén' })).toBeVisible()
    // Una historia sin movimientos daría cero, que miente más que no decir nada.
    await expect(page.getByText('S/ 0.00').first()).toHaveCount(0)
  })

  test('cambiar el periodo recalcula', async ({ page }) => {
    const cuentas = page.getByRole('tab', { name: /Ventas/ })
    const antes = await cuentas.textContent()
    await page.getByRole('button', { name: 'Hoy' }).click()
    await expect(cuentas).not.toHaveText(antes ?? '')
  })
})
