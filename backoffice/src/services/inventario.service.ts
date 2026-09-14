import type {
  Consulta,
  Insumo,
  Movimiento,
  NuevoInsumo,
  NuevoMovimiento,
  Paginado,
  Preparacion,
  Receta,
} from '@/types'
import { signoNumerico } from '@/utils/formato'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

/** Cantidades con 3 decimales: evita arrastrar error de coma flotante (8.700000000000001). */
const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function insumoOError(id: string) {
  const insumo = db.insumos.find((i) => i.id === id)
  if (!insumo) throw { mensaje: 'Insumo no encontrado.' }
  return insumo
}

function almacenOError(id: string) {
  const almacen = db.almacenes.find((a) => a.id === id)
  if (!almacen) throw errorCampo('almacenId', 'Almacén no encontrado.', 'Elige un almacén')
  return almacen
}

function existenciaDe(insumo: Insumo, almacenId: string) {
  let e = insumo.existencias.find((x) => x.almacenId === almacenId)
  if (!e) {
    e = { almacenId, cantidad: 0 }
    insumo.existencias.push(e)
  }
  return e
}

function recalcularTotal(insumo: Insumo) {
  insumo.stock = r3(insumo.existencias.reduce((t, e) => t + e.cantidad, 0))
}

/** Almacén por defecto de un insumo: donde más stock tiene, o el primero activo. */
function almacenPrincipal(insumo: Insumo) {
  const conStock = [...insumo.existencias].sort((a, b) => b.cantidad - a.cantidad)[0]
  return conStock?.almacenId ?? db.almacenes.find((a) => a.activo)?.id ?? ''
}

type MovimientoCompleto = NuevoMovimiento & { almacenId: string }

/**
 * Aplica un movimiento al stock sin latencia ni persistencia, para poder
 * encadenar varios (traslados, producción, recepciones) y guardar una sola vez.
 * El stock nunca queda negativo: una salida mayor que las existencias es un
 * error de registro, no un inventario negativo.
 */
