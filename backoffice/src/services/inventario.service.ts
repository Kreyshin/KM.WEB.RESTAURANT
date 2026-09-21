import type {
  Almacen,
  Consulta,
  NuevaZona,
  Zona,
  Insumo,
  Movimiento,
  NuevoInsumo,
  NuevoMovimiento,
  Paginado,
  Transformacion,
} from '@/types'
import { recalcularCostosTransformados, transformacionQueProduce } from './abastecimiento.service'
import { signoNumerico } from '@/utils/formato'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'
import { insumoEnRecetas } from './recetas.service'

/** Cantidades con 3 decimales: evita arrastrar error de coma flotante (8.700000000000001). */
const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function insumoOError(id: string) {
  const insumo = db.insumos.find((i) => i.id === id)
  if (!insumo) throw { mensaje: 'Insumo no encontrado.' }
  return insumo
}

function zonaOError(id: string) {
  const zona = db.zonas.find((a) => a.id === id)
  if (!zona) throw errorCampo('zonaId', 'Zona no encontrada.', 'Elige una zona')
  return zona
}

function existenciaDe(insumo: Insumo, zonaId: string) {
  let e = insumo.existencias.find((x) => x.zonaId === zonaId)
  if (!e) {
    e = { zonaId, cantidad: 0 }
    insumo.existencias.push(e)
  }
  return e
}

function recalcularTotal(insumo: Insumo) {
  insumo.stock = r3(insumo.existencias.reduce((t, e) => t + e.cantidad, 0))
}

/** Zona por defecto de un insumo: donde más stock tiene, o el primero activo. */
function zonaPrincipal(insumo: Insumo) {
  const conStock = [...insumo.existencias].sort((a, b) => b.cantidad - a.cantidad)[0]
  return conStock?.zonaId ?? db.zonas.find((a) => a.activo)?.id ?? ''
}

type MovimientoCompleto = NuevoMovimiento & { zonaId: string }

/**
 * Aplica un movimiento al stock sin latencia ni persistencia, para poder
 * encadenar varios (traslados, producción, recepciones) y guardar una sola vez.
 * El stock nunca queda negativo: una salida mayor que las existencias es un
 * error de registro, no un inventario negativo.
 */
function aplicar(datos: MovimientoCompleto): Movimiento {
  const insumo = insumoOError(datos.insumoId)
  const zona = zonaOError(datos.zonaId)

  const cantidad = Number(datos.cantidad)
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw errorCampo('cantidad', 'La cantidad debe ser mayor que cero.', 'Cantidad inválida')
  }

  const existencia = existenciaDe(insumo, zona.id)
  const signo = signoNumerico[datos.tipo]
  const resultante = existencia.cantidad + signo * cantidad
  if (resultante < 0) {
    throw errorCampo(
      'cantidad',
      `No hay stock suficiente de ${insumo.nombre} en ${zona.nombre}: quedan ${existencia.cantidad} ${insumo.unidad}.`,
      'Supera el stock disponible',
    )
  }

  // Costo promedio ponderado: solo las entradas con costo lo modifican.
  if (datos.tipo === 'entrada' && datos.costoUnitario !== undefined && datos.costoUnitario >= 0) {
    const total = insumo.stock + cantidad
    insumo.costoUnitario =
      total > 0
        ? r2((insumo.stock * insumo.costoUnitario + cantidad * datos.costoUnitario) / total)
        : datos.costoUnitario
  }

  existencia.cantidad = r3(resultante)
  recalcularTotal(insumo)

  const movimiento: Movimiento = {
    ...datos,
    cantidad,
    costoUnitario: datos.costoUnitario ?? insumo.costoUnitario,
    id: nuevoId('mv'),
    fecha: new Date().toISOString(),
  }
  db.movimientos.push(movimiento)
  return movimiento
}

/** Para recepción y producción (F4.5), que encadenan movimientos en su propia transacción. */
export const aplicarMovimiento = aplicar

