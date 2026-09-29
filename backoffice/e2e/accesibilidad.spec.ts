import { drawer, expect, test } from './fixtures'

/**
 * F10 · Accesibilidad. Lo que se comprueba es lo que vive quien navega con
 * teclado: el diálogo se anuncia con su nombre, el foco entra, no se escapa al
 * fondo y vuelve al botón que lo abrió.
 */

test.describe('Teclado y foco', () => {
  test.beforeEach(async ({ entrar }) => {
    await entrar()
  })

  test('el panel se anuncia con su título y recibe el foco', async ({ page }) => {
    await page.goto('/configuracion/canales')
    const abrir = page.getByRole('button', { name: 'Nuevo canal' })
    await abrir.click()

    const panel = page.getByRole('dialog', { name: 'Nuevo canal' })
    await expect(panel).toBeVisible()
    // El foco está dentro: no se queda en la página de atrás.
    await expect(panel.locator(':focus')).toHaveCount(1)
  })

  test('Escape cierra y el foco vuelve a quien abrió', async ({ page }) => {
    await page.goto('/configuracion/canales')
    const abrir = page.getByRole('button', { name: 'Nuevo canal' })
    await abrir.click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(abrir).toBeFocused()
  })

  test('el tabulador no se escapa del panel al fondo', async ({ page }) => {
    await page.goto('/configuracion/canales')
    await page.getByRole('button', { name: 'Nuevo canal' }).click()
    const panel = drawer(page)
    await expect(panel).toBeVisible()

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      await expect(panel.locator(':focus')).toHaveCount(1)
    }
  })

  test('el menú de una mesa se abre con teclado y devuelve el foco', async ({ page }) => {
    await page.goto('/mesas')
    const mesa = page.getByRole('button', { name: /Mesa M-02/ })
    await mesa.focus()
    await page.keyboard.press('Shift+F10')

    const menu = page.getByRole('menu', { name: /M-02/ })
    await expect(menu).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    // Antes el foco caía al cuerpo del documento y había que empezar de nuevo.
    await expect(mesa).toBeFocused()
  })

  test('cada pantalla tiene un solo encabezado principal y su región', async ({ page }) => {
    for (const ruta of ['/dashboard', '/caja', '/reportes', '/facturacion']) {
      await page.goto(ruta)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.getByRole('main')).toHaveCount(1)
    }
  })
})
