import type { ConsumoLinea, LineaPedido, MomentoDescuento, Pedido } from '@/types'
import { registrar } from './auditoria.service'
import { aplicarMovimiento, transaccion, zonaPrincipal } from './inventario.service'
import { db, persistir } from './mock/db'
import { valorConfig } from './parametros.service'
import { costoReceta } from './recetas.service'

/**
 * Consumo de insumos por venta (F7, D-007).
 *
 * Cuando se vende un plato, su receta sale del almacén. El **momento** es
 * configurable por local —al comandar, que es cuando la cocina lo toca de
 * verdad, o al cobrar, que es cuando la venta existe— y se puede apagar: el
 * restaurante pequeño mide su stock a ojo y no quiere que la caja dependa del
 * inventario.
 *
 * Regla que no se negocia: **la venta nunca se bloquea por stock**. Si falta
 * insumo se descuenta lo que hay, se anota el faltante y se avisa. Un cliente
 * esperando no es el momento de cuadrar el inventario.
 */

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000

export const etiquetaMomento: Record<MomentoDescuento, string> = {
  no: 'No descontar',
  comandar: 'Al comandar',
  cobrar: 'Al cobrar',
}

export function momentoDescuento(localId: string): MomentoDescuento {
  return valorConfig<MomentoDescuento>('ventas.descuentoStock', localId)
}

/** Lo que consume una línea del pedido, en la unidad de cada insumo. */
export function consumoDeLinea(linea: LineaPedido, pedido: Pedido): ConsumoLinea[] {
  const costo = costoReceta(linea.vendibleId, {
    localId: pedido.localId,
    canalId: pedido.canalId,
  })
  return costo.lineas
    .filter((l) => l.cantidadInsumo > 0)
    .map((l) => ({
      insumoId: l.insumoId,
      nombre: l.nombre,
      cantidad: r3(l.cantidadInsumo * linea.cantidad),
      faltante: 0,
    }))
}

/**
 * Consumo de las líneas que todavía no lo registraron, sumado por insumo. Es
 * lo que se mostraría antes de descontar y lo que se descuenta después.
 */
export function consumoPendiente(pedido: Pedido, lineas?: LineaPedido[]): ConsumoLinea[] {
  const fuente = (lineas ?? pedido.lineas).filter(
    (l) => l.estado !== 'anulada' && !l.consumoRegistrado,
  )
  const porInsumo = new Map<string, ConsumoLinea>()
  for (const linea of fuente) {
    for (const consumo of consumoDeLinea(linea, pedido)) {
      const previo = porInsumo.get(consumo.insumoId)
      if (previo) previo.cantidad = r3(previo.cantidad + consumo.cantidad)
      else porInsumo.set(consumo.insumoId, { ...consumo })
    }
  }
  return [...porInsumo.values()]
}

/** Productos de la cuenta que no tienen receta: nada que descontar por ellos. */
export function sinReceta(pedido: Pedido): string[] {
  return [
    ...new Set(
      pedido.lineas
        .filter((l) => l.estado !== 'anulada' && !consumoDeLinea(l, pedido).length)
        .map((l) => l.nombre),
    ),
  ]
}

/**
 * Descuenta del stock lo que consumen esas líneas y las marca, para que el
 * mismo plato no salga dos veces del almacén. Devuelve lo descontado, con el
 * faltante de cada insumo cuando no alcanzó.
 */
export function descontar(
  pedido: Pedido,
  lineas: LineaPedido[],
  usuarioId?: string,
): ConsumoLinea[] {
  const momento = momentoDescuento(pedido.localId)
  if (momento === 'no') return []

  const consumos = consumoPendiente(pedido, lineas)
  if (!consumos.length) return []

  const aplicados = transaccion(() =>
    consumos.map((consumo) => {
      const insumo = db.insumos.find((i) => i.id === consumo.insumoId)
      if (!insumo) return { ...consumo, faltante: consumo.cantidad, cantidad: 0 }

      const zonaId = zonaPrincipal(insumo)
      const disponible = insumo.existencias.find((e) => e.zonaId === zonaId)?.cantidad ?? 0
      // Lo que hay manda: la venta ya ocurrió y el stock no la deshace.
      const descontado = r3(Math.min(disponible, consumo.cantidad))
      const faltante = r3(consumo.cantidad - descontado)

      if (descontado > 0)
        aplicarMovimiento({
          insumoId: insumo.id,
          zonaId,
          tipo: 'salida',
          cantidad: descontado,
          motivo: `Venta · cuenta ${pedido.numero}`,
          referencia: String(pedido.numero),
          usuarioId: usuarioId ?? 'sistema',
        })

      return { ...consumo, cantidad: descontado, faltante }
    }),
  )

  for (const linea of lineas) if (linea.estado !== 'anulada') linea.consumoRegistrado = true

  const faltantes = aplicados.filter((c) => c.faltante > 0)
  if (faltantes.length)
    registrar({
      usuarioId,
      localId: pedido.localId,
      modulo: 'Inventario',
      accion: 'Venta con stock insuficiente',
      detalle: `Cuenta ${pedido.numero} · faltó ${faltantes
        .map((f) => `${f.nombre} (${f.faltante})`)
        .join(', ')}`,
    })
  persistir()
  return aplicados
}

/** Devuelve al stock lo consumido por unas líneas: anulación de línea o de venta. */
export function devolver(pedido: Pedido, lineas: LineaPedido[], usuarioId?: string) {
  if (momentoDescuento(pedido.localId) === 'no') return []
  const registradas = lineas.filter((l) => l.consumoRegistrado)
  if (!registradas.length) return []

  // Se reconstruye el consumo de esas líneas aunque ya estén marcadas.
  const porInsumo = new Map<string, ConsumoLinea>()
  for (const linea of registradas)
    for (const consumo of consumoDeLinea(linea, pedido)) {
      const previo = porInsumo.get(consumo.insumoId)
      if (previo) previo.cantidad = r3(previo.cantidad + consumo.cantidad)
      else porInsumo.set(consumo.insumoId, { ...consumo })
    }

  const devueltos = transaccion(() =>
    [...porInsumo.values()].map((consumo) => {
      const insumo = db.insumos.find((i) => i.id === consumo.insumoId)
      if (insumo)
        aplicarMovimiento({
          insumoId: insumo.id,
          zonaId: zonaPrincipal(insumo),
          tipo: 'entrada',
          cantidad: consumo.cantidad,
          motivo: `Anulación · cuenta ${pedido.numero}`,
          referencia: String(pedido.numero),
          usuarioId: usuarioId ?? 'sistema',
        })
      return consumo
    }),
  )
  for (const linea of registradas) linea.consumoRegistrado = false
  persistir()
  return devueltos
}

export const consumoService = {
  momentoDescuento,
  consumoPendiente,
  sinReceta,
  descontar,
  devolver,
}
