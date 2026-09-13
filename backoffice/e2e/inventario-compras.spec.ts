import { expect, fila, test } from './fixtures'

test.describe('Inventario y compras', () => {
  test.beforeEach(async ({ entrar }) => {
    await entrar()
  })

  test('recibir una orden de compra la cierra y sube el stock del insumo', async ({ page }) => {
    await page.goto('/compras/ordenes')
    const orden = fila(page, 'OC-000041')
    await orden.getByRole('button', { name: 'Recibir mercadería OC-000041' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Registrar recepción' }).click()

    await expect(orden).toContainText('Recibida')
    await page.goto('/inventario')
    await expect(fila(page, 'Lomo fino de res')).toContainText('20.4 kg')
  })

  test('una toma aplicada ajusta el stock y deja la diferencia en movimientos', async ({
    page,
  }) => {
    await page.goto('/inventario/tomas')
    await page.getByRole('button', { name: 'Nueva toma' }).click()
    await page.getByRole('button', { name: 'Abrir toma' }).click()

    const conteo = page.getByRole('dialog').filter({ hasText: 'TOMA-' })
    await conteo.getByRole('spinbutton').first().fill('1')
    await conteo.getByRole('button', { name: 'Aplicar ajustes' }).click()
    await page
      .getByRole('dialog')
      .filter({ hasText: 'Se ajustará el stock' })
      .getByRole('button', { name: 'Aplicar ajustes' })
      .click()

    await expect(page.getByRole('status').filter({ hasText: 'aplicada' })).toBeVisible()
    await page.goto('/inventario/movimientos')
    await expect(page.locator('tbody')).toContainText('Faltante en toma de inventario')
  })
})
