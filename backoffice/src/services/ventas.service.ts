import type {
  ApiError,
  Area,
  Comanda,
  EstadoComanda,
  LineaPedido,
  Pago,
  Pedido,
  TipoAtencion,
  TipoComprobante,
  TotalesPedido,
  Venta,
} from '@/types'
import { registrar } from './auditoria.service'
import { sesionAbierta } from './caja.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso, valorConfig } from './parametros.service'
import { precioVigente, vendibles } from './precios.service'
import { evaluar } from './promociones.service'

/**
 * Ventas y caja (F7, D-012) — línea base estándar, para refinar con uso.
 *
 * La cuenta se abre antes de cobrar y vive mientras se come; la línea tiene
 * estado propio (quitar una comandada es una anulación con motivo); se comanda
 * por área; la precuenta no es el comprobante; y el cobro admite varios medios
 * de pago con propina y vuelto.
 */

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const ahora = () => new Date().toISOString()
const hoy = () => ahora().slice(0, 10)
const hora = () => ahora().slice(11, 16)

export const etiquetaAtencion: Record<TipoAtencion, string> = {
  mesa: 'En mesa',
  mostrador: 'Mostrador',
  llevar: 'Para llevar',
  delivery: 'Delivery',
}

export const etiquetaEstadoComanda: Record<EstadoComanda, string> = {
  enviada: 'Enviada',
  enPreparacion: 'En preparación',
  lista: 'Lista',
  entregada: 'Entregada',
}

/** La modalidad sale del canal: no se teclea (D-001). */
function atencionDe(canalId: string): TipoAtencion {
  const tipo = db.canales.find((c) => c.id === canalId)?.tipo
  if (tipo === 'salon') return 'mesa'
  if (tipo === 'llevar') return 'llevar'
  if (tipo === 'delivery' || tipo === 'plataforma') return 'delivery'
  return 'mostrador'
}

/** Área que cocina un vendible en este local, según la configuración de comandas (D-004). */
export function areaDe(vendibleId: string, localId: string): Area | undefined {
  const vendible = vendibles().find((v) => v.id === vendibleId)
  const candidatas = db.areas.filter((a) => a.localId === localId && a.activo && a.recibeComandas)
  const propia = candidatas.find(
    (a) =>
      a.comanda.modo === 'seleccionados' &&
      ((vendible?.productoId && a.comanda.productoIds.includes(vendible.productoId)) ||
        (vendible?.categoriaId && a.comanda.categoriaIds.includes(vendible.categoriaId))),
  )
  return propia ?? candidatas.find((a) => a.comanda.modo === 'todos')
}

const siguienteNumero = (valores: number[]) => (valores.length ? Math.max(...valores) : 1000) + 1

function exigir(usuarioId: string | undefined, clave: string, accion: string) {
  if (!tienePermiso(usuarioId, clave))
    throw { mensaje: `No tienes permiso para ${accion}.` } satisfies ApiError
}

function pedidoAbierto(id: string): Pedido {
  const pedido = db.pedidos.find((p) => p.id === id)
  if (!pedido) throw { mensaje: 'Pedido no encontrado.' } satisfies ApiError
  if (pedido.estado !== 'abierto')
    throw {
      mensaje: `El pedido ${pedido.numero} ya está ${pedido.estado === 'cobrado' ? 'cobrado' : 'anulado'}.`,
    } satisfies ApiError
  return pedido
}

/** Las líneas que cuentan para la cuenta: todo menos lo anulado. */
const vivas = (pedido: Pedido) => pedido.lineas.filter((l) => l.estado !== 'anulada')

/** Ocupa las mesas del pedido; al cerrarlo las manda a limpieza. */
function reflejarEnMesas(pedido: Pedido, cerrando = false) {
  for (const mesa of db.mesas.filter((m) => pedido.mesaIds.includes(m.id))) {
    if (mesa.estado === 'inactiva') continue
    mesa.estado = cerrando ? 'limpieza' : 'ocupada'
  }
}

// ── Totales ──────────────────────────────────────────────────────────────────

/**
 * Lo que se cobra y por qué. Encadena tres cosas que en un POS siempre van
 * juntas: precio vigente de la lista, promociones (D-011) y recargo al consumo.
 */
