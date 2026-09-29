import { drawer, elegir, expect, fila, test } from './fixtures'

/**
 * F6.2 · Delivery y promociones (D-011). Se comprueba lo que verá el cajero:
 * la cobertura de una dirección y por qué una promoción entra o se queda fuera.
 */

test.describe('Zonas de reparto', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/delivery/zonas')
    await expect(page.getByRole('heading', { level: 1, name: 'Zonas de reparto' })).toBeVisible()
  })

  test('muestra la cobertura del local con su envío y su tiempo', async ({ page }) => {
    await expect(page.getByText('Cercana', { exact: true })).toBeVisible()
    await expect(page.getByText('30 min estimados')).toBeVisible()
    await expect(page.getByText('Fuera de cobertura: se avisa')).toBeVisible()
  })

  test('«¿Se llega?» contesta lo mismo que contestaría la caja', async ({ page }) => {
    const panel = page.getByRole('heading', { name: '¿Se llega?' }).locator('..')
    await elegir(panel.getByLabel('Distrito'), 'Miraflores')
    await expect(panel).toContainText('Se llega')
    await expect(panel).toContainText('Cercana')

    // Bajo el pedido mínimo de 35 se avisa cuánto falta y no se deja cobrar.
    await panel.getByLabel('Cuenta').fill('20')
    await expect(panel).toContainText('Bajo el mínimo')
    await expect(panel).toContainText('faltan S/ 15.00')
  })

  test('no deja poner un distrito que ya cubre otra zona del local', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva zona' }).click()
    const d = drawer(page)
    await d.getByLabel('Nombre').fill('Repetida')
    await d.getByPlaceholder('Escribe un distrito').fill('Barranco')
    await d.getByRole('button', { name: 'Añadir' }).click()
    await d.getByRole('button', { name: 'Guardar' }).click()
    await expect(d).toContainText('Distrito repetido')
  })
})

test.describe('Promociones', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/promociones')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Promociones y cupones' }),
    ).toBeVisible()
  })

  test('lista las reglas con lo que dan y cuándo rigen', async ({ page }) => {
    await expect(fila(page, 'Martes de cebiche')).toContainText('2×1')
    await expect(fila(page, 'Cupón de bienvenida')).toContainText('Cupón BIENVENIDA10')
    await expect(page.getByText('Una promoción por cuenta')).toBeVisible()
  })

  test('el simulador explica lo que entra y lo que no', async ({ page }) => {
    await page.getByRole('tab', { name: '¿Qué se aplica?' }).click()
    await page.getByRole('button', { name: 'Calcular' }).click()

    const fuera = page.getByRole('region', { name: 'Promociones que no entran' })
    // Cualquiera que sea el día de hoy, toda promoción descartada dice su motivo.
    await expect(fuera).toContainText('Cupón de bienvenida')
    await expect(fuera).toContainText('Falta el cupón')
  })

  test('un cupón tecleado cambia el resultado de la cuenta', async ({ page }) => {
    await page.getByRole('tab', { name: '¿Qué se aplica?' }).click()
    // Una cuenta que no toca ninguna promoción automática: manda el cupón.
    await elegir(page.getByLabel('Producto'), /Arroz con mariscos/)
    await page.getByLabel('Cupón').fill('BIENVENIDA10')
    await page.getByRole('button', { name: 'Calcular' }).click()

    const entra = page.getByRole('region', { name: 'Promociones que entran' })
    await expect(entra).toContainText('Cupón de bienvenida')
    await expect(entra).toContainText('10 %')
  })

  test('el N×M exige la condición por unidades antes de guardarse', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva promoción' }).click()
    const d = drawer(page)
    await d.getByLabel('Código').fill('PRUEBA-NXM')
    await d.getByLabel('Nombre').fill('Prueba 3×2')
    await elegir(d.getByLabel('Beneficio'), /N × M/)
    await expect(d).toContainText('elige la condición por unidades')
    await d.getByRole('button', { name: 'Guardar' }).click()
    await expect(d).toContainText('Falta el conjunto')
  })

  test('las reglas de puntos se guardan y quedan en la pestaña', async ({ page }) => {
    await page.getByRole('tab', { name: 'Puntos' }).click()
    await page.getByRole('switch', { name: 'Acumular puntos' }).click()
    await page.getByLabel('Soles por punto').fill('20')
    await page.getByRole('button', { name: 'Guardar reglas' }).click()
    await expect(page.getByRole('status')).toContainText('Reglas de puntos guardadas')
  })
})
