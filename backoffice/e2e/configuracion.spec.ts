import { drawer, expect, fila, test } from './fixtures'

test.describe('Configuración del negocio', () => {
  test.beforeEach(async ({ entrar }) => {
    await entrar()
  })

  test.describe('Series de comprobantes', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/configuracion/series')
      await expect(fila(page, 'B001')).toBeVisible()
    })

    test('rechaza una serie con la letra de otro comprobante', async ({ page }) => {
      await page.getByRole('button', { name: 'Nueva serie' }).click()
      await drawer(page).getByLabel('Comprobante').selectOption('boleta')
      await drawer(page).getByLabel('Serie').fill('F050')
      await drawer(page).getByRole('button', { name: 'Crear serie' }).click()

      await expect(drawer(page).getByText(/Formato no válido/)).toBeVisible()
    })

    test('rechaza una serie que ya existe en otro local', async ({ page }) => {
      await page.getByRole('button', { name: 'Nueva serie' }).click()
      await drawer(page).getByLabel('Local').selectOption({ label: 'San Isidro' })
      await drawer(page).getByLabel('Serie').fill('B001')
      await drawer(page).getByRole('button', { name: 'Crear serie' }).click()

      await expect(drawer(page).getByText('Duplicada')).toBeVisible()
    })

    test('el correlativo no puede retroceder', async ({ page }) => {
      await fila(page, 'B001').getByRole('button', { name: 'Editar' }).click()
      await expect(drawer(page).getByLabel('Serie')).toBeDisabled()

      await drawer(page).getByLabel('Último número emitido').fill('10')
      await drawer(page).getByRole('button', { name: 'Guardar cambios' }).click()

      await expect(drawer(page).getByText('No puede retroceder')).toBeVisible()
    })

    test('crea una serie y muestra el siguiente número', async ({ page }) => {
      await page.getByRole('button', { name: 'Nueva serie' }).click()
      await drawer(page).getByLabel('Comprobante').selectOption('factura')
      await drawer(page).getByLabel('Serie').fill('f003')
      await expect(drawer(page).getByText('F003-00000001')).toBeVisible()
      await drawer(page).getByRole('button', { name: 'Crear serie' }).click()

      await expect(fila(page, 'F003')).toContainText('F003-00000001')
    })
  })

  test('el horario de un local se guarda y se mantiene al recargar', async ({ page }) => {
    await page.goto('/configuracion/locales')
    await expect(fila(page, 'San Isidro')).toContainText('cierra Dom')

    await fila(page, 'San Isidro').getByRole('button', { name: 'Editar' }).click()
    await drawer(page).getByRole('button', { name: 'Copiar a todos' }).click()
    await drawer(page).getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(fila(page, 'San Isidro')).toContainText('Todos los días')
    await page.reload()
    await expect(fila(page, 'San Isidro')).toContainText('Todos los días')
  })

  test('desactivar un local explica qué se ve afectado antes de guardar', async ({ page }) => {
    await page.goto('/configuracion/locales')
    const miraflores = fila(page, 'Miraflores')

    // En la tabla el estado solo se lee.
    await expect(miraflores.getByRole('button', { name: /Activo/ })).toHaveCount(0)

    await miraflores.getByRole('button', { name: 'Editar Miraflores' }).click()
    await drawer(page).getByRole('switch', { name: 'Activo' }).click()
    await drawer(page).getByRole('button', { name: 'Guardar cambios' }).click()

    const confirmacion = page.getByRole('dialog').filter({ hasText: 'Desactivar «Miraflores»' })
    await expect(confirmacion).toContainText('4 series activas no podrán emitir comprobantes.')
    await expect(confirmacion).toContainText('3 estaciones dejarán de recibir comandas.')

    await confirmacion.getByRole('button', { name: 'Desactivar y guardar' }).click()
    await expect(miraflores).toContainText('Inactivo')
  })

  test.describe('Impuestos y cargos', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/configuracion/impuestos')
    })

    test('el ticket de ejemplo se recalcula al cambiar el recargo', async ({ page }) => {
      const ticket = page.getByRole('complementary', { name: 'Ticket de ejemplo' })
      await page.getByLabel('Consumo de la mesa (S/)').fill('118')
      await expect(ticket).toContainText('S/ 128.00')

      await page.getByLabel('Porcentaje (%)').fill('5')
      await expect(ticket).toContainText('S/ 123.00')
    })

    test('no acepta un recargo al consumo mayor al 13 %', async ({ page }) => {
      await page.getByLabel('Porcentaje (%)').fill('15')
      await page.getByRole('button', { name: 'Guardar cambios' }).click()

      await expect(page.getByText('Máximo 13 %')).toBeVisible()
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