export function totales(pedido: Pedido, fecha = hoy(), momento = hora()): TotalesPedido {
  const lineas = vivas(pedido)
  const evaluacion = evaluar({
    localId: pedido.localId,
    canalId: pedido.canalId,
    fecha,
    hora: momento,
    cupon: pedido.cupon,
    distrito: pedido.distrito,
    lineas: lineas.map((l) => ({
      vendibleId: l.vendibleId,
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario + l.recargoModificadores,
    })),
  })

  const canal = db.canales.find((c) => c.id === pedido.canalId)
  const recargoActivo = db.impuestos.recargoConsumoActivo && Boolean(canal?.aplicaRecargoConsumo)
  const recargoPorcentaje = recargoActivo ? db.impuestos.recargoConsumoPorcentaje : 0
  // El recargo se calcula sobre el consumo ya rebajado, no sobre el envío.
  const baseRecargo = redondear(evaluacion.subtotal - evaluacion.descuento)
  const recargoConsumo = redondear((baseRecargo * recargoPorcentaje) / 100)

  const total = redondear(
    baseRecargo + recargoConsumo + evaluacion.costoEnvio - evaluacion.descuentoEnvio,
  )
  const tasaIgv = db.impuestos.igvPorcentaje
  const valorVenta = redondear(
    db.impuestos.preciosIncluyenIgv ? total / (1 + tasaIgv / 100) : total,
  )

  return {
    subtotal: evaluacion.subtotal,
    descuentoPromociones: evaluacion.descuento,
    costoEnvio: evaluacion.costoEnvio,
    descuentoEnvio: evaluacion.descuentoEnvio,
    recargoPorcentaje,
    recargoConsumo,
    total,
    tasaIgv,
    valorVenta,
    igv: redondear(total - valorVenta),
    promociones: evaluacion.aplicadas,
    descartadas: evaluacion.descartadas,
    cobertura: evaluacion.cobertura,
  }
}

// ── Pedidos ──────────────────────────────────────────────────────────────────

export interface NuevoPedido {
  localId: string
  canalId: string
  mesaIds?: string[]
  clienteId?: string
  nombreCliente?: string
  direccion?: string
  distrito?: string
  comensales?: number
  nota?: string
}

