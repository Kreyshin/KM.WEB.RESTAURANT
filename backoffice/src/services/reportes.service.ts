import type {
  ClaseAbc,
  ConsumoInsumo,
  FiltroReporte,
  RentabilidadPlato,
  ResumenConsumo,
  ResumenPlatos,
  ResumenVentas,
  Venta,
  VentasPorCanal,
  VentasPorDia,
  VentasPorHora,
} from '@/types'
import { db, latencia } from './mock/db'
import { costoReceta } from './recetas.service'
import { vendibles } from './precios.service'

/**
 * Reportes (F9, D-014).
 *
 * Un reporte miente sin querer: basta sumar lo que no toca. Aquí se respeta lo
 * decidido —la anulada no existe, el ingreso se mide neto, la propina y el
 * recargo al consumo van aparte, la comisión de la app es gasto— y cada cifra
 * dice de dónde sale.
 */

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000

/** Hora local del restaurante, que es la que ordena el servicio. */
const horaDe = (iso: string) => new Date(iso).getHours()
const diaDe = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Notas de crédito que rebajan una venta sin anularla (D-014, punto 1). */
function rebajaDe(ventaId: string) {
  return db.comprobantes
    .filter((c) => c.tipo === 'notaCredito' && c.ventaId === ventaId)
    .reduce((s, c) => s + c.totales.total, 0)
}

/** Las ventas que cuentan: cobradas, del local, del canal y dentro del rango. */
function ventasDe(filtro: FiltroReporte): Venta[] {
  return db.ventas.filter((v) => {
    if (v.estado !== 'cobrada') return false
    if (filtro.localId && v.localId !== filtro.localId) return false
    if (filtro.canalId && v.canalId !== filtro.canalId) return false
    const dia = diaDe(v.fecha)
    return dia >= filtro.desde && dia <= filtro.hasta
  })
}

const pedidoDe = (venta: Venta) => db.pedidos.find((p) => p.id === venta.pedidoId)