function aplicar(datos: MovimientoCompleto): Movimiento {
  const insumo = insumoOError(datos.insumoId)
  const almacen = almacenOError(datos.almacenId)

  const cantidad = Number(datos.cantidad)
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw errorCampo('cantidad', 'La cantidad debe ser mayor que cero.', 'Cantidad inválida')
  }

  const existencia = existenciaDe(insumo, almacen.id)
  const signo = signoNumerico[datos.tipo]
  const resultante = existencia.cantidad + signo * cantidad
  if (resultante < 0) {
    throw errorCampo(
      'cantidad',
      `No hay stock suficiente de ${insumo.nombre} en ${almacen.nombre}: quedan ${existencia.cantidad} ${insumo.unidad}.`,
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

/**
 * Ejecuta varios cambios como una transacción: si uno falla, se restaura el
 * estado anterior de insumos y movimientos.
 */
function transaccion<T>(fn: () => T): T {
  const copia = clonar({ insumos: db.insumos, movimientos: db.movimientos })
  try {
    const r = fn()
    recalcularPreparaciones()
    persistir()
    return r
  } catch (e) {
    db.insumos = copia.insumos
    db.movimientos = copia.movimientos
    throw e
  }
}

function costeIngredientes(ingredientes: { insumoId: string; cantidad: number }[]) {
  return ingredientes.reduce((total, g) => {
    const insumo = db.insumos.find((i) => i.id === g.insumoId)
    return total + (insumo ? insumo.costoUnitario * g.cantidad : 0)
  }, 0)
}

/** El costo de una preparación depende de sus ingredientes: se actualiza al cambiar estos. */
function recalcularPreparaciones() {
  for (const insumo of db.insumos) {
    if (!insumo.preparacion || insumo.preparacion.rendimiento <= 0) continue
    insumo.costoUnitario = r2(
      costeIngredientes(insumo.preparacion.ingredientes) / insumo.preparacion.rendimiento,
    )
  }
}

// ── Almacenes ────────────────────────────────────────────────────────────────

/** Almacenes: vienen del ERP y aquí solo se consultan (D-005). */
const repoAlmacenes = crearRepositorio('almacenes', {
  prefijo: 'al',
  entidad: 'Almacén',
  camposBusqueda: ['nombre', 'descripcion'],
})

export const almacenesService = {
  consultar: repoAlmacenes.consultar,
  todos: repoAlmacenes.todos,
  obtener: repoAlmacenes.obtener,
}

// ── Insumos, movimientos y recetas ───────────────────────────────────────────

export type EstadoStock = 'agotado' | 'bajo' | 'ok'

export function estadoStock(stock: number, minimo: number): EstadoStock {
  if (stock <= 0) return 'agotado'
  if (stock < minimo) return 'bajo'
  return 'ok'
}

export interface FilaKardex extends Movimiento {
  /** Saldo del almacén (o total) tras el movimiento. */
  saldo: number
}

export const inventarioService = {
  // ── Insumos ────────────────────────────────────────────────────────────────

  async listarInsumos(): Promise<Insumo[]> {
    return latencia([...db.insumos].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  },

  /**
   * Listado paginado. Filtros especiales:
   * - `almacenId`: el stock mostrado es el de ese almacén.
   * - `estadoStock`: `agotado`, `bajo` u `ok`.
   */
  async consultarInsumos(consulta: Consulta = {}): Promise<Paginado<Insumo>> {
    const { almacenId, estadoStock: estado, ...resto } = consulta.filtros ?? {}
    let lista = db.insumos.map((i) =>
      almacenId
        ? {
            ...i,
            stock: i.existencias.find((e) => e.almacenId === almacenId)?.cantidad ?? 0,
          }
        : i,
    )
    if (almacenId) {
      lista = lista.filter((i) => i.existencias.some((e) => e.almacenId === almacenId))
    }
    if (estado) lista = lista.filter((i) => estadoStock(i.stock, i.stockMinimo) === estado)
    return latencia(
      aplicarConsulta(lista, { ...consulta, filtros: resto }, ['nombre', 'categoria']),
    )
  },

  async obtenerInsumo(id: string): Promise<Insumo> {
    return latencia(insumoOError(id))
  },

  async crearInsumo(datos: NuevoInsumo, almacenId?: string): Promise<Insumo> {
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
      const destino = almacenId ?? db.almacenes.find((a) => a.activo)?.id
      if (!destino) throw errorCampo('almacenId', 'Crea un almacén antes de cargar stock.')
      transaccion(() =>
        aplicar({
          insumoId: insumo.id,
          almacenId: destino,
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
    // El stock solo cambia con movimientos.
    const { stockInicial: _s, ...resto } = clonar(datos) as Partial<Insumo> & {
      stockInicial?: number
    }
    delete resto.stock
    delete resto.existencias
    Object.assign(insumo, resto, nombre ? { nombre } : {})
    recalcularPreparaciones()
    persistir()
    return latencia(insumo)
  },

  async eliminarInsumo(id: string): Promise<void> {
    const enReceta =
      db.recetas.some((r) => r.ingredientes.some((g) => g.insumoId === id)) ||
      db.insumos.some((i) => i.preparacion?.ingredientes.some((g) => g.insumoId === id))
    if (enReceta) {
      throw { mensaje: 'No se puede eliminar: el insumo forma parte de al menos una receta.' }
    }
    db.insumos = db.insumos.filter((i) => i.id !== id)
    db.movimientos = db.movimientos.filter((m) => m.insumoId !== id)
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
   * Movimientos paginados. Filtros: `insumoId`, `almacenId`, `tipo`, y rango
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
  async kardex(insumoId: string, almacenId?: string): Promise<FilaKardex[]> {
    const insumo = insumoOError(insumoId)
    const movimientos = db.movimientos
      .filter((m) => m.insumoId === insumoId && (!almacenId || m.almacenId === almacenId))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
    let saldo = almacenId
      ? (insumo.existencias.find((e) => e.almacenId === almacenId)?.cantidad ?? 0)
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
    const almacenId = datos.almacenId || almacenPrincipal(insumo)
    const movimiento = transaccion(() => aplicar({ ...datos, almacenId }))
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
    if (!datos.destinoId) throw errorCampo('destinoId', 'Elige el almacén de destino.')
    if (datos.origenId === datos.destinoId) {
      throw errorCampo('destinoId', 'El destino debe ser distinto del origen.', 'Mismo almacén')
    }
    const destino = almacenOError(datos.destinoId)
    const origen = almacenOError(datos.origenId)
    if (!destino.activo) throw errorCampo('destinoId', 'El almacén de destino está inactivo.')
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
        almacenId: origen.id,
        tipo: 'trasladoSalida',
        motivo: datos.motivo || `Traslado a ${destino.nombre}`,
      }),
      aplicar({
        ...base,
        almacenId: destino.id,
        tipo: 'trasladoEntrada',
        motivo: datos.motivo || `Traslado desde ${origen.nombre}`,
      }),
    ])
    return latencia(movimientos)
  },

  // ── Preparaciones (subrecetas) ─────────────────────────────────────────────

  async guardarPreparacion(insumoId: string, preparacion: Preparacion | null): Promise<Insumo> {
    const insumo = insumoOError(insumoId)
    if (preparacion) {
      if (!(preparacion.rendimiento > 0)) {
        throw errorCampo('rendimiento', 'El rendimiento debe ser mayor que cero.')
      }
      const ingredientes = preparacion.ingredientes.filter((g) => g.insumoId && g.cantidad > 0)
      if (ingredientes.length === 0) {
        throw errorCampo('ingredientes', 'Añade al menos un ingrediente con cantidad.')
      }
      if (ingredientes.some((g) => g.insumoId === insumoId)) {
        throw errorCampo('ingredientes', 'Una preparación no puede usarse a sí misma.')
      }
      insumo.preparacion = {
        rendimiento: preparacion.rendimiento,
        ingredientes: clonar(ingredientes),
      }
      insumo.categoria = 'preparaciones'
    } else {
      delete insumo.preparacion
    }
    recalcularPreparaciones()
    persistir()
    return latencia(insumo)
  },

  /** Elabora una preparación: descuenta sus ingredientes y suma lo producido. */
  async producir(datos: {
    insumoId: string
    almacenId: string
    cantidad: number
    usuarioId: string
  }): Promise<Movimiento[]> {
    const insumo = insumoOError(datos.insumoId)
    if (!insumo.preparacion) throw { mensaje: `${insumo.nombre} no tiene receta de preparación.` }
    const factor = datos.cantidad / insumo.preparacion.rendimiento
    const referencia = `PR-${Date.now().toString(36).toUpperCase()}`
    const movimientos = transaccion(() => [
      ...insumo.preparacion!.ingredientes.map((g) =>
        aplicar({
          insumoId: g.insumoId,
          almacenId: datos.almacenId,
          tipo: 'consumoProduccion',
          cantidad: r3(g.cantidad * factor),
          motivo: `Producción de ${insumo.nombre}`,
          referencia,
          usuarioId: datos.usuarioId,
        }),
      ),
      aplicar({
        insumoId: insumo.id,
        almacenId: datos.almacenId,
        tipo: 'produccion',
        cantidad: datos.cantidad,
        motivo: 'Producción en cocina',
        referencia,
        usuarioId: datos.usuarioId,
      }),
    ])
    return latencia(movimientos)
  },

  // ── Recetas ────────────────────────────────────────────────────────────────

  async listarRecetas(): Promise<Receta[]> {
    return latencia([...db.recetas])
  },

  async obtenerReceta(productoId: string): Promise<Receta> {
    const receta = db.recetas.find((r) => r.productoId === productoId)
    return latencia(receta ?? { productoId, ingredientes: [] })
  },

  async guardarReceta(receta: Receta): Promise<Receta> {
    const limpia: Receta = {
      productoId: receta.productoId,
      ingredientes: receta.ingredientes
        .filter((i) => i.insumoId && Number(i.cantidad) > 0)
        .map((i) => ({ insumoId: i.insumoId, cantidad: Number(i.cantidad) })),
    }
    const indice = db.recetas.findIndex((r) => r.productoId === receta.productoId)

    if (limpia.ingredientes.length === 0) {
      // Una receta sin ingredientes es lo mismo que no tener receta.
      if (indice !== -1) db.recetas.splice(indice, 1)
    } else if (indice === -1) {
      db.recetas.push(limpia)
    } else {
      db.recetas[indice] = limpia
    }

    persistir()
    return latencia(limpia)
  },

  /** Coste teórico de un producto según su escandallo. */
  costeDeReceta(receta: Receta): number {
    return costeIngredientes(receta.ingredientes)
  },

  /** Uso interno de compras y pedidos: aplica varios movimientos como una transacción. */
  _aplicarEntradas(entradas: MovimientoCompleto[]) {
    return transaccion(() => entradas.map(aplicar))
  },
}