export const ventasService = {
  async listar(filtro: { localId?: string; estado?: Pedido['estado'] } = {}): Promise<Pedido[]> {
    return latencia(
      clonar(
        db.pedidos
          .filter(
            (p) =>
              (!filtro.localId || p.localId === filtro.localId) &&
              (!filtro.estado || p.estado === filtro.estado),
          )
          .sort((a, b) => b.abierto.localeCompare(a.abierto)),
      ),
    )
  },

  async obtener(id: string): Promise<Pedido> {
    const pedido = db.pedidos.find((p) => p.id === id)
    if (!pedido) throw { mensaje: 'Pedido no encontrado.' } satisfies ApiError
    return latencia(clonar(pedido))
  },

  /** Totales de un pedido abierto: es la precuenta, no el comprobante. */
  async precuenta(id: string): Promise<TotalesPedido> {
    const pedido = db.pedidos.find((p) => p.id === id)
    if (!pedido) throw { mensaje: 'Pedido no encontrado.' } satisfies ApiError
    return latencia(totales(pedido))
  },

  async abrir(datos: NuevoPedido, usuarioId?: string): Promise<Pedido> {
    exigir(usuarioId, 'ventas.tomarPedido', 'tomar pedidos')
    if (!db.locales.some((l) => l.id === datos.localId))
      throw errorCampo('localId', 'Elige el local.', 'Requerido')
    const canal = db.canales.find((c) => c.id === datos.canalId && c.activo)
    if (!canal) throw errorCampo('canalId', 'Elige un canal de venta activo.', 'Requerido')

    const atencion = atencionDe(datos.canalId)
    const mesaIds = [...new Set(datos.mesaIds ?? [])]

    if (atencion === 'mesa') {
      if (!mesaIds.length) throw errorCampo('mesaIds', 'Elige la mesa.', 'Requerido')
      for (const id of mesaIds) {
        const mesa = db.mesas.find((m) => m.id === id)
        if (!mesa) throw errorCampo('mesaIds', 'Esa mesa ya no existe.')
        if (mesa.estado === 'inactiva')
          throw errorCampo('mesaIds', `La mesa ${mesa.codigo} está fuera de servicio.`)
        const ocupada = db.pedidos.find((p) => p.estado === 'abierto' && p.mesaIds.includes(id))
        if (ocupada)
          throw errorCampo(
            'mesaIds',
            `La mesa ${mesa.codigo} ya tiene la cuenta ${ocupada.numero} abierta.`,
            'Mesa ocupada',
          )
      }
    }
    if (atencion === 'delivery' && !datos.distrito?.trim())
      throw errorCampo(
        'distrito',
        'El delivery necesita el distrito para calcular el envío.',
        'Requerido',
      )

    const pedido: Pedido = {
      id: nuevoId('pd'),
      numero: siguienteNumero(db.pedidos.map((p) => p.numero)),
      localId: datos.localId,
      canalId: datos.canalId,
      atencion,
      mesaIds,
      clienteId: datos.clienteId,
      nombreCliente: datos.nombreCliente?.trim() || undefined,
      direccion: datos.direccion?.trim() || undefined,
      distrito: datos.distrito?.trim() || undefined,
      comensales: datos.comensales,
      lineas: [],
      estado: 'abierto',
      nota: datos.nota?.trim() || undefined,
      abierto: ahora(),
      usuarioId,
    }
    db.pedidos.push(pedido)
    reflejarEnMesas(pedido)
    persistir()
    return latencia(clonar(pedido))
  },

  /** Añade una línea. El precio sale de la lista vigente si no se fuerza. */
  async agregarLinea(
    pedidoId: string,
    datos: {
      vendibleId: string
      cantidad: number
      modificadorIds?: string[]
      nota?: string
      precioUnitario?: number
    },
    usuarioId?: string,
  ): Promise<Pedido> {
    const pedido = pedidoAbierto(pedidoId)
    exigir(usuarioId, 'ventas.tomarPedido', 'tomar pedidos')
    const vendible = vendibles().find((v) => v.id === datos.vendibleId)
    if (!vendible) throw errorCampo('vendibleId', 'Ese producto no está en la carta.', 'Requerido')
    if (!(datos.cantidad > 0)) throw errorCampo('cantidad', 'La cantidad debe ser mayor a 0.')

    const modificadorIds = datos.modificadorIds ?? []
    const recargoModificadores = db.productos
      .flatMap((p) => p.gruposModificadores.flatMap((g) => g.modificadores))
      .filter((m) => modificadorIds.includes(m.id))
      .reduce((s, m) => s + m.recargo, 0)

    const linea: LineaPedido = {
      id: nuevoId('lp'),
      vendibleId: vendible.id,
      nombre: vendible.nombre,
      cantidad: datos.cantidad,
      precioUnitario:
        datos.precioUnitario ??
        precioVigente(vendible.id, pedido.localId, pedido.canalId, hoy()).precio,
      modificadorIds,
      recargoModificadores: redondear(recargoModificadores),
      nota: datos.nota?.trim() || undefined,
      estado: 'pendiente',
      usuarioId,
      creada: ahora(),
    }
    pedido.lineas.push(linea)
    persistir()
    return latencia(clonar(pedido))
  },

  /**
   * Quita una línea. Pendiente sale sin más; comandada ya se está cocinando, y
   * eso es una anulación con motivo y permiso (D-012).
   */
  async quitarLinea(
    pedidoId: string,
    lineaId: string,
    usuarioId?: string,
    motivo?: string,
  ): Promise<Pedido> {
    const pedido = pedidoAbierto(pedidoId)
    const linea = pedido.lineas.find((l) => l.id === lineaId)
    if (!linea) throw { mensaje: 'Esa línea ya no está en la cuenta.' } satisfies ApiError
    if (linea.estado === 'anulada')
      throw { mensaje: 'La línea ya está anulada.' } satisfies ApiError

    if (linea.estado === 'pendiente') {
      exigir(usuarioId, 'ventas.tomarPedido', 'tomar pedidos')
      pedido.lineas = pedido.lineas.filter((l) => l.id !== lineaId)
      persistir()
      return latencia(clonar(pedido))
    }

    exigir(usuarioId, 'ventas.anularLinea', 'anular un producto ya comandado')
    if (!motivo?.trim())
      throw errorCampo(
        'motivo',
        'Explica por qué se anula algo que ya está en cocina.',
        'Requerido',
      )
    linea.estado = 'anulada'
    linea.motivoAnulacion = motivo.trim()
    registrar({
      usuarioId,
      localId: pedido.localId,
      modulo: 'Ventas',
      accion: 'Producto anulado tras comandar',
      detalle: `Cuenta ${pedido.numero} · ${linea.cantidad} × ${linea.nombre} · ${linea.motivoAnulacion}`,
    })
    persistir()
    return latencia(clonar(pedido))
  },

  /**
   * Envía a cocina lo pendiente, agrupado por área. Cada área recibe su comanda
   * numerada; una línea no se comanda dos veces.
   */
  async comandar(pedidoId: string, usuarioId?: string): Promise<Comanda[]> {
    const pedido = pedidoAbierto(pedidoId)
    exigir(usuarioId, 'ventas.tomarPedido', 'comandar')
    const pendientes = pedido.lineas.filter((l) => l.estado === 'pendiente')
    if (!pendientes.length)
      throw { mensaje: 'No hay nada pendiente de comandar.' } satisfies ApiError

    const porArea = new Map<string, LineaPedido[]>()
    const sinArea: string[] = []
    for (const linea of pendientes) {
      const area = areaDe(linea.vendibleId, pedido.localId)
      if (!area) {
        sinArea.push(linea.nombre)
        continue
      }
      porArea.set(area.id, [...(porArea.get(area.id) ?? []), linea])
    }
    if (sinArea.length)
      throw {
        mensaje: `Sin área que lo prepare: ${[...new Set(sinArea)].join(', ')}. Revisa Configuración › Áreas.`,
      } satisfies ApiError

    const nuevas: Comanda[] = []
    // Cada área se lleva su número correlativo: dos comandas nunca comparten número.
    const primerNumero = siguienteNumero(db.comandas.map((c) => c.numero))
    for (const [areaId, lineas] of porArea) {
      const area = db.areas.find((a) => a.id === areaId)!
      const comanda: Comanda = {
        id: nuevoId('cm'),
        numero: primerNumero + nuevas.length,
        pedidoId: pedido.id,
        areaId,
        areaNombre: area.nombre,
        lineaIds: lineas.map((l) => l.id),
        enviada: ahora(),
        usuarioId,
        estado: 'enviada',
      }
      for (const linea of lineas) {
        linea.estado = 'comandada'
        linea.areaId = areaId
        linea.comandaId = comanda.id
      }
      db.comandas.push(comanda)
      nuevas.push(comanda)
    }
    persistir()
    return latencia(clonar(nuevas))
  },

  async comandasDe(pedidoId: string): Promise<Comanda[]> {
    return latencia(clonar(db.comandas.filter((c) => c.pedidoId === pedidoId)))
  },

  async avanzarComanda(id: string, estado: EstadoComanda): Promise<Comanda> {
    const comanda = db.comandas.find((c) => c.id === id)
    if (!comanda) throw { mensaje: 'Comanda no encontrada.' } satisfies ApiError
    comanda.estado = estado
    persistir()
    return latencia(clonar(comanda))
  },

  /** Mueve la cuenta de mesa sin perder su historia: gesto de sala, no de caja. */
  async transferirMesa(pedidoId: string, mesaIds: string[], usuarioId?: string): Promise<Pedido> {
    const pedido = pedidoAbierto(pedidoId)
    exigir(usuarioId, 'ventas.tomarPedido', 'mover una cuenta de mesa')
    if (pedido.atencion !== 'mesa')
      throw { mensaje: 'Solo las cuentas de salón están en una mesa.' } satisfies ApiError
    if (!mesaIds.length) throw errorCampo('mesaIds', 'Elige la mesa destino.', 'Requerido')

    for (const id of mesaIds) {
      const mesa = db.mesas.find((m) => m.id === id)
      if (!mesa) throw errorCampo('mesaIds', 'Esa mesa ya no existe.')
      if (mesa.estado === 'inactiva')
        throw errorCampo('mesaIds', `La mesa ${mesa.codigo} está fuera de servicio.`)
      const otra = db.pedidos.find(
        (p) => p.estado === 'abierto' && p.id !== pedidoId && p.mesaIds.includes(id),
      )
      if (otra)
        throw errorCampo(
          'mesaIds',
          `La mesa ${mesa.codigo} ya tiene la cuenta ${otra.numero}.`,
          'Mesa ocupada',
        )
    }

    const antes = db.mesas.filter((m) => pedido.mesaIds.includes(m.id))
    for (const mesa of antes) if (mesa.estado === 'ocupada') mesa.estado = 'limpieza'
    pedido.mesaIds = [...new Set(mesaIds)]
    reflejarEnMesas(pedido)
    registrar({
      usuarioId,
      localId: pedido.localId,
      modulo: 'Ventas',
      accion: 'Cuenta movida de mesa',
      detalle: `Cuenta ${pedido.numero}: ${antes.map((m) => m.codigo).join(', ') || '—'} → ${db.mesas
        .filter((m) => pedido.mesaIds.includes(m.id))
        .map((m) => m.codigo)
        .join(', ')}`,
    })
    persistir()
    return latencia(clonar(pedido))
  },

  /**
   * Parte la cuenta: las líneas elegidas se van a una cuenta hija que se cobra
   * por separado. Se reparten líneas enteras, no fracciones de plato.
   */
  async dividir(pedidoId: string, lineaIds: string[], usuarioId?: string): Promise<Pedido> {
    const pedido = pedidoAbierto(pedidoId)
    exigir(usuarioId, 'ventas.tomarPedido', 'dividir una cuenta')
    const elegidas = pedido.lineas.filter((l) => lineaIds.includes(l.id) && l.estado !== 'anulada')
    if (!elegidas.length) throw errorCampo('lineaIds', 'Elige qué líneas se van.', 'Requerido')
    if (elegidas.length === vivas(pedido).length)
      throw {
        mensaje: 'Si se van todas las líneas no hay división: es la misma cuenta.',
      } satisfies ApiError

    const hija: Pedido = {
      ...clonar(pedido),
      id: nuevoId('pd'),
      numero: siguienteNumero(db.pedidos.map((p) => p.numero)),
      // La mesa sigue siendo de la cuenta madre: la hija solo se cobra.
      mesaIds: [],
      lineas: clonar(elegidas),
      divididoDe: pedido.id,
      abierto: ahora(),
      usuarioId,
    }
    pedido.lineas = pedido.lineas.filter((l) => !lineaIds.includes(l.id))
    db.pedidos.push(hija)
    registrar({
      usuarioId,
      localId: pedido.localId,
      modulo: 'Ventas',
      accion: 'Cuenta dividida',
      detalle: `Cuenta ${pedido.numero} → ${hija.numero} con ${elegidas.length} línea(s)`,
    })
    persistir()
    return latencia(clonar(hija))
  },

  /**
   * Cobra la cuenta: varios medios de pago, propina y vuelto. Emite nota de
   * venta; la boleta o factura electrónica llega en F8.
   */
  async cobrar(
    pedidoId: string,
    datos: { pagos: Pago[]; propina?: number; tipoComprobante?: TipoComprobante },
    usuarioId?: string,
  ): Promise<Venta> {
    const pedido = pedidoAbierto(pedidoId)
    exigir(usuarioId, 'ventas.cobrar', 'cobrar')
    if (!vivas(pedido).length) throw { mensaje: 'La cuenta está vacía.' } satisfies ApiError

    const pendientes = pedido.lineas.filter((l) => l.estado === 'pendiente')
    if (pendientes.length)
      throw {
        mensaje: `Quedan ${pendientes.length} producto(s) sin comandar: envíalos a cocina o quítalos antes de cobrar.`,
      } satisfies ApiError

    const sesion = sesionAbierta(pedido.localId)
    if (!sesion && valorConfig<boolean>('caja.exigirSesion', pedido.localId))
      throw {
        mensaje: 'No hay caja abierta en este local: ábrela antes de cobrar.',
      } satisfies ApiError

    const cuenta = totales(pedido)
    const propina = redondear(datos.propina ?? 0)
    if (propina < 0) throw errorCampo('propina', 'La propina no puede ser negativa.')
    const aCobrar = redondear(cuenta.total + propina)

    if (!datos.pagos.length) throw errorCampo('pagos', 'Indica con qué se paga.', 'Requerido')
    const pagos: Pago[] = []
    for (const pago of datos.pagos) {
      const medio = db.mediosPago.find((m) => m.id === pago.medioPagoId && m.activo)
      if (!medio) throw errorCampo('pagos', 'Ese medio de pago ya no está activo.')
      if (!(pago.monto > 0)) throw errorCampo('pagos', 'Cada pago debe ser mayor a 0.')
      if (medio.requiereReferencia && !pago.referencia?.trim())
        throw errorCampo(
          'pagos',
          `${medio.nombre} pide número de operación.`,
          'Falta la referencia',
        )
      pagos.push({
        ...pago,
        nombre: medio.nombre,
        referencia: pago.referencia?.trim() || undefined,
      })
    }

    const entregado = redondear(pagos.reduce((s, p) => s + p.monto, 0))
    if (entregado < aCobrar)
      throw errorCampo(
        'pagos',
        `Faltan S/ ${redondear(aCobrar - entregado).toFixed(2)} por cubrir.`,
        'Pago incompleto',
      )
    // Solo el efectivo da vuelto: una tarjeta se cobra por el importe exacto.
    const efectivo = pagos
      .filter((p) => db.mediosPago.find((m) => m.id === p.medioPagoId)?.tipo === 'efectivo')
      .reduce((s, p) => s + p.monto, 0)
    const vuelto = redondear(entregado - aCobrar)
    if (vuelto > 0 && vuelto > efectivo + 0.001)
      throw errorCampo(
        'pagos',
        'Lo cobrado pasa del total y no es en efectivo.',
        'Revisa los pagos',
      )

    const tipo = datos.tipoComprobante ?? 'notaVenta'
    const serie = db.series.find((s) => s.localId === pedido.localId && s.tipo === tipo && s.activo)
    if (!serie)
      throw {
        mensaje: `Este local no tiene serie activa de ${tipo}. Configúrala en el ERP.`,
      } satisfies ApiError
    serie.correlativo += 1

    const venta: Venta = {
      id: nuevoId('vt'),
      numero: siguienteNumero(db.ventas.map((v) => v.numero)),
      pedidoId: pedido.id,
      localId: pedido.localId,
      canalId: pedido.canalId,
      sesionCajaId: sesion?.id,
      fecha: ahora(),
      usuarioId,
      totales: cuenta,
      propina,
      pagos,
      vuelto,
      comprobante: { tipo, serie: serie.serie, numero: serie.correlativo },
      estado: 'cobrada',
    }
    db.ventas.push(venta)
    pedido.estado = 'cobrado'
    reflejarEnMesas(pedido, true)
    persistir()
    return latencia(clonar(venta))
  },

  /** Anular una venta es otra operación: con motivo, permiso y rastro. */
  async anularVenta(ventaId: string, motivo: string, usuarioId?: string): Promise<Venta> {
    const venta = db.ventas.find((v) => v.id === ventaId)
    if (!venta) throw { mensaje: 'Venta no encontrada.' } satisfies ApiError
    exigir(usuarioId, 'ventas.anularVenta', 'anular una venta')
    if (venta.estado === 'anulada')
      throw { mensaje: 'Esa venta ya está anulada.' } satisfies ApiError
    if (!motivo?.trim()) throw errorCampo('motivo', 'Explica por qué se anula.', 'Requerido')

    venta.estado = 'anulada'
    venta.motivoAnulacion = motivo.trim()
    const pedido = db.pedidos.find((p) => p.id === venta.pedidoId)
    if (pedido) pedido.estado = 'anulado'
    registrar({
      usuarioId,
      localId: venta.localId,
      modulo: 'Ventas',
      accion: 'Venta anulada',
      detalle: `${venta.comprobante.serie}-${venta.comprobante.numero} · S/ ${venta.totales.total.toFixed(2)} · ${venta.motivoAnulacion}`,
    })
    persistir()
    return latencia(clonar(venta))
  },

  async ventas(filtro: { localId?: string; sesionCajaId?: string; fecha?: string } = {}) {
    return latencia(
      clonar(
        db.ventas
          .filter(
            (v) =>
              (!filtro.localId || v.localId === filtro.localId) &&
              (!filtro.sesionCajaId || v.sesionCajaId === filtro.sesionCajaId) &&
              (!filtro.fecha || v.fecha.slice(0, 10) === filtro.fecha),
          )
          .sort((a, b) => b.fecha.localeCompare(a.fecha)),
      ),
    )
  },

  totales,
  areaDe,
}
