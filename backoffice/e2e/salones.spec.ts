import { drawer, elegir, expect, fila, test } from './fixtures'

test.describe('Salones', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/salones')
  })

  test('busca, filtra y ordena', async ({ page }) => {
    const filasCuerpo = page.locator('tbody tr')
    await expect(filasCuerpo).toHaveCount(4)

    await page.getByPlaceholder('Buscar salón').fill('terr')
    await expect(filasCuerpo).toHaveCount(1)
    await expect(filasCuerpo.first()).toContainText('Terraza')

    await page.getByPlaceholder('Buscar salón').clear()
    await elegir(page.getByLabel('Filtrar por estado'), /^Inactiv/)
    await expect(filasCuerpo).toHaveCount(1)
    await expect(filasCuerpo.first()).toContainText('Barra')

    await elegir(page.getByLabel('Filtrar por estado'), 'Todos los estados')
    await page.getByRole('button', { name: /^Salón/ }).click() // asc
    await page.getByRole('button', { name: /^Salón/ }).click() // desc
    await expect(filasCuerpo.first()).toContainText('Terraza')
  })

  test('crea un salón y aparece en la tabla', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo salón' }).click()
    const dialogo = page.getByRole('dialog')
    await dialogo.getByLabel('Nombre').fill('Patio interior')
    await dialogo.getByRole('button', { name: /Guardar|Crear/ }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Salón creado.' })).toBeVisible()
    await expect(fila(page, 'Patio interior')).toBeVisible()
  })

  test('no permite eliminar un salón con mesas', async ({ page }) => {
    await fila(page, 'Terraza').getByRole('button', { name: 'Eliminar' }).click()
    await drawer(page).getByRole('button', { name: 'Eliminar' }).click()

    await expect(page.getByText(/todavía tiene mesas asignadas/)).toBeVisible()
    await expect(fila(page, 'Terraza')).toBeVisible()
  })
})
