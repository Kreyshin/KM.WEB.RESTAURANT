import { drawer, expect, test } from './fixtures'

/**
 * F7 · Ventas y caja (D-012). El recorrido que hace el cajero cien veces al
 * día: abrir la cuenta, comandar, cobrar y, al final del turno, arquear.
 */

test.describe('Caja', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/caja')
    await expect(page.getByRole('heading', { level: 1, name: 'Caja' })).toBeVisible()
  })

  /** Martes a las 20:00, hora de Lima: el día que rige «Martes de cebiche». */
  const UN_MARTES = new Date('2026-10-06T20:00:00-05:00')

  test('muestra el servicio en marcha con su caja abierta', async ({ page }) => {
    await expect(page.getByText('Caja abierta · fondo S/ 200.00')).toBeVisible()
    await expect(page.getByRole('button', { name: /Cuenta 1041/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Cuenta 1042/ })).toContainText('Delivery')
  })

  test('la cuenta encadena promoción, recargo al consumo e IGV', async ({ page }) => {
    // La promoción de ejemplo solo rige los martes, así que el reloj se fija:
    // antes esta prueba pasaba un día de cada siete y mentía los otros seis.
    await page.clock.setFixedTime(UN_MARTES)
    await page.reload()
    await page.getByRole('button', { name: /Cuenta 1041/ }).click()
    await expect(page.getByText('Recargo al consumo (10 %)')).toBeVisible()
    await expect(page.getByText('(Martes de cebiche 2×1)')).toBeVisible()
    await expect(page.getByText(/Incluye IGV/)).toBeVisible()
  })

  test('no deja cobrar con productos sin comandar', async ({ page }) => {
    await page.getByRole('button', { name: /Cuenta 1042/ }).click()
    await expect(page.getByRole('button', { name: 'Cobrar' })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Comandar \(1\)/ })).toBeEnabled()
  })

  test('comandar reparte las líneas entre las áreas que las preparan', async ({ page }) => {
    await page.getByRole('button', { name: /Cuenta 1041/ }).click()
    await page.getByRole('button', { name: /Comandar/ }).click()
    await expect(page.getByText(/Comandas: /)).toContainText('Cocina caliente')
  })

  test('anular un producto ya comandado pide motivo', async ({ page }) => {
    await page.getByRole('button', { name: /Cuenta 1041/ }).click()
    await page.getByRole('button', { name: 'Anular Lomo saltado' }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toContainText('el insumo se gastó')
    await dialogo.getByRole('button', { name: 'Anular' }).click()
    await expect(page.getByText(/Explica por qué/)).toBeVisible()
  })

  test('el cobro parte del total con la propina sugerida y admite más medios', async ({ page }) => {
    await page.getByRole('button', { name: /Cuenta 1041/ }).click()
    await page.getByRole('button', { name: /Comandar/ }).click()
    await page.getByRole('button', { name: 'Cobrar' }).click()

    const d = drawer(page)
    await expect(d).toContainText('A cobrar')
    // 10 % sugerido sobre la cuenta, que el cajero puede cambiar.
    await expect(d).toContainText('Sugerida: 10 %')
    await expect(d.getByLabel('Medio')).toHaveCount(1)
    await d.getByRole('button', { name: 'Añadir medio' }).click()
    await expect(d.getByLabel('Medio')).toHaveCount(2)
  })

  test('el cobro enseña qué sale del almacén', async ({ page }) => {
    await page.getByRole('button', { name: /Cuenta 1041/ }).click()
    await page.getByRole('button', { name: /Comandar/ }).click()
    await page.getByRole('button', { name: 'Cobrar' }).click()

    const d = drawer(page)
    await expect(d).toContainText('Sale del almacén al cobrar')
    await expect(d).toContainText('Pescado del día')
    await expect(d).toContainText('la venta se cobra igual')
  })

  test('cobra, emite nota de venta y deja la mesa en limpieza', async ({ page }) => {
    await page.getByRole('button', { name: /Cuenta 1041/ }).click()
    await page.getByRole('button', { name: /Comandar/ }).click()
    await page.getByRole('button', { name: 'Cobrar' }).click()
    await drawer(page)
      .getByRole('button', { name: /^Cobrar S\// })
      .click()
    await expect(page.getByText(/NV01-905/)).toBeVisible()

    await page.goto('/mesas')
    await expect(page.getByText('M-01').first()).toBeVisible()
  })
})

test.describe('Arqueo', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/caja/arqueo')
    await expect(page.getByRole('heading', { level: 1, name: 'Arqueo de caja' })).toBeVisible()
  })

  test('el cierre es ciego hasta que se pide ver lo esperado', async ({ page }) => {
    await page.getByRole('button', { name: 'Cerrar caja' }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toContainText('Cuenta primero')
    await expect(dialogo).not.toContainText('Esperado')

    await dialogo.getByRole('switch', { name: 'Ver lo esperado' }).click()
    await expect(dialogo).toContainText('Esperado')
    await expect(dialogo).toContainText('Diferencia total')
  })

  test('el turno muestra el efectivo que debería haber', async ({ page }) => {
    await expect(page.getByText('Efectivo que debería haber')).toBeVisible()
    await expect(page.getByText('Fondo inicial más el efectivo cobrado')).toBeVisible()
  })
})
