import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * Prueba de humo: recorre cada pantalla y usa sus botones principales
 * vigilando errores de JavaScript. No valida reglas de negocio (eso lo hacen
 * las demás pruebas): responde «¿algo se rompe al usarlo?».
 */

function vigilarErrores(page: Page) {
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[Vue warn]'))) {
      errores.push(m.text().slice(0, 200))
    }
  })
  return errores
}

/** Cierra el diálogo o drawer abierto con su botón Cancelar o Cerrar. */
async function cerrarDialogo(page: Page) {
  const dialogo = page.getByRole('dialog').last()
  const cancelar = dialogo.getByRole('button', { name: /^(Cancelar|Cerrar)$/ }).last()
  if (await cancelar.count()) await cancelar.click()
  else await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

const catalogos = [
  { ruta: '/salones', nuevo: 'Nuevo salón' },
  { ruta: '/carta', nuevo: 'Nuevo producto' },
  { ruta: '/combos', nuevo: 'Nuevo combo' },
  { ruta: '/inventario', nuevo: 'Nuevo insumo' },
  { ruta: '/inventario/almacenes', nuevo: 'Nuevo almacén' },
  { ruta: '/compras/proveedores', nuevo: 'Nuevo proveedor' },
  { ruta: '/compras/ordenes', nuevo: 'Nueva orden' },
  { ruta: '/configuracion/locales', nuevo: 'Nuevo local' },
  { ruta: '/configuracion/medios-pago', nuevo: 'Nuevo medio de pago' },
  { ruta: '/configuracion/canales', nuevo: 'Nuevo canal' },
  { ruta: '/configuracion/produccion', nuevo: 'Nueva estación' },
  { ruta: '/configuracion/motivos', nuevo: 'Nuevo motivo' },
  { ruta: '/configuracion/series', nuevo: 'Nueva serie' },
]

test.describe('Humo: botones de cada pantalla', () => {
  for (const c of catalogos) {
    test(`${c.ruta}: nuevo, editar y guardar sin errores`, async ({ page, entrar }) => {
      const errores = vigilarErrores(page)
      await entrar()
      await page.goto(c.ruta)
      await expect(page.locator('main tbody tr').first()).toBeVisible()

      await page.getByRole('button', { name: c.nuevo }).click()
      await expect(page.getByRole('dialog').last()).toBeVisible()
      await cerrarDialogo(page)

      // Editar las tres primeras filas: se abre y guarda sin cambios.
      const editar = page.locator('main tbody').getByRole('button', { name: /^(Editar|Ver) / })
      const total = Math.min(3, await editar.count())
      for (let i = 0; i < total; i++) {
        await editar.nth(i).click()
        const dialogo = page.getByRole('dialog').last()
        await expect(dialogo).toBeVisible()
        const guardar = dialogo.getByRole('button', { name: 'Guardar cambios' })
        const hayGuardar = (await guardar.count()) > 0 && (await guardar.isEnabled())
        await (hayGuardar ? guardar.click() : cerrarDialogo(page))
        await expect(page.getByRole('dialog')).toHaveCount(0)
      }

      // Exportar abre su menú.
      const exportar = page.getByRole('button', { name: 'Exportar' })
      if (await exportar.count()) {
        await exportar.first().click()
        await expect(page.getByRole('menuitem', { name: /Excel/ })).toBeVisible()
        await page.keyboard.press('Escape')
      }

      expect(errores).toEqual([])
    })
  }

  test('pantallas sin catálogo cargan y responden sin errores', async ({ page, entrar }) => {
    const errores = vigilarErrores(page)
    await entrar()
    for (const ruta of [
      '/dashboard',
      '/mesas',
      '/inventario/movimientos',
      '/inventario/recetas',
      '/inventario/tomas',
      '/configuracion/empresa',
      '/configuracion/impuestos',
      '/componentes',
    ]) {
      await page.goto(ruta)
      await expect(page.locator('main')).not.toBeEmpty()
    }

    await page.goto('/configuracion/empresa')
    await page.getByLabel('Nombre comercial').fill('Mesa · Cocina Limeña y Bar')
    await page.getByRole('button', { name: 'Descartar' }).click()
    await expect(page.getByLabel('Nombre comercial')).toHaveValue('Mesa · Cocina Limeña')

    await page.goto('/inventario/recetas')
    await page.getByRole('button', { name: 'Editar receta Lomo saltado' }).click()
    await page.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.goto('/carta')
    await page.getByRole('button', { name: 'Categorías' }).click()
    await page.getByRole('button', { name: 'Editar Postres' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    expect(errores).toEqual([])
  })

  test('los productos muestran su ilustración y el editor la conserva', async ({
    page,
    entrar,
  }) => {
    await entrar()
    await page.goto('/carta')
    await expect(page.locator('main tbody img').first()).toBeVisible()
    expect(await page.locator('main tbody img').count()).toBeGreaterThanOrEqual(15)

    await page.getByRole('button', { name: 'Editar Lomo saltado' }).click()
    await expect(page.getByRole('dialog').locator('img')).toBeVisible()
    await page
      .getByRole('dialog')
      .getByLabel(/Nombre/)
      .first()
      .fill('Lomo saltado de la casa')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.locator('main tbody')).toContainText('Lomo saltado de la casa')
  })
})
