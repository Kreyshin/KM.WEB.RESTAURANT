import { drawer, elegir, expect, fila, test } from './fixtures'

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
    await expect(page.getByText('Permitir ingresos sin orden de compra')).toBeVisible()
    await expect(page.getByText('Vida útil de lo producido')).toBeVisible()

    // El administrador tiene acceso a varios locales: elige cuál configurar.
    await page.goto('/configuracion/local')
    const locales = page.getByRole('navigation', { name: 'Locales' })
    await expect(locales.getByRole('button')).toHaveCount(2)
    await locales.getByRole('button', { name: /San Isidro/ }).click()
    await expect(page.getByRole('heading', { name: 'Configuración de San Isidro' })).toBeVisible()
    // En el local solo aparecen los parámetros que admiten valor propio.
    await expect(page.getByText('Registro de producción')).toBeVisible()
    await expect(page.getByText('Vida útil de lo producido')).toHaveCount(0)
  })

  test('permisos por rol del ERP y excepciones por usuario', async ({ page }) => {
    await page.goto('/configuracion/roles')
    await page
      .getByRole('navigation', { name: 'Roles del ERP' })
      .getByRole('button', { name: /Mesero/ })
      .click()
    await expect(page.getByRole('heading', { name: 'Permisos de Mesero' })).toBeVisible()
    await expect(page.getByText('Ajustar cantidades al consolidar')).toBeVisible()
    // El mesero no trae permisos: todos sus interruptores están apagados.
    const interruptores = page.getByRole('switch')
    await expect(interruptores.first()).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('button', { name: 'Guardar permisos' })).toBeDisabled()

    await page.goto('/configuracion/excepciones')
    await page
      .getByRole('navigation', { name: 'Usuarios' })
      .getByRole('button', { name: /Ana Quispe/ })
      .click()
    await expect(page.getByRole('heading', { name: 'Ana Quispe' })).toBeVisible()
    await expect(page.getByText('Miraflores, San Isidro')).toBeVisible()
    // Ana es cajera: sus permisos salen del rol y se pueden ajustar uno a uno.
    await expect(page.getByText('Lo da su rol').first()).toBeVisible()
    await elegir(page.getByLabel('«Ver la bitácora» para Ana Quispe'), 'Conceder')
    await expect(page.getByText('Concedido a esta persona')).toBeVisible()
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
