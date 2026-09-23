import { beforeEach, describe, expect, it } from 'vitest'
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

const hoy = new Date().toISOString().slice(0, 10)
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
  it('un canal no tiene dos listas base en el mismo local', async () => {
    await expect(
      preciosService.crear({ ...sinId('lp1'), codigo: 'LP-X', nombre: 'Otra', precios: [] }),
    ).rejects.toMatchObject({ campos: { canalIds: 'Canal con otra lista base' } })
  })

  it('las temporadas del mismo canal no se solapan y necesitan vigencia ordenada', async () => {
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
