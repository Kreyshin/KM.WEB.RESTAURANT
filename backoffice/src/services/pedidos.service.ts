import type {
  Consulta,
  EstadoPedidoInterno,
  LineaPedidoInterno,
  NuevoPedidoInterno,
  Paginado,
  PedidoInterno,
} from '@/types'
import { inventarioService } from './inventario.service'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { aBase, deBase, unidadOperativa } from '@/utils/unidades'

/**
 * Pedidos internos de mercadería entre almacenes (cocina o sucursal pide al
 * almacén central). El stock no se mueve al pedir: sale al despachar y entra
 * al recibir. Lo que se despacha y no llega queda como merma en destino.
 */

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000

function pedidoOError(id: string) {
  const p = db.pedidosInternos.find((x) => x.id === id)
  if (!p) throw { mensaje: 'Pedido no encontrado.' }
  return p
}

function siguienteNumero() {
  const max = Math.max(
    0,
    ...db.pedidosInternos.map((p) => Number(p.numero.replace(/\D/g, '')) || 0),
  )
  return `PI-${String(max + 1).padStart(6, '0')}`
}

const nombreAlmacen = (id: string) => db.almacenes.find((a) => a.id === id)?.nombre ?? 'almacén'
const insumoDe = (id: string) => db.insumos.find((i) => i.id === id)
const nombreInsumo = (id: string) => insumoDe(id)?.nombre ?? 'un insumo'

function validar(datos: NuevoPedidoInterno): LineaPedidoInterno[] {
  if (!datos.destinoId) throw errorCampo('destinoId', 'Elige quién pide la mercadería.')
  if (!datos.origenId) throw errorCampo('origenId', 'Elige a qué almacén se le pide.')
  if (datos.origenId === datos.destinoId) {
    throw errorCampo('origenId', 'Se pide a un almacén distinto del que pide.', 'Mismo almacén')
  }
  const lineas = datos.lineas
    .filter((l) => l.insumoId && Number(l.solicitado) > 0)
    .map((l) => ({ ...l, solicitado: r3(Number(l.solicitado)), despachado: 0, recibido: 0 }))
  if (lineas.length === 0) throw errorCampo('lineas', 'Añade al menos un insumo con cantidad.')
  if (new Set(lineas.map((l) => l.insumoId)).size !== lineas.length) {
    throw errorCampo('lineas', 'Hay insumos repetidos: junta sus cantidades en una línea.')
  }
  return lineas
}

