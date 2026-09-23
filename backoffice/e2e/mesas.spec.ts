import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

const mesa = (page: Page, codigo: string) =>
  page.getByRole('button', { name: new RegExp(`^Mesa ${codigo},`) })

test.describe('Plano de mesas', () => {
  test.beforeEach(async ({ page, entrar }) => {
    await entrar()
    await page.goto('/mesas')
    await expect(mesa(page, 'M-02')).toBeVisible()
  })

  test('arrastrar mueve la mesa sin saltos, dentro del plano, y se guarda', async ({ page }) => {
    const plano = (await page.locator('.rs-mantel').boundingBox())!
    const m = mesa(page, 'M-02')
    const antes = (await m.boundingBox())!

    // Se agarra desde una esquina interior: la mesa no debe saltar al puntero.
    const agarreX = antes.x + 10
    const agarreY = antes.y + 10
    await page.mouse.move(agarreX, agarreY)
    await page.mouse.down()
    await page.mouse.move(agarreX + 40, agarreY + 30, { steps: 5 })
    const durante = (await m.boundingBox())!
    expect(Math.abs(durante.x - (antes.x + 40))).toBeLessThan(2)
    expect(Math.abs(durante.y - (antes.y + 30))).toBeLessThan(2)

    // Arrastrar fuera del plano deja la mesa entera dentro.
    await page.mouse.move(plano.x + plano.width + 300, plano.y + plano.height + 300, { steps: 5 })
    await page.mouse.up()
    await expect
      .poll(async () => {
        const b = (await m.boundingBox())!
        return (
          b.x + b.width <= plano.x + plano.width + 1 && b.y + b.height <= plano.y + plano.height + 1
        )
      })
      .toBe(true)

    // No abrió el editor: un arrastre no es un clic.
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // La posición se guarda: se mantiene al recargar.
    const final = (await m.boundingBox())!
    await page.reload()
    await expect(mesa(page, 'M-02')).toBeVisible()
    const recargada = (await mesa(page, 'M-02').boundingBox())!
    expect(Math.abs(recargada.x - final.x)).toBeLessThan(3)
  })

  test('un clic simple abre la edición de la mesa', async ({ page }) => {
    await mesa(page, 'M-02').click()
    await expect(page.getByRole('dialog').filter({ hasText: 'Editar mesa' })).toBeVisible()
  })

  test('clic derecho muestra el menú de la mesa y cambia su estado', async ({ page }) => {
    await mesa(page, 'M-02').click({ button: 'right' })

    const menu = page.getByRole('menu', { name: 'Opciones de la mesa M-02' })
    await expect(menu).toBeVisible()
    await menu.getByRole('menuitemradio', { name: /Reservada/ }).click()

    await expect(menu).toHaveCount(0)
    await expect(mesa(page, 'M-02')).toHaveAccessibleName(/Reservada/)
  })

  test('el menú se cierra con Escape y con clic fuera, y el plano no muestra el menú del navegador', async ({
    page,
  }) => {
    // El lienzo cancela el menú nativo también en zonas vacías.
    const cancelado = await page
      .locator('.rs-mantel')
      .evaluate(
        (el) =>
          !el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })),
      )
    expect(cancelado).toBe(true)

    await mesa(page, 'M-04').click({ button: 'right' })
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)

    await mesa(page, 'M-04').click({ button: 'right' })
    await page.mouse.click(5, 5)
    await expect(page.getByRole('menu')).toHaveCount(0)
  })

  test('juntar mesas desde el menú y separarlas', async ({ page }) => {
    await mesa(page, 'M-02').click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Juntar con otras mesas…' }).click()

    await expect(page.getByText('1 mesas · 4 personas')).toBeVisible()
    await mesa(page, 'M-04').click()
    await expect(page.getByText('2 mesas · 10 personas')).toBeVisible()
    await page.getByRole('button', { name: 'Juntar seleccionadas' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'para 10 personas' })).toBeVisible()
    await expect(mesa(page, 'M-02')).toHaveAccessibleName(/unida/)

    await mesa(page, 'M-02').click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Separar mesas juntadas' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Mesas separadas' })).toBeVisible()
  })

  test('no se separa un grupo con una mesa ocupada', async ({ page }) => {
    await page.getByRole('button', { name: 'Juntar mesas para un grupo' }).click()
    await mesa(page, 'M-01').click()
    await mesa(page, 'M-02').click()
    await page.getByRole('button', { name: 'Juntar seleccionadas' }).click()

    await page.getByRole('button', { name: 'Separar mesas M-01 y M-02' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'cuenta abierta' })).toBeVisible()
  })

  test('el menú no se cierra solo si se abre justo al cargar', async ({ page }) => {
    await page.reload()
    await mesa(page, 'M-02').click({ button: 'right' })
    await page.waitForTimeout(600)
    await expect(page.getByRole('menu')).toBeVisible()
  })
})