/**
 * Ejecuta varios cambios como una transacción: si uno falla, se restaura el
 * estado anterior de insumos y movimientos.
 */
function transaccion<T>(fn: () => T): T {
  const copia = clonar({ insumos: db.insumos, movimientos: db.movimientos })
  try {
    const r = fn()
    recalcularCostosTransformados()
    persistir()
    return r
  } catch (e) {
    db.insumos = copia.insumos
    db.movimientos = copia.movimientos
    throw e
  }
}

// ── Zonas ────────────────────────────────────────────────────────────────

/**
 * Zonas (D-009): espacios del restaurante dentro del almacén de su local —
 * cámara de frío, barra, despensa—. Son de la vertical: el ERP ve el total
 * del almacén y los movimientos entre zonas no le afectan.
 */
const repoZonas = crearRepositorio('zonas', {
  prefijo: 'zn',
  entidad: 'Zona',
  camposBusqueda: ['nombre', 'descripcion'],
})

function validarZona(datos: NuevaZona, id?: string) {
  const nombre = datos.nombre.trim()
  if (!nombre) throw errorCampo('nombre', 'El nombre es obligatorio.')
  const almacen = db.almacenes.find((a) => a.localId === datos.localId && a.activo)
  if (!almacen) throw errorCampo('localId', 'Ese local no tiene almacén.')
  const delAlmacen = db.zonas.filter((z) => z.almacenId === almacen.id)
  if (existeOtro(delAlmacen, (z) => z.nombre, nombre, id)) {
    throw errorCampo('nombre', 'Ese almacén ya tiene una zona con ese nombre.', 'Nombre duplicado')
  }
  return { ...datos, nombre, almacenId: almacen.id }
}

export const zonasService = {
  consultar: repoZonas.consultar,
  todos: repoZonas.todos,
  obtener: repoZonas.obtener,

  async crear(datos: NuevaZona): Promise<Zona> {
    return repoZonas.crear(validarZona(datos))
  },

  async actualizar(id: string, cambios: Partial<NuevaZona>): Promise<Zona> {
    const actual = db.zonas.find((z) => z.id === id)
    if (!actual) throw { mensaje: 'Zona no encontrada.' }
    const datos = validarZona({ ...actual, ...cambios }, id)
    if (
      datos.activo === false &&
      db.insumos.some((i) => i.existencias.some((e) => e.zonaId === id && e.cantidad > 0))
    ) {
      throw { mensaje: 'No se puede desactivar: la zona todavía guarda stock. Trasládalo antes.' }
    }
    return repoZonas.actualizar(id, datos)
  },

  async eliminar(id: string): Promise<void> {
    const usada =
      db.insumos.some((i) => i.existencias.some((e) => e.zonaId === id && e.cantidad > 0)) ||
      db.movimientos.some((m) => m.zonaId === id)
    if (usada) {
      throw { mensaje: 'La zona tiene stock o movimientos: desactívala en lugar de eliminarla.' }
    }
    await repoZonas.eliminar(id)
  },
}

/** Almacén de cada local (uno por local): lo que conoce Inventarios del ERP. */
export const almacenesService = {
  async todos(): Promise<Almacen[]> {
    return latencia([...db.almacenes])
  },
  delLocal(localId: string): Almacen | undefined {
    return db.almacenes.find((a) => a.localId === localId && a.activo)
  },
}

// ── Insumos, movimientos y recetas ───────────────────────────────────────────

export type EstadoStock = 'agotado' | 'bajo' | 'ok'

export function estadoStock(stock: number, minimo: number): EstadoStock {
  if (stock <= 0) return 'agotado'
  if (stock < minimo) return 'bajo'
  return 'ok'
}

export interface FilaKardex extends Movimiento {
  /** Saldo de la zona (o total) tras el movimiento. */
  saldo: number
}

