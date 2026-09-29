import { beforeEach, describe, expect, it } from 'vitest'
import { comprobantesService } from './comprobantes.service'
import { db, reiniciarMock } from './mock/db'
import { reportesService } from './reportes.service'
import { ventasService } from './ventas.service'

/**
 * F9 · Reportes (D-014): la anulada no existe, el ingreso se mide neto, la
 * propina y el recargo van aparte, y la diferencia entre consumo teórico y real
 * se enseña en lugar de taparse.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'
const MESERO = 'u2'
const CAJERO = 'u4'

const hoy = new Date()
const dia = (atras: number) => {
  const d = new Date(hoy.getTime() - atras * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const rango = { localId: 'l1', desde: dia(21), hasta: dia(0) }

describe('resumen de ventas', () => {
  it('trae las tres semanas de historia con su detalle', async () => {
    const r = await reportesService.ventas(rango)
    expect(r.cuentas).toBeGreaterThan(100)
    expect(r.porDia.length).toBeGreaterThan(15)
    expect(r.porCanal.length).toBeGreaterThan(1)
    expect(r.porHora.some((h) => h.hora >= 19)).toBe(true)
  })

  it('el neto más el IGV dan el total cobrado', async () => {
    const r = await reportesService.ventas(rango)
    expect(r.neto + r.igv).toBeCloseTo(r.total, 0)
  })

  it('deja fuera las ventas anuladas y las cuenta aparte', async () => {
    const r = await reportesService.ventas(rango)
    expect(r.anuladas).toBeGreaterThan(0)
    const sumaDias = r.porDia.reduce((s, d) => s + d.cuentas, 0)
    expect(sumaDias).toBe(r.cuentas)
    // Ninguna anulada se coló en el total.
    const anuladas = db.ventas.filter((v) => v.estado === 'anulada')
    expect(anuladas.length).toBe(r.anuladas)
  })

  it('el ticket medio es el total entre las cuentas', async () => {
    const r = await reportesService.ventas(rango)
    expect(r.ticketMedio).toBeCloseTo(r.total / r.cuentas, 1)
  })

  it('separa propina y recargo al consumo del ingreso', async () => {
    const r = await reportesService.ventas(rango)
    expect(r.propinas).toBeGreaterThan(0)
    expect(r.recargoConsumo).toBeGreaterThan(0)
    // El recargo va dentro del total cobrado, pero se puede aislar.
    expect(r.recargoConsumo).toBeLessThan(r.total)
  })

  it('la comisión de la app se enseña sin restarla de la venta', async () => {
    const r = await reportesService.ventas(rango)
    const rappi = r.porCanal.find((c) => c.nombre === 'Rappi')
    expect(rappi?.comision).toBeGreaterThan(0)
    expect(rappi?.comision).toBeLessThan(rappi!.neto)
    const suma = r.porCanal.reduce((s, c) => s + c.total, 0)
    expect(suma).toBeCloseTo(r.total, 0)
  })

  it('filtra por canal', async () => {
    const todo = await reportesService.ventas(rango)
    const salon = await reportesService.ventas({ ...rango, canalId: 'cv1' })
    expect(salon.cuentas).toBeLessThan(todo.cuentas)
    expect(salon.porCanal).toHaveLength(1)
  })

  it('una nota de crédito parcial rebaja la venta en el reporte', async () => {
    await ventasService.comandar('pd1', MESERO)
    const cuenta = await ventasService.precuenta('pd1')
    const venta = await ventasService.cobrar(
      'pd1',
      { pagos: [{ medioPagoId: 'mp1', nombre: '', monto: cuenta.total }] },
      CAJERO,
    )
    const antes = await reportesService.ventas(rango)

    const boleta = await comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN)
    await comprobantesService.enviar(boleta.id, ADMIN)
    await comprobantesService.emitirNotaCredito(
      boleta.id,
      { motivo: 'descuento', montoParcial: 30 },
      ADMIN,
    )

    const despues = await reportesService.ventas(rango)
    expect(despues.cuentas).toBe(antes.cuentas)
    expect(despues.total).toBeCloseTo(antes.total - 30, 1)
  })
})

describe('rentabilidad por plato', () => {
  it('ordena por margen y reparte A, B y C', async () => {
    const r = await reportesService.platos(rango)
    expect(r.platos.length).toBeGreaterThan(3)
    expect(r.platos[0]!.margen).toBeGreaterThanOrEqual(r.platos[1]!.margen)
    expect(r.platos[0]!.clase).toBe('A')
    expect(r.platos.some((p) => p.clase === 'C')).toBe(true)
  })

  it('el food cost real se compara con el objetivo que le toca', async () => {
    const r = await reportesService.platos(rango)
    const conReceta = r.platos.find((p) => !p.sinReceta)!
    expect(conReceta.foodCostReal).toBeGreaterThan(0)
    expect(conReceta.objetivo).toBeGreaterThan(0)
    expect(conReceta.margen).toBeCloseTo(conReceta.ingresoNeto - conReceta.costo, 2)
  })

  it('los platos sin receta se cuentan aparte y no ensucian el food cost', async () => {
    const r = await reportesService.platos(rango)
    expect(r.sinReceta).toBeGreaterThan(0)
    const costoConReceta = r.platos.filter((p) => !p.sinReceta).reduce((s, p) => s + p.costo, 0)
    expect(r.costo).toBeCloseTo(costoConReceta, 1)
  })

  it('el ingreso del plato es neto, sin IGV', async () => {
    const r = await reportesService.platos(rango)
    const plato = r.platos.find((p) => p.vendibleId === 'v:v1')!
    // 42 soles con IGV incluido son 35.59 netos por unidad.
    expect(plato.ingresoNeto / plato.unidades).toBeCloseTo(42 / 1.18, 1)
  })
})

describe('consumo y mermas', () => {
  it('compara lo que dicen las recetas con lo que salió del almacén', async () => {
    const r = await reportesService.consumo(rango)
    expect(r.insumos.length).toBeGreaterThan(3)
    expect(r.costoTeorico).toBeGreaterThan(0)
    const pescado = r.insumos.find((i) => i.nombre.toLowerCase().includes('lenguado'))
    expect(pescado?.teorico).toBeGreaterThan(0)
  })

  it('lo vendido dejó su rastro en el almacén, no un cero', async () => {
    const r = await reportesService.consumo(rango)
    // Sin movimientos de salida el reporte diría que no salió nada, que miente
    // más que no decir nada.
    expect(r.costoReal).toBeGreaterThan(0)
    const pescado = r.insumos.find((i) => i.nombre.toLowerCase().includes('lenguado'))!
    expect(pescado.real).toBeGreaterThan(0)
    // Teórico y real se parecen, pero no son iguales: eso es lo que se mira.
    expect(Math.abs(pescado.diferencia)).toBeLessThan(pescado.teorico * 0.3)
  })

  it('la diferencia se valoriza al costo del insumo', async () => {
    const r = await reportesService.consumo(rango)
    const fila = r.insumos[0]!
    expect(fila.diferencia).toBeCloseTo(fila.real - fila.teorico, 3)
    expect(fila.costoDiferencia).toBeCloseTo(fila.diferencia * fila.costoUnitario, 2)
  })

  it('una venta de hoy suma consumo real y acerca la diferencia', async () => {
    const soloHoy = { localId: 'l1', desde: dia(0), hasta: dia(0) }
    const antes = await reportesService.consumo(soloHoy)
    await ventasService.comandar('pd1', MESERO)
    const cuenta = await ventasService.precuenta('pd1')
    await ventasService.cobrar(
      'pd1',
      { pagos: [{ medioPagoId: 'mp1', nombre: '', monto: cuenta.total }] },
      CAJERO,
    )
    const despues = await reportesService.consumo(soloHoy)
    expect(despues.costoReal).toBeGreaterThan(antes.costoReal)
    expect(despues.costoTeorico).toBeGreaterThan(antes.costoTeorico)
  })

  it('las mermas registradas se reportan aparte', async () => {
    const insumo = db.insumos[0]!
    db.movimientos.push({
      id: 'mv-merma-prueba',
      insumoId: insumo.id,
      zonaId: insumo.existencias[0]!.zonaId,
      tipo: 'merma',
      cantidad: 2,
      motivo: 'Se malogró en cámara',
      usuarioId: ADMIN,
      fecha: new Date().toISOString(),
    })
    const r = await reportesService.consumo({ localId: 'l1', desde: dia(0), hasta: dia(0) })
    const fila = r.insumos.find((i) => i.insumoId === insumo.id)
    expect(fila?.merma).toBe(2)
    expect(r.costoMerma).toBeGreaterThan(0)
  })
})
