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
  { ruta: '/configuracion/canales', nuevo: 'Nuevo canal' },
  { ruta: '/configuracion/areas', nuevo: 'Nueva área' },
  { ruta: '/configuracion/motivos', nuevo: 'Nuevo motivo' },
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

  test('las consultas del ERP se abren en modo detalle sin errores', async ({ page, entrar }) => {
    const errores = vigilarErrores(page)
    await entrar()
    for (const ruta of ['/compras/articulos', '/compras/proveedores', '/compras/marcas']) {
      await page.goto(ruta)
      await expect(page.locator('main tbody tr').first()).toBeVisible()
      await expect(page.getByRole('button', { name: /^(Nuevo|Nueva) / })).toHaveCount(0)
      await page.locator('main tbody').getByRole('button', { name: /^Ver / }).first().click()
      await expect(page.getByRole('dialog').last()).toContainText('Sincronizado desde el ERP')
      await page.getByRole('dialog').last().getByRole('button', { name: 'Cerrar' }).last().click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    expect(errores).toEqual([])
  })

  test('almacén y zonas, cadenas y consola de Karma sin errores', async ({ page, entrar }) => {
    const errores = vigilarErrores(page)
    await entrar()
    await page.goto('/inventario/zonas')
    await expect(page.getByText('Almacén Miraflores')).toBeVisible()
    await page.getByRole('button', { name: 'Nueva zona' }).click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    await cerrarDialogo(page)
    await page.getByRole('tab', { name: /Quién gestiona/ }).click()
    await expect(page.locator('main tbody tr').first()).toBeVisible()

    await page.goto('/configuracion/cadenas')
    await expect(page.getByText('Configuración de Cevicherías')).toBeVisible()
    await page.getByRole('button', { name: 'Nueva', exact: true }).click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    await cerrarDialogo(page)

    await page.goto('/karma/integracion')
    await expect(page.getByText('Modo de integración por capacidad')).toBeVisible()
    await expect(page.getByText('Vínculos con el ERP')).toBeVisible()
    expect(errores).toEqual([])
  })

  test('listas de precios: resuelve precio, descuento y reparto sin errores', async ({
    page,
    entrar,
  }) => {
    const errores = vigilarErrores(page)
    await entrar()
    await page.goto('/carta/listas-precios')
    await expect(page.getByRole('heading', { name: 'Carta Miraflores' })).toBeVisible()
    await expect(page.getByText('Reparto del combo')).toBeVisible()
    await page.getByRole('button', { name: 'Descuento de Chicha morada · Vaso' }).click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    await cerrarDialogo(page)
    await page.getByRole('button', { name: 'Nueva lista' }).click()
    await page.getByRole('dialog').last().getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Ponle un nombre a la lista.').first()).toBeVisible()
    await cerrarDialogo(page)
    expect(errores).toEqual([])
  })

  test('turnos, permisos y bitácora sin errores', async ({ page, entrar }) => {
    const errores = vigilarErrores(page)
    await entrar()
    await page.goto('/personal/turnos')
    await expect(page.getByText('Ahora mismo')).toBeVisible()
    await page.getByRole('button', { name: 'Nuevo turno' }).click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    await cerrarDialogo(page)

    await page.goto('/personal/bitacora')
    await expect(page.locator('main tbody tr').first()).toBeVisible()

    await page.goto('/configuracion/roles')
    await page.getByRole('button', { name: /^Cajero/ }).click()
    await page.getByRole('switch', { name: 'Editar la carta' }).click()
    await page.getByRole('button', { name: 'Guardar permisos' }).click()
    await expect(page.getByText('Permisos del rol guardados.')).toBeVisible()

    await page.goto('/configuracion/excepciones')
    await expect(page.getByText('Lo da su rol').first()).toBeVisible()
    expect(errores).toEqual([])
  })

  test('clientes y reservas sin errores', async ({ page, entrar }) => {
    const errores = vigilarErrores(page)
    await entrar()
    await page.goto('/clientes')
    await expect(page.getByText('Carla Benavides')).toBeVisible()
    await page.getByRole('button', { name: 'Editar ficha de sala Carla Benavides' }).click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    await page.getByRole('button', { name: 'Guardar ficha' }).click()
    await expect(page.getByText('Ficha de Carla Benavides guardada.')).toBeVisible()

    await page.goto('/reservas')
    await expect(page.getByText('Personas esperadas')).toBeVisible()
    await expect(page.locator('main tbody tr').first()).toBeVisible()
    await page.getByRole('button', { name: 'Nueva reserva' }).click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    await cerrarDialogo(page)
    // Cancelar pide motivo antes de tocar la reserva.
    await page.getByRole('button', { name: 'Cancelar' }).first().click()
    await expect(page.getByRole('dialog').last()).toContainText('Motivo')
    await cerrarDialogo(page)
    expect(errores).toEqual([])
  })

  test('pantallas sin catálogo cargan y responden sin errores', async ({ page, entrar }) => {
    const errores = vigilarErrores(page)
    await entrar()
    for (const ruta of [
      '/dashboard',
      '/mesas',
      '/inventario/movimientos',
      '/inventario/recetas',
      '/configuracion/vertical',
      '/configuracion/local',
      '/configuracion/roles',
      '/configuracion/excepciones',
      '/componentes',
    ]) {
      await page.goto(ruta)
      await expect(page.locator('main')).not.toBeEmpty()
    }

    await page.goto('/inventario/recetas')
    await page.getByRole('button', { name: 'Editar receta Lomo saltado' }).click()
    await expect(page.getByText('Margen de contribución').last()).toBeVisible()
    await expect(page.getByText('Modificadores y notas de Lomo saltado')).toBeVisible()
    await page.getByRole('button', { name: 'Guardar modificadores y notas' }).click()
    await expect(page.getByText('Modificadores y notas guardados.')).toBeVisible()
    await page.getByRole('button', { name: 'Guardar versión' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Editar receta Inca Kola 500 ml' }).click()
    await expect(page.getByText('Receta 1:1 automática')).toBeVisible()
    await cerrarDialogo(page)
    await page.getByRole('tab', { name: 'Combos' }).click()
    await expect(page.getByText('Combo marino')).toBeVisible()
    await page.getByRole('tab', { name: 'Si sube un insumo' }).click()
    await expect(page.getByText('Cebiche clásico · Personal')).toBeVisible()

    await page.goto('/carta')
    await page.getByRole('button', { name: 'Categorías' }).click()
    await expect(page.getByText('Solo en Miraflores')).toBeVisible()
    await page.getByRole('button', { name: 'Editar Postres' }).click()
    await expect(page.getByRole('dialog').getByText('Sección', { exact: true })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    expect(errores).toEqual([])
  })

  test('carta y combos cambian entre tabla y tarjetas', async ({ page, entrar }) => {
    const errores = vigilarErrores(page)
    await entrar()
    await page.goto('/carta')
    await page.getByRole('radio', { name: 'Tarjetas' }).click()
    await expect(page.locator('main tbody')).toHaveCount(0)
    const tarjeta = page.locator('article').filter({ hasText: 'Picarones' })
    await expect(tarjeta.locator('img')).toBeVisible()
    await tarjeta.getByRole('button', { name: 'Editar Picarones' }).last().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // La elección se recuerda al volver.
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Tarjetas' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await page.getByRole('radio', { name: 'Tabla' }).click()
    await expect(page.locator('main tbody tr').first()).toBeVisible()

    await page.goto('/combos')
    await page.getByRole('radio', { name: 'Tarjetas' }).click()
    await expect(page.locator('article').filter({ hasText: 'Combo marino' })).toBeVisible()
    await page.getByRole('button', { name: 'Editar Menú ejecutivo' }).last().click()
    await expect(page.getByRole('dialog').last()).toContainText('Editar combo')
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
