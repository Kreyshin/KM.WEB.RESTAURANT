import { expect, fila, test } from './fixtures'

test.describe('Acciones de fila en tablas', () => {
  test.beforeEach(async ({ entrar }) => {
    await entrar()
  })

  test('el tooltip muestra solo la acción, dentro de la ventana y sin crear scroll', async ({
    page,
  }) => {
    await page.goto('/salones')
    const contenedor = page.locator('main table').locator('..')
    const eliminar = fila(page, 'Terraza').getByRole('button', { name: 'Eliminar Terraza' })

    const anchoAntes = await contenedor.evaluate((e) => e.scrollWidth)
    await eliminar.hover()

    const tooltip = page.locator('body > span.fixed')
    await expect(tooltip).toHaveText('Eliminar')

    // No se desborda la tabla ni la ventana.
    expect(await contenedor.evaluate((e) => e.scrollWidth)).toBe(anchoAntes)
    const caja = (await tooltip.boundingBox())!
    const ventana = page.viewportSize()!
    expect(caja.x).toBeGreaterThanOrEqual(0)
    expect(caja.x + caja.width).toBeLessThanOrEqual(ventana.width)

    // Queda encima del botón.
    const boton = (await eliminar.boundingBox())!
    expect(caja.y + caja.height).toBeLessThanOrEqual(boton.y)

    await page.mouse.move(0, 0)
    await expect(tooltip).toHaveCount(0)
  })

  test('las acciones son botones con borde, no texto suelto', async ({ page }) => {
    await page.goto('/salones')
    const editar = fila(page, 'Terraza').getByRole('button', { name: 'Editar Terraza' })

    await expect(editar).toHaveCSS('border-top-width', '1px')
    await expect(editar).toHaveText('')
  })
})