export const inventarioService = {
  // ── Insumos ────────────────────────────────────────────────────────────────

  async listarInsumos(): Promise<Insumo[]> {
    return latencia([...db.insumos].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  },

  /**
   * Listado paginado. Filtros especiales:
   * - `zonaId`: el stock mostrado es el de esa zona.
   * - `estadoStock`: `agotado`, `bajo` u `ok`.
   */
  async consultarInsumos(consulta: Consulta = {}): Promise<Paginado<Insumo>> {
    const { zonaId, estadoStock: estado, ...resto } = consulta.filtros ?? {}
    let lista = db.insumos.map((i) =>
      zonaId
        ? {
            ...i,
            stock: i.existencias.find((e) => e.zonaId === zonaId)?.cantidad ?? 0,
          }
        : i,
    )
    if (zonaId) {
      lista = lista.filter((i) => i.existencias.some((e) => e.zonaId === zonaId))
    }
    if (estado) lista = lista.filter((i) => estadoStock(i.stock, i.stockMinimo) === estado)
    return latencia(
      aplicarConsulta(lista, { ...consulta, filtros: resto }, ['nombre', 'categoria']),
    )
  },

  async obtenerInsumo(id: string): Promise<Insumo> {
    return latencia(insumoOError(id))
  },

  async crearInsumo(datos: NuevoInsumo, zonaId?: string): Promise<Insumo> {
    const nombre = datos.nombre.trim()
    if (existeOtro(db.insumos, (i) => i.nombre, nombre)) {
      throw errorCampo('nombre', 'Ya existe un insumo con ese nombre.', 'Nombre duplicado')
    }
    const { stockInicial, ...resto } = datos
    const insumo: Insumo = {
      ...clonar(resto),
      nombre,
      id: nuevoId('i'),
      stock: 0,
      existencias: [],
    }
    db.insumos.push(insumo)
    if (stockInicial && stockInicial > 0) {
      const destino = zonaId ?? db.zonas.find((a) => a.activo)?.id
      if (!destino) throw errorCampo('zonaId', 'Crea una zona antes de cargar stock.')
      transaccion(() =>
        aplicar({
          insumoId: insumo.id,
          zonaId: destino,
          tipo: 'entrada',
          cantidad: stockInicial,
          costoUnitario: insumo.costoUnitario,
          motivo: 'Stock inicial',
          usuarioId: 'u1',
        }),
      )
    }
    persistir()
    return latencia(insumo)
  },

  async actualizarInsumo(id: string, datos: Partial<NuevoInsumo>): Promise<Insumo> {
    const insumo = insumoOError(id)
    const nombre = datos.nombre?.trim()
    if (nombre && existeOtro(db.insumos, (i) => i.nombre, nombre, id)) {
      throw errorCampo('nombre', 'Ya existe un insumo con ese nombre.', 'Nombre duplicado')
    }
    // Cambiar la unidad descuadra recetas, costos y kardex ya registrados.
    if (
      datos.unidad &&
      datos.unidad !== insumo.unidad &&
      (insumoEnRecetas(id) || db.movimientos.some((m) => m.insumoId === id))
    ) {
      throw errorCampo(
        'unidad',
        'La unidad no se puede cambiar: el insumo ya tiene recetas o movimientos.',
        'Unidad en uso',
      )
    }
    if (
      datos.rendimientoPorcentaje !== undefined &&
      !(datos.rendimientoPorcentaje > 0 && datos.rendimientoPorcentaje <= 100)
    ) {
      throw errorCampo('rendimientoPorcentaje', 'El rendimiento debe estar entre 1 % y 100 %.')
    }
    // El stock solo cambia con movimientos.
    const { stockInicial: _s, ...resto } = clonar(datos) as Partial<Insumo> & {
      stockInicial?: number
    }
    delete resto.stock
    delete resto.existencias
    Object.assign(insumo, resto, nombre ? { nombre } : {})
    recalcularCostosTransformados()
    persistir()
    return latencia(insumo)
  },

  async eliminarInsumo(id: string): Promise<void> {
    if (insumoEnRecetas(id)) {
      throw { mensaje: 'No se puede eliminar: el insumo forma parte de al menos una receta.' }
    }
    const enTransformacion = db.transformaciones.find(
      (t) =>
        t.entradas.some((e) => e.insumoId === id) || t.salidas.some((sa) => sa.insumoId === id),
    )
    if (enTransformacion) {
      throw {
        mensaje: `No se puede eliminar: el insumo entra o sale de «${enTransformacion.nombre}».`,
      }
    }
    if (db.stockDetalle.some((sd) => sd.insumoId === id && sd.cantidad > 0)) {
      throw { mensaje: 'No se puede eliminar: todavía tiene stock detallado en algún zona.' }
    }
    db.insumos = db.insumos.filter((i) => i.id !== id)
    db.movimientos = db.movimientos.filter((m) => m.insumoId !== id)
    db.lotes = db.lotes.filter((l) => l.insumoId !== id)
    db.stockDetalle = db.stockDetalle.filter((sd) => sd.insumoId !== id)
    persistir()
    await latencia(null)
  },

  // ── Movimientos ────────────────────────────────────────────────────────────

  async listarMovimientos(insumoId?: string): Promise<Movimiento[]> {
    const movimientos = insumoId
      ? db.movimientos.filter((m) => m.insumoId === insumoId)
      : db.movimientos
    // Más reciente primero: es el orden en el que se consulta un kardex.
    return latencia([...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)))
  },

  /**
   * Movimientos paginados. Filtros: `insumoId`, `zonaId`, `tipo`, y rango
   * con `desde` y `hasta` en `YYYY-MM-DD` (hora local).
   */
  async consultarMovimientos(consulta: Consulta = {}): Promise<Paginado<Movimiento>> {
    const { desde, hasta, ...resto } = consulta.filtros ?? {}
    const enRango = db.movimientos.filter((m) => {
      const dia = new Date(m.fecha).toLocaleDateString('sv-SE')
      return (!desde || dia >= String(desde)) && (!hasta || dia <= String(hasta))
    })
    return latencia(
      aplicarConsulta(
        enRango,
        { orden: { campo: 'fecha', direccion: 'desc' }, ...consulta, filtros: resto },
        ['motivo', 'referencia'],
      ),
    )
  },

  /**
   * Kardex de un insumo con el saldo tras cada movimiento, del más reciente al
   * más antiguo. El saldo se reconstruye hacia atrás desde el stock actual.
   */
  async kardex(insumoId: string, zonaId?: string): Promise<FilaKardex[]> {
    const insumo = insumoOError(insumoId)
    const movimientos = db.movimientos
      .filter((m) => m.insumoId === insumoId && (!zonaId || m.zonaId === zonaId))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
    let saldo = zonaId
      ? (insumo.existencias.find((e) => e.zonaId === zonaId)?.cantidad ?? 0)
      : insumo.stock
    const filas = movimientos.map((m) => {
      const fila = { ...m, saldo: r3(saldo) }
      saldo -= signoNumerico[m.tipo] * m.cantidad
      return fila
    })
    return latencia(filas)
  },

  async registrarMovimiento(datos: NuevoMovimiento): Promise<Movimiento> {
    const insumo = insumoOError(datos.insumoId)
    const zonaId = datos.zonaId || zonaPrincipal(insumo)
    const movimiento = transaccion(() => aplicar({ ...datos, zonaId }))
    return latencia(movimiento)
  },

  async trasladar(datos: {
    insumoId: string
    origenId: string
    destinoId: string
    cantidad: number
    motivo?: string
    usuarioId: string
  }): Promise<Movimiento[]> {
    if (!datos.destinoId) throw errorCampo('destinoId', 'Elige la zona de destino.')
    if (datos.origenId === datos.destinoId) {
      throw errorCampo('destinoId', 'El destino debe ser distinto del origen.', 'Misma zona')
    }
    const destino = zonaOError(datos.destinoId)
    const origen = zonaOError(datos.origenId)
    if (!destino.activo) throw errorCampo('destinoId', 'La zona de destino está inactivo.')
    const referencia = `TR-${Date.now().toString(36).toUpperCase()}`
    const base = {
      insumoId: datos.insumoId,
      cantidad: datos.cantidad,
      usuarioId: datos.usuarioId,
      referencia,
    }
    const movimientos = transaccion(() => [
      aplicar({
        ...base,
        zonaId: origen.id,
        tipo: 'trasladoSalida',
        motivo: datos.motivo || `Traslado a ${destino.nombre}`,
      }),
      aplicar({
        ...base,
        zonaId: destino.id,
        tipo: 'trasladoEntrada',
        motivo: datos.motivo || `Traslado desde ${origen.nombre}`,
      }),
    ])
    return latencia(movimientos)
  },

  // ── Transformación (F4.3) ──────────────────────────────────────────────────

  /**
   * Ejecuta una transformación en una zona: consume sus entradas y da de
   * alta lo que sale. `veces` es cuántas tandas de la receta se procesan
   * (0.5 = media tanda). La merma esperada no genera stock: es lo que se
   * pierde entre lo que entra y lo que sale.
   *
   * El registro de lo que salió **realmente**, con su ajuste y su motivo,
   * llega en F4.5; aquí se aplica el rendimiento esperado.
   */
  async transformar(datos: {
    transformacionId: string
    zonaId: string
    veces: number
    usuarioId: string
  }): Promise<Movimiento[]> {
    const transformacion = db.transformaciones.find((t) => t.id === datos.transformacionId)
    if (!transformacion) throw { mensaje: 'Transformación no encontrada.' }
    if (!transformacion.activo) {
      throw { mensaje: `«${transformacion.nombre}» está inactiva.` }
    }
    const veces = Number(datos.veces)
    if (!Number.isFinite(veces) || veces <= 0) {
      throw errorCampo('veces', 'Indica cuántas tandas se procesan.', 'Cantidad inválida')
    }
    const referencia = `TF-${Date.now().toString(36).toUpperCase()}`
    const movimientos = transaccion(() => [
      ...transformacion.entradas.map((e) =>
        aplicar({
          insumoId: e.insumoId,
          zonaId: datos.zonaId,
          tipo: 'consumoProduccion',
          cantidad: r3(e.cantidad * veces),
          motivo: transformacion.nombre,
          referencia,
          usuarioId: datos.usuarioId,
        }),
      ),
      ...transformacion.salidas
        .filter((sa) => sa.tipo === 'insumo' && sa.insumoId)
        .map((sa) =>
          aplicar({
            insumoId: sa.insumoId!,
            zonaId: datos.zonaId,
            tipo: 'produccion',
            cantidad: r3(sa.cantidad * veces),
            motivo: transformacion.nombre,
            referencia,
            usuarioId: datos.usuarioId,
          }),
        ),
    ])
    return latencia(movimientos)
  },

  /**
   * Atajo para la pantalla de movimientos: produce una cantidad concreta de un
   * insumo buscando la transformación que lo genera.
   */
  async producir(datos: {
    insumoId: string
    zonaId: string
    cantidad: number
    usuarioId: string
  }): Promise<Movimiento[]> {
    const insumo = insumoOError(datos.insumoId)
    const transformacion = transformacionQueProduce(datos.insumoId)
    if (!transformacion) {
      throw { mensaje: `${insumo.nombre} no sale de ninguna transformación activa.` }
    }
    const salida = transformacion.salidas.find((sa) => sa.insumoId === datos.insumoId)!
    return this.transformar({
      transformacionId: transformacion.id,
      zonaId: datos.zonaId,
      veces: datos.cantidad / salida.cantidad,
      usuarioId: datos.usuarioId,
    })
  },

  /** Transformación activa de la que sale un insumo, para la ficha y el modal. */
  transformacionDe(insumoId: string): Transformacion | undefined {
    return transformacionQueProduce(insumoId)
  },

  /** Uso interno de compras y pedidos: aplica varios movimientos como una transacción. */
  _aplicarEntradas(entradas: MovimientoCompleto[]) {
    return transaccion(() => entradas.map(aplicar))
  },
}
