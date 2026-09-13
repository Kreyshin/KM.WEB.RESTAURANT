import { expect, test } from './fixtures'

test.describe('Pedidos internos', () => {
  test('pedir, despachar y recibir con faltante', async ({ page, entrar }) => {
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(e.message))
    await entrar()
    await page.goto('/inventario/pedidos')

    // Nuevo pedido con varias líneas
    await page.getByRole('button', { name: 'Nuevo pedido' }).click()
    const drawer = page.getByRole('dialog')
    await drawer.getByLabel('Quién pide').selectOption({ label: 'Almacén San Isidro' })
    await drawer.getByLabel('A quién se pide').selectOption({ label: 'Almacén principal' })
    await drawer.getByRole('button', { name: 'Añadir los que están bajo mínimo' }).click()
    await drawer.getByRole('button', { name: 'Enviar pedido' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'enviado a Almacén principal' }),
    ).toBeVisible()

    // Despachar PI-000001 (San Isidro pide al principal)
    const fila = page.locator('main tbody tr').filter({ hasText: 'PI-000001' })
    await fila.getByRole('button', { name: 'Despachar' }).click()
    await page.getByRole('button', { name: 'Confirmar despacho' }).click()
    await expect(fila).toContainText('En camino')

    // Recibir con una línea incompleta
    await fila.getByRole('button', { name: 'Recibir' }).click()
    const primera = page.getByRole('dialog').getByRole('spinbutton').first()
    await primera.fill('1')
    await page.getByRole('button', { name: 'Confirmar recepción' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'faltantes' })).toBeVisible()
    await expect(fila).toContainText('Recibido')

    // El kardex general refleja el traslado y la merma
    await page.goto('/inventario/movimientos')
    await expect(page.locator('main tbody')).toContainText('PI-000001')
    await expect(page.locator('main tbody')).toContainText('Faltante en traslado')
    expect(errores).toEqual([])
  })
})
