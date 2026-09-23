import { beforeEach, describe, expect, it } from 'vitest'
import { cartaService, categoriaOfrecida, productoOfrecido } from './carta.service'
import { db, reiniciarMock } from './mock/db'
import { costoReceta } from './recetas.service'

/**
 * Reglas de F4.6.3: secciones de un nivel, categoría por local y canal,
 * producto por local y objetivo de food cost de la categoría o su sección.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const base = { nombre: 'Nueva', orden: 9, activa: true }

describe('secciones', () => {
  it('agrupan en un solo nivel', async () => {
    // c3 ya está dentro de «Fondos».
    await expect(cartaService.crearCategoria({ ...base, seccionId: 'c3' })).rejects.toMatchObject({
      campos: { seccionId: 'Un solo nivel' },
    })
    // «Fondos» agrupa: no puede entrar en otra sección.
    await expect(cartaService.actualizarCategoria('c8', { seccionId: 'c1' })).rejects.toMatchObject(
      {
        campos: { seccionId: 'Un solo nivel' },
      },
    )
    await expect(cartaService.crearCategoria({ ...base, seccionId: 'c8' })).resolves.toBeTruthy()
  })

  it('no se elimina una sección que agrupa categorías', async () => {
    await expect(cartaService.eliminarCategoria('c8')).rejects.toMatchObject({
      mensaje: expect.stringContaining('Fondos criollos'),
    })
  })

  it('quitar la sección de una categoría la deja suelta', async () => {
    await cartaService.actualizarCategoria('c3', { seccionId: undefined })
    expect(db.categorias.find((c) => c.id === 'c3')!.seccionId).toBeUndefined()
  })
})

describe('por local y canal', () => {
  it('la categoría se ofrece solo en sus canales', () => {
    expect(categoriaOfrecida('c5', 'l1', 'cv1')).toBe(true)
    expect(categoriaOfrecida('c5', 'l1', 'cv4')).toBe(false)
  })

  it('una categoría hereda las restricciones de su sección', async () => {
    await cartaService.actualizarCategoria('c8', { localIds: ['l2'] })
    expect(categoriaOfrecida('c3', 'l1')).toBe(false)
    expect(categoriaOfrecida('c3', 'l2')).toBe(true)
  })

  it('el producto puede no ofrecerse en un local', () => {
    expect(productoOfrecido('p4', 'l1', 'cv1')).toBe(true)
    expect(productoOfrecido('p4', 'l3', 'cv1')).toBe(false)
  })

  it('rechaza locales y canales que no existen', async () => {
    await expect(
      cartaService.actualizarCategoria('c1', { canalIds: ['no-existe'] }),
    ).rejects.toBeTruthy()
    await expect(
      cartaService.actualizarProducto('p1', { noOfrecidoEn: ['no-existe'] }),
    ).rejects.toBeTruthy()
  })
})

describe('objetivo de food cost', () => {
  it('sin objetivo propio, la categoría toma el de su sección', () => {
    // Lomo saltado está en Fondos criollos, dentro de Fondos (33 %).
    expect(costoReceta('p:p6', { localId: 'l1', canalId: 'cv1' })).toMatchObject({
      objetivo: 33,
      origenObjetivo: 'categoria',
    })
  })

  it('valida el rango del objetivo', async () => {
    await expect(
      cartaService.actualizarCategoria('c1', { foodCostObjetivo: 120 }),
    ).rejects.toBeTruthy()
  })
})