export const pedidosService = {
  /** Filtros: `estado`, `origenId`, `destinoId`. Busca por número y notas. */
  async consultar(consulta: Consulta = {}): Promise<Paginado<PedidoInterno>> {
    return latencia(
      aplicarConsulta(
        db.pedidosInternos,
        { orden: { campo: 'numero', direccion: 'desc' }, ...consulta },
        ['numero', 'notas'],
      ),
    )
  },

  async crear(datos: NuevoPedidoInterno): Promise<PedidoInterno> {
    const lineas = validar(datos)
    const pedido: PedidoInterno = {
      ...clonar(datos),
      lineas,
      id: nuevoId('pi'),
      numero: siguienteNumero(),
      estado: 'borrador',
    }
    db.pedidosInternos.push(pedido)
    persistir()
    return latencia(pedido)
  },

  async actualizar(id: string, datos: NuevoPedidoInterno): Promise<PedidoInterno> {
    const pedido = pedidoOError(id)
    if (pedido.estado !== 'borrador') {
      throw { mensaje: `El pedido ${pedido.numero} ya fue enviado: no se puede editar.` }
    }
    Object.assign(pedido, clonar(datos), { lineas: validar(datos) })
    persistir()
    return latencia(pedido)
  },

  async enviar(id: string): Promise<PedidoInterno> {
    const pedido = pedidoOError(id)
    if (pedido.estado !== 'borrador') throw { mensaje: 'Solo se envía un pedido en borrador.' }
    validar(pedido)
    pedido.estado = 'enviado'
    persistir()
    return latencia(pedido)
  },

  /** El almacén de origen indica cuánto sale realmente de cada insumo. */
  async despachar(
    id: string,
    cantidades: { insumoId: string; cantidad: number }[],
    usuarioId: string,
  ): Promise<PedidoInterno> {
    const pedido = pedidoOError(id)
    if (pedido.estado !== 'enviado') throw { mensaje: 'Solo se despacha un pedido enviado.' }
    const salen = cantidades.filter((c) => Number(c.cantidad) > 0)
    if (salen.length === 0)
      throw errorCampo('cantidades', 'Indica al menos una cantidad a despachar.')

    inventarioService._aplicarEntradas(
      salen.map((c) => ({
        insumoId: c.insumoId,
        almacenId: pedido.origenId,
        tipo: 'trasladoSalida' as const,
        cantidad: aBase(insumoDe(c.insumoId), 'recepcion', Number(c.cantidad)),
        motivo: `Despacho a ${nombreAlmacen(pedido.destinoId)}`,
        referencia: pedido.numero,
        usuarioId,
      })),
    )
    for (const l of pedido.lineas) {
      l.despachado = r3(Number(salen.find((c) => c.insumoId === l.insumoId)?.cantidad ?? 0))
    }
    pedido.estado = 'despachado'
    pedido.despachadoEn = new Date().toISOString()
    persistir()
    return latencia(pedido)
  },

  /**
   * Quien pidió confirma lo que llegó. Entra lo despachado y la diferencia se
   * registra como merma para que el kardex cuadre y se vea el faltante.
   */
  async recibir(
    id: string,
    cantidades: { insumoId: string; cantidad: number }[],
    usuarioId: string,
  ): Promise<PedidoInterno> {
    const pedido = pedidoOError(id)
    if (pedido.estado !== 'despachado') throw { mensaje: 'Solo se recibe un pedido despachado.' }
    for (const l of pedido.lineas) {
      const llega = Number(cantidades.find((c) => c.insumoId === l.insumoId)?.cantidad ?? 0)
      if (llega < 0 || llega > l.despachado) {
        throw errorCampo(
          'cantidades',
          `En ${nombreInsumo(l.insumoId)} no puede llegar más de lo despachado (${l.despachado}).`,
        )
      }
    }
    const base = { almacenId: pedido.destinoId, referencia: pedido.numero, usuarioId }
    const movimientos = pedido.lineas
      .filter((l) => l.despachado > 0)
      .flatMap((l) => {
        const llega = Number(cantidades.find((c) => c.insumoId === l.insumoId)?.cantidad ?? 0)
        const faltante = r3(l.despachado - llega)
        return [
          {
            ...base,
            insumoId: l.insumoId,
            tipo: 'trasladoEntrada' as const,
            cantidad: aBase(insumoDe(l.insumoId), 'recepcion', l.despachado),
            motivo: `Recepción desde ${nombreAlmacen(pedido.origenId)}`,
          },
          ...(faltante > 0
            ? [
                {
                  ...base,
                  insumoId: l.insumoId,
                  tipo: 'merma' as const,
                  cantidad: aBase(insumoDe(l.insumoId), 'recepcion', faltante),
                  motivo: 'Faltante en traslado',
                },
              ]
            : []),
        ]
      })
    inventarioService._aplicarEntradas(movimientos)
    for (const l of pedido.lineas) {
      l.recibido = r3(Number(cantidades.find((c) => c.insumoId === l.insumoId)?.cantidad ?? 0))
    }
    pedido.estado = 'recibido'
    pedido.recibidoEn = new Date().toISOString()
    persistir()
    return latencia(pedido)
  },

  async anular(id: string): Promise<PedidoInterno> {
    const pedido = pedidoOError(id)
    const permitidos: EstadoPedidoInterno[] = ['borrador', 'enviado']
    if (!permitidos.includes(pedido.estado)) {
      throw { mensaje: 'Un pedido despachado ya movió stock: debe recibirse.' }
    }
    pedido.estado = 'anulado'
    persistir()
    return latencia(pedido)
  },

  async eliminar(id: string): Promise<void> {
    const pedido = pedidoOError(id)
    if (pedido.estado !== 'borrador') throw { mensaje: 'Solo se elimina un borrador.' }
    db.pedidosInternos = db.pedidosInternos.filter((p) => p.id !== id)
    persistir()
    return latencia(undefined)
  },

  /**
   * Insumos que el destino maneja (ya tiene existencia registrada) y están por
   * debajo de su mínimo. Pide hasta el mínimo, sin superar lo que hay en origen.
   * Pendiente: mínimo propio por almacén; hoy se usa el del insumo.
   */
  async sugerir(destinoId: string, origenId: string): Promise<LineaPedidoInterno[]> {
    const lineas = db.insumos
      .filter((i) => i.activo && i.existencias.some((e) => e.almacenId === destinoId))
      .map((i) => ({
        i,
        hay: i.existencias.find((e) => e.almacenId === destinoId)?.cantidad ?? 0,
        disponible: i.existencias.find((e) => e.almacenId === origenId)?.cantidad ?? 0,
      }))
      .filter(({ i, hay, disponible }) => hay < i.stockMinimo && disponible > 0)
      .map(({ i, hay, disponible }) => {
        // Se pide en unidades enteras de pedido, sin superar lo que hay en origen.
        const factor = unidadOperativa(i, 'pedido').factor
        const faltan = Math.ceil(deBase(i, 'pedido', i.stockMinimo - hay))
        return { i, cantidad: Math.min(faltan, Math.floor(r3(disponible / factor))) }
      })
      .filter(({ cantidad }) => cantidad > 0)
      .map(({ i, cantidad }) => ({
        insumoId: i.id,
        solicitado: cantidad,
        despachado: 0,
        recibido: 0,
      }))
    return latencia(lineas)
  },
}
