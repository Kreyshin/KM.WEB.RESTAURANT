import { drawer, expect, fila, test } from './fixtures'

test.describe('Configuración del negocio', () => {
  test.beforeEach(async ({ entrar }) => {
    await entrar()
  })

  test('lo que gestiona el ERP ya no está en el menú', async ({ page }) => {
    await page.goto('/configuracion')
    await expect(page).toHaveURL(/configuracion\/vertical/)
    const menu = page.getByRole('navigation').filter({ hasText: 'Configuración de la vertical' })
    for (const nombre of [
      'Empresa',
      'Locales',
      'Impuestos y cargos',
      'Medios de pago',
      'Series de comprobantes',
    ]) {
      await expect(menu.getByRole('link', { name: new RegExp(`^${nombre}`) })).toHaveCount(0)
    }
  })

  test('configuración de la vertical y por local muestran su alcance', async ({ page }) => {
    await page.goto('/configuracion/vertical')
    await expect(page.getByText('afecta a todos los locales')).toBeVisible()
    await expect(page.getByText('Aún no hay parámetros en esta sección')).toBeVisible()

    // El administrador tiene acceso a varios locales: elige cuál configurar.
    await page.goto('/configuracion/local')
    const locales = page.getByRole('navigation', { name: 'Locales' })
    await expect(locales.getByRole('button')).toHaveCount(2)
    await locales.getByRole('button', { name: /San Isidro/ }).click()
    await expect(page.getByRole('heading', { name: 'Configuración de San Isidro' })).toBeVisible()
  })

  test('permisos por rol del ERP y excepciones por usuario', async ({ page }) => {
    await page.goto('/configuracion/roles')
    await page
      .getByRole('navigation', { name: 'Roles del ERP' })
      .getByRole('button', { name: /Mesero/ })
      .click()
    await expect(page.getByRole('heading', { name: 'Permisos de Mesero' })).toBeVisible()
    await expect(page.getByText('Aún no hay permisos de la vertical para asignar')).toBeVisible()

    await page.goto('/configuracion/excepciones')
    await page
      .getByRole('navigation', { name: 'Usuarios' })
      .getByRole('button', { name: /Ana Quispe/ })
      .click()
    await expect(page.getByRole('heading', { name: 'Ana Quispe' })).toBeVisible()
    await expect(page.getByText('Miraflores, San Isidro')).toBeVisible()
    await expect(page.getByText('Sin excepciones')).toBeVisible()
  })

  test('no permite eliminar una impresora usada por áreas', async ({ page }) => {
    await page.goto('/configuracion/areas')
    await page.getByRole('tab', { name: 'Impresoras' }).click()

    await fila(page, /Cocina caliente/)
      .getByRole('button', { name: 'Eliminar' })
      .click()
    await drawer(page).getByRole('button', { name: 'Eliminar' }).click()

    await expect(page.getByText(/la usan las áreas/)).toBeVisible()
  })
})
