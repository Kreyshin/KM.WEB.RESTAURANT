import { drawer, expect, fila, test } from './fixtures'

test.describe('Configuración del negocio', () => {
  test.beforeEach(async ({ entrar }) => {
    await entrar()
  })

  test.describe('Datos del ERP en solo lectura', () => {
    for (const { ruta, fila: nombre } of [
      { ruta: '/configuracion/locales', fila: 'Barranco' },
      { ruta: '/configuracion/medios-pago', fila: 'Efectivo' },
      { ruta: '/configuracion/series', fila: 'B001' },
    ]) {
      test(`${ruta}: se consulta pero no se crea, edita ni elimina`, async ({ page }) => {
        await page.goto(ruta)
        await expect(fila(page, nombre)).toBeVisible()
        await expect(page.getByText('Sincronizado desde ERP').first()).toBeVisible()
        await expect(page.getByRole('button', { name: /^(Nuevo|Nueva) / })).toHaveCount(0)
        await expect(
          page.locator('main tbody').getByRole('button', { name: /^Editar / }),
        ).toHaveCount(0)
        await expect(
          page.locator('main tbody').getByRole('button', { name: /^Eliminar / }),
        ).toHaveCount(0)

        await fila(page, nombre).getByRole('button', { name: /^Ver / }).click()
        const d = drawer(page)
        await expect(d).toContainText('Sincronizado desde el ERP')
        await expect(d.getByRole('button', { name: /Guardar|Crear/ })).toHaveCount(0)
        await expect(d.locator('input, select, textarea').first()).toBeDisabled()
        await d.getByRole('button', { name: 'Cerrar' }).last().click()
        await expect(page.getByRole('dialog')).toHaveCount(0)
      })
    }

    test('empresa se muestra como ficha sin campos editables', async ({ page }) => {
      await page.goto('/configuracion/empresa')
      await expect(page.getByText('Sincronizado desde el ERP')).toBeVisible()
      await expect(page.getByText('Razón social', { exact: true })).toBeVisible()
      await expect(page.locator('main input')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0)
    })

    test('impuestos se consultan y el ticket de ejemplo sigue calculando', async ({ page }) => {
      await page.goto('/configuracion/impuestos')
      await expect(page.getByText('Sincronizado desde el ERP')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0)

      const ticket = page.getByRole('complementary', { name: 'Ticket de ejemplo' })
      const total = ticket.locator('dd').last()
      const antes = await total.textContent()
      await ticket.getByLabel('Consumo de la mesa (S/)').fill('200')
      await expect(total).not.toHaveText(antes!)
    })
  })

  test('no permite eliminar una impresora usada por estaciones', async ({ page }) => {
    await page.goto('/configuracion/produccion')
    await page.getByRole('tab', { name: 'Impresoras' }).click()

    await fila(page, /Cocina caliente/)
      .getByRole('button', { name: 'Eliminar' })
      .click()
    await drawer(page).getByRole('button', { name: 'Eliminar' }).click()

    await expect(page.getByText(/la usan las estaciones/)).toBeVisible()
  })
})