export function resumenVentas(filtro: FiltroReporte): ResumenVentas {
  const ventas = ventasDe(filtro)
  const anuladas = db.ventas.filter(
    (v) =>
      v.estado === 'anulada' &&
      (!filtro.localId || v.localId === filtro.localId) &&
      diaDe(v.fecha) >= filtro.desde &&
      diaDe(v.fecha) <= filtro.hasta,
  ).length

  const dias = new Map<string, VentasPorDia>()
  const canales = new Map<string, VentasPorCanal>()
  const horas = new Map<number, VentasPorHora>()

  let total = 0
  let neto = 0
  let igv = 0
  let recargo = 0
  let propinas = 0
  let descuentos = 0
  let comensales = 0

  for (const venta of ventas) {
    const rebaja = rebajaDe(venta.id)
    const totalVenta = r2(venta.totales.total - rebaja)
    const proporcion = venta.totales.total ? totalVenta / venta.totales.total : 0
    const netoVenta = r2(venta.totales.valorVenta * proporcion)
    const igvVenta = r2(venta.totales.igv * proporcion)
    const recargoVenta = r2(venta.totales.recargoConsumo * proporcion)
    const descuentoVenta = r2(
      (venta.totales.descuentoPromociones + venta.totales.descuentoEnvio) * proporcion,
    )
    const gente = pedidoDe(venta)?.comensales ?? 0

    total += totalVenta
    neto += netoVenta
    igv += igvVenta
    recargo += recargoVenta
    propinas += venta.propina
    descuentos += descuentoVenta
    comensales += gente

    const dia = diaDe(venta.fecha)
    const filaDia = dias.get(dia) ?? {
      fecha: dia,
      cuentas: 0,
      comensales: 0,
      total: 0,
      neto: 0,
      igv: 0,
      recargoConsumo: 0,
      propinas: 0,
      descuentos: 0,
    }
    filaDia.cuentas += 1
    filaDia.comensales += gente
    filaDia.total = r2(filaDia.total + totalVenta)
    filaDia.neto = r2(filaDia.neto + netoVenta)
    filaDia.igv = r2(filaDia.igv + igvVenta)
    filaDia.recargoConsumo = r2(filaDia.recargoConsumo + recargoVenta)
    filaDia.propinas = r2(filaDia.propinas + venta.propina)
    filaDia.descuentos = r2(filaDia.descuentos + descuentoVenta)
    dias.set(dia, filaDia)

    const canal = db.canales.find((c) => c.id === venta.canalId)
    const filaCanal = canales.get(venta.canalId) ?? {
      canalId: venta.canalId,
      nombre: canal?.nombre ?? venta.canalId,
      cuentas: 0,
      total: 0,
      neto: 0,
      comision: 0,
      participacion: 0,
    }
    filaCanal.cuentas += 1
    filaCanal.total = r2(filaCanal.total + totalVenta)
    filaCanal.neto = r2(filaCanal.neto + netoVenta)
    // La comisión de la app es gasto: se enseña, no se resta de la venta.
    filaCanal.comision = r2(
      filaCanal.comision + netoVenta * ((canal?.comisionPorcentaje ?? 0) / 100),
    )
    canales.set(venta.canalId, filaCanal)

    const hora = horaDe(venta.fecha)
    const filaHora = horas.get(hora) ?? { hora, cuentas: 0, total: 0 }
    filaHora.cuentas += 1
    filaHora.total = r2(filaHora.total + totalVenta)
    horas.set(hora, filaHora)
  }

  total = r2(total)
  for (const canal of canales.values())
    canal.participacion = total ? r2((canal.total / total) * 100) : 0

  return {
    ...filtro,
    cuentas: ventas.length,
    comensales,
    total,
    neto: r2(neto),
    igv: r2(igv),
    recargoConsumo: r2(recargo),
    propinas: r2(propinas),
    descuentos: r2(descuentos),
    ticketMedio: ventas.length ? r2(total / ventas.length) : 0,
    gastoPorComensal: comensales ? r2(total / comensales) : 0,
    anuladas,
    porDia: [...dias.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    porCanal: [...canales.values()].sort((a, b) => b.total - a.total),
    porHora: [...horas.values()].sort((a, b) => a.hora - b.hora),
  }
}

/** Reparte A, B y C por lo que aporta cada plato al margen total. */
function clasificar(platos: RentabilidadPlato[]) {
  const total = platos.reduce((s, p) => s + Math.max(0, p.margen), 0)
  let acumulado = 0
  for (const plato of [...platos].sort((a, b) => b.margen - a.margen)) {
    const antes = acumulado
    acumulado += total ? (Math.max(0, plato.margen) / total) * 100 : 0
    plato.clase = (antes < 80 ? 'A' : antes < 95 ? 'B' : 'C') satisfies ClaseAbc
  }
}

export function resumenPlatos(filtro: FiltroReporte): ResumenPlatos {
  const ventas = ventasDe(filtro)
  const catalogo = vendibles()
  const acumulado = new Map<string, RentabilidadPlato>()

  for (const venta of ventas) {
    const pedido = pedidoDe(venta)
    if (!pedido) continue
    for (const linea of pedido.lineas) {
      if (linea.estado === 'anulada') continue
      const vendible = catalogo.find((v) => v.id === linea.vendibleId)
      const categoria = db.categorias.find((c) => c.id === vendible?.categoriaId)
      const costo = costoReceta(linea.vendibleId, {
        localId: venta.localId,
        canalId: venta.canalId,
      })
      const sinReceta = costo.lineas.length === 0
      // El ingreso se mide neto: es lo comparable con el costo (D-014).
      const bruto = (linea.precioUnitario + linea.recargoModificadores) * linea.cantidad
      const netoLinea = bruto / (1 + venta.totales.tasaIgv / 100)

      const fila = acumulado.get(linea.vendibleId) ?? {
        vendibleId: linea.vendibleId,
        nombre: linea.nombre,
        categoriaId: vendible?.categoriaId,
        categoria: categoria?.nombre ?? 'Sin categoría',
        unidades: 0,
        ingresoNeto: 0,
        costo: 0,
        margen: 0,
        foodCostReal: 0,
        objetivo: costo.objetivo,
        sinReceta,
        clase: 'C' as ClaseAbc,
      }
      fila.unidades += linea.cantidad
      fila.ingresoNeto = r2(fila.ingresoNeto + netoLinea)
      fila.costo = r2(
        fila.costo + (costo.costoIngredientes + costo.costoConsumibles) * linea.cantidad,
      )
      acumulado.set(linea.vendibleId, fila)
    }
  }

  const platos = [...acumulado.values()]
  for (const plato of platos) {
    plato.margen = r2(plato.ingresoNeto - plato.costo)
    plato.foodCostReal = plato.ingresoNeto ? r2((plato.costo / plato.ingresoNeto) * 100) : 0
  }
  clasificar(platos)
  platos.sort((a, b) => b.margen - a.margen)

  const ingresoNeto = r2(platos.reduce((s, p) => s + p.ingresoNeto, 0))
  // Los platos sin receta no ensucian el food cost: se cuentan aparte.
  const conReceta = platos.filter((p) => !p.sinReceta)
  const ingresoConReceta = conReceta.reduce((s, p) => s + p.ingresoNeto, 0)
  const costo = r2(conReceta.reduce((s, p) => s + p.costo, 0))

  return {
    ...filtro,
    unidades: platos.reduce((s, p) => s + p.unidades, 0),
    ingresoNeto,
    costo,
    margen: r2(ingresoConReceta - costo),
    foodCostReal: ingresoConReceta ? r2((costo / ingresoConReceta) * 100) : 0,
    sinReceta: platos.filter((p) => p.sinReceta).length,
    platos,
  }
}

export function resumenConsumo(filtro: FiltroReporte): ResumenConsumo {
  const ventas = ventasDe(filtro)
  const filas = new Map<string, ConsumoInsumo>()

  const fila = (insumoId: string) => {
    const insumo = db.insumos.find((i) => i.id === insumoId)
    const actual = filas.get(insumoId) ?? {
      insumoId,
      nombre: insumo?.nombre ?? 'Insumo eliminado',
      unidad: insumo?.unidad ?? 'unidad',
      teorico: 0,
      real: 0,
      merma: 0,
      diferencia: 0,
      costoUnitario: insumo?.costoUnitario ?? 0,
      costoDiferencia: 0,
    }
    filas.set(insumoId, actual)
    return actual
  }

  // Teórico: lo que dicen las recetas de lo que se vendió.
  for (const venta of ventas) {
    const pedido = pedidoDe(venta)
    if (!pedido) continue
    for (const linea of pedido.lineas) {
      if (linea.estado === 'anulada') continue
      const costo = costoReceta(linea.vendibleId, {
        localId: venta.localId,
        canalId: venta.canalId,
      })
      for (const l of costo.lineas)
        fila(l.insumoId).teorico = r3(fila(l.insumoId).teorico + l.cantidadInsumo * linea.cantidad)
    }
  }

  // Real: lo que salió del almacén por venta, y las mermas registradas.
  for (const movimiento of db.movimientos) {
    // El día es el del restaurante, no el de Greenwich: cortar por UTC mandaba
    // el consumo de la cena al día siguiente y el reporte quedaba corto.
    const dia = diaDe(movimiento.fecha)
    if (dia < filtro.desde || dia > filtro.hasta) continue
    if (movimiento.tipo === 'salida' && movimiento.motivo?.startsWith('Venta'))
      fila(movimiento.insumoId).real = r3(fila(movimiento.insumoId).real + movimiento.cantidad)
    if (movimiento.tipo === 'merma')
      fila(movimiento.insumoId).merma = r3(fila(movimiento.insumoId).merma + movimiento.cantidad)
  }

  const insumos = [...filas.values()]
  for (const f of insumos) {
    f.diferencia = r3(f.real - f.teorico)
    f.costoDiferencia = r2(f.diferencia * f.costoUnitario)
  }
  insumos.sort((a, b) => Math.abs(b.costoDiferencia) - Math.abs(a.costoDiferencia))

  return {
    ...filtro,
    costoTeorico: r2(insumos.reduce((s, f) => s + f.teorico * f.costoUnitario, 0)),
    costoReal: r2(insumos.reduce((s, f) => s + f.real * f.costoUnitario, 0)),
    costoMerma: r2(insumos.reduce((s, f) => s + f.merma * f.costoUnitario, 0)),
    insumos,
  }
}

export const reportesService = {
  async ventas(filtro: FiltroReporte) {
    return latencia(resumenVentas(filtro))
  },
  async platos(filtro: FiltroReporte) {
    return latencia(resumenPlatos(filtro))
  },
  async consumo(filtro: FiltroReporte) {
    return latencia(resumenConsumo(filtro))
  },
}
