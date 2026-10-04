import { beforeEach, describe, expect, it } from 'vitest'
import { hoyLocal } from '@/utils/fechas'
import { db, reiniciarMock } from './mock/db'
import { precioVigente, preciosService, repartoCombo, vendibles } from './precios.service'

/**
 * Reglas de F4.5.2 (D-010): qué se vende, qué lista manda y cuánto se cobra
 * con descuento e IGV. Un error aquí descuadra comprobante y asiento.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const hoy = hoyLocal()
const anio = new Date().getFullYear()
const sinId = (id: string) => {
  const { id: _id, ...resto } = db.listasPrecios.find((l) => l.id === id)!
  return structuredClone(resto)
}

describe('productos vendibles', () => {
  it('con presentaciones se venden ellas y no el producto; adicionales con recargo y combos también', () => {
    const v = vendibles()
    expect(v.some((x) => x.id === 'p:p3')).toBe(false)
    expect(v.filter((x) => x.productoId === 'p3' && x.tipo === 'presentacion')).toHaveLength(2)
    expect(v.find((x) => x.id === 'm:mo3')).toMatchObject({
      tipo: 'adicional',
      precioReferencia: 4,
    })
    expect(v.some((x) => x.id === 'm:mo1')).toBe(false)
    expect(v.find((x) => x.id === 'c:cb2')?.tipo).toBe('combo')
    expect(new Set(v.map((x) => x.codigo)).size).toBe(v.length)
  })
})

describe('precio vigente', () => {
  it('toma el precio propio de la lista base y, sin él, el de la carta', () => {
    expect(precioVigente('p:p4', 'l1', 'cv1', hoy)).toMatchObject({ precio: 48, origen: 'lista' })
    expect(precioVigente('p:p1', 'l1', 'cv1', hoy)).toMatchObject({
      precio: 24,
      origen: 'referencia',
    })
  })

  it('una lista derivada aplica su ajuste sobre la de origen y respeta sus precios propios', () => {
    expect(precioVigente('p:p4', 'l1', 'cv4', hoy)).toMatchObject({
      precio: 55.2,
      origen: 'derivada',
    })
    expect(precioVigente('c:cb2', 'l1', 'cv4', hoy).precio).toBe(139)
    expect(precioVigente('p:p4', 'l2', 'cv1', hoy).precio).toBe(48)
  })

  it('el descuento de línea solo aplica en su vigencia', () => {
    const conDescuento = precioVigente('v:v3', 'l1', 'cv1', hoy)
    expect(conDescuento).toMatchObject({ precioLista: 12, descuentoPorcentaje: 20, precio: 9.6 })
    expect(precioVigente('v:v3', 'l1', 'cv1', `${anio + 2}-01-01`).descuentoPorcentaje).toBe(0)
  })

  it('la temporada manda en su vigencia y lo que no tiene lo toma de la base', () => {
    const fecha = `${anio + 1}-02-10`
    expect(precioVigente('v:v1', 'l1', 'cv1', fecha)).toMatchObject({ precio: 45, origen: 'lista' })
    expect(precioVigente('p:p4', 'l1', 'cv1', fecha)).toMatchObject({ precio: 48, origen: 'base' })
    // Para llevar no está en la temporada.
    expect(precioVigente('v:v1', 'l1', 'cv2', fecha).precio).toBe(42)
  })

  it('separa valor de venta e IGV según la lista incluya o no el impuesto', () => {
    const incluido = precioVigente('p:p4', 'l1', 'cv1', hoy)
    expect(incluido).toMatchObject({ igvIncluido: true, valorVenta: 40.68, igv: 7.32 })
    const sinIgv = precioVigente('p:p1', 'l3', 'cv1', hoy)
    expect(sinIgv).toMatchObject({ igvIncluido: false, valorVenta: 20.34, igv: 3.66 })
  })

  it('el reparto del combo suma exactamente su precio', () => {
    const r = repartoCombo('cb2', 'l1', 'cv4', hoy)
    expect(r).toHaveLength(4)
    expect(Math.round(r.reduce((s, x) => s + x.asignado, 0) * 100) / 100).toBe(139)
  })
})

describe('reglas de las listas', () => {
  it('un canal tiene una sola lista en uso a la vez (D-015)', async () => {
    await expect(
      preciosService.crear({
        ...sinId('lp1'),
        codigo: 'LP-X',
        nombre: 'Otra',
        precios: [],
        enUso: true,
      }),
    ).rejects.toMatchObject({ campos: { canalIds: 'Ya hay una en uso' } })
  })

  it('el catálogo admite tantas listas preparadas como se quieran (D-015)', async () => {
    // Lo que D-010 prohibía: dos listas del mismo local y canal, guardadas.
    const otra = await preciosService.crear({
      ...sinId('lp1'),
      codigo: 'LP-X2',
      nombre: 'Otra preparada',
      precios: [],
      enUso: false,
    })
    expect(otra.enUso).toBe(false)
    // No cobra nada mientras no se ponga en uso.
    expect(precioVigente('p:p4', 'l1', 'cv1', hoy).listaId).toBe('lp1')
  })

  it('poner en uso una lista saca a la anterior en sus canales (D-015)', async () => {
    expect(precioVigente('p:p4', 'l1', 'cv1', hoy).listaId).toBe('lp1')
    await preciosService.ponerEnUso('lp6')
    expect(precioVigente('p:p4', 'l1', 'cv1', hoy).listaId).toBe('lp6')
    // La anterior no se borra: vuelve al catálogo, lista para recuperarla.
    const listas = await preciosService.listas()
    expect(listas.find((l) => l.id === 'lp1')).toMatchObject({ enUso: false, activa: true })
    await preciosService.ponerEnUso('lp1')
    expect(precioVigente('p:p4', 'l1', 'cv1', hoy).listaId).toBe('lp1')
  })

  it('una lista programada tapa a la elegida, y al pasar su periodo la devuelve', () => {
    const dentro = `${anio + 1}-02-10`
    const despues = `${anio + 1}-06-10`
    expect(precioVigente('v:v1', 'l1', 'cv1', dentro)).toMatchObject({
      precio: 45,
      origen: 'lista',
    })
    // Pasada la temporada vuelve a cobrar la que estaba en uso, sin tocar nada.
    expect(precioVigente('v:v1', 'l1', 'cv1', despues).listaId).toBe('lp1')
  })

  it('dos listas programadas a la vez en un canal se rechazan, y la vigencia va ordenada', async () => {
    const base = { ...sinId('lp3'), codigo: 'LP-Y', nombre: 'Otra temporada', precios: [] }
    await expect(
      preciosService.crear({ ...base, desde: `${anio + 1}-03-01`, hasta: `${anio + 1}-04-30` }),
    ).rejects.toMatchObject({ campos: { vigencia: 'Vigencia solapada' } })
    await expect(
      preciosService.crear({ ...base, desde: `${anio + 1}-05-10`, hasta: `${anio + 1}-05-01` }),
    ).rejects.toMatchObject({ campos: { vigencia: 'Fechas invertidas' } })
    await expect(
      preciosService.crear({ ...base, desde: `${anio + 1}-04-01`, hasta: `${anio + 1}-04-30` }),
    ).resolves.toBeTruthy()
  })

  it('no permite derivaciones en círculo ni eliminar una lista de la que otras derivan', async () => {
    await expect(
      preciosService.actualizar('lp1', { ...sinId('lp1'), derivadaDe: 'lp2', ajustePorcentaje: 0 }),
    ).rejects.toMatchObject({ campos: { derivadaDe: expect.any(String) } })
    await expect(preciosService.eliminar('lp1')).rejects.toMatchObject({
      mensaje: expect.stringContaining('Rappi Miraflores'),
    })
  })
})
