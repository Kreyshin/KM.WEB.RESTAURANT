import { drawer, expect, fila, test } from './fixtures'

test.describe('Áreas y comandas', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/configuracion/areas')
    await expect(fila(page, 'Cocina fría')).toBeVisible()
  })

  test('la revisión confirma que cada producto llega a un área', async ({ page }) => {
    const revision = page.getByRole('region', { name: 'Revisión de comandas' })
    await expect(revision).toContainText('Todos los productos llegan a un área, y a una sola.')
    await expect(fila(page, /Recepción de mercadería/)).toContainText('No recibe comandas')
    await expect(fila(page, 'San Isidro').filter({ hasText: 'Cocina' })).toContainText(
      'Todos los productos',
    )
  })

  test('una segunda área con la misma categoría avisa de comanda duplicada', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva área' }).click()
    const d = drawer(page)
    await d.getByLabel('Nombre').fill('Parrilla')
    await d.getByLabel('Ubicación').fill('Terraza')
    await d.getByRole('radio', { name: /Solo algunos/ }).click()
    await d.getByText('Fondos criollos', { exact: true }).click()
    await d.getByRole('button', { name: 'Crear área' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const revision = page.getByRole('region', { name: 'Revisión de comandas' })
    await expect(revision).toContainText('en más de un área a la vez')
    await expect(revision).toContainText('Cocina caliente y Parrilla')
  })

  test('elegir «Solo algunos» sin categorías ni productos no se guarda', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva área' }).click()
    const d = drawer(page)
    await d.getByLabel('Nombre').fill('Postres')
    await d.getByLabel('Ubicación').fill('Segundo piso')
    await d.getByRole('radio', { name: /Solo algunos/ }).click()
    await d.getByRole('button', { name: 'Crear área' }).click()
    await expect(d).toContainText('Elige al menos una categoría o un producto')
  })

  test('el producto muestra a qué área se comanda', async ({ page }) => {
    await page.goto('/carta')
    await page.getByRole('button', { name: 'Editar Lomo saltado' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toContainText('Se comanda en')
    await expect(modal).toContainText(/Miraflores:\s*Cocina caliente/)
    await expect(modal).toContainText(/San Isidro:\s*Cocina/)
  })
})
