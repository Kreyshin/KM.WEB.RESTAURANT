import type { Insumo, Movimiento, NuevoInsumo, NuevoMovimiento, Receta } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'

/** Signo que cada tipo de movimiento aplica al stock. */
const signo: Record<Movimiento['tipo'], number> = {
  entrada: 1,
  salida: -1,
  merma: -1,
  ajuste: 1,
}

export const inventarioService = {
  // ── Insumos ────────────────────────────────────────────────────────────────

  async listarInsumos(): Promise<Insumo[]> {
    return latencia([...db.insumos].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  },

  async crearInsumo(datos: NuevoInsumo): Promise<Insumo> {
    const nombre = datos.nombre.trim()
    if (db.insumos.some((i) => i.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw {
        mensaje: 'Ya existe un insumo con ese nombre.',
        campos: { nombre: 'Nombre duplicado' },
      }
    }
    const insumo: Insumo = { ...datos, nombre, id: nuevoId('i') }
    db.insumos.push(insumo)
    persistir()
    return latencia(insumo)
  },

  async actualizarInsumo(id: string, datos: Partial<NuevoInsumo>): Promise<Insumo> {
    const insumo = db.insumos.find((i) => i.id === id)
    if (!insumo) throw { mensaje: 'Insumo no encontrado.' }
    const nombre = datos.nombre?.trim()
    if (
      nombre &&
      db.insumos.some((i) => i.id !== id && i.nombre.toLowerCase() === nombre.toLowerCase())
    ) {
      throw {
        mensaje: 'Ya existe un insumo con ese nombre.',
        campos: { nombre: 'Nombre duplicado' },
      }
    }
    Object.assign(insumo, datos, nombre ? { nombre } : {})
    persistir()
    return latencia(insumo)
  },

  async eliminarInsumo(id: string): Promise<void> {
    const enUso = db.recetas.some((r) => r.ingredientes.some((g) => g.insumoId === id))
    if (enUso) {
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
   * Registra un movimiento y aplica su efecto al stock.
   * El stock nunca baja de cero: una salida mayor que las existencias es un
   * error de registro, no un inventario negativo.
   */
  async registrarMovimiento(datos: NuevoMovimiento): Promise<Movimiento> {
    const insumo = db.insumos.find((i) => i.id === datos.insumoId)
    if (!insumo) throw { mensaje: 'Insumo no encontrado.' }

    const cantidad = Number(datos.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw {
        mensaje: 'La cantidad debe ser mayor que cero.',
        campos: { cantidad: 'Cantidad inválida' },
      }
    }

    const resultante = insumo.stock + signo[datos.tipo] * cantidad
    if (resultante < 0) {
      throw {
        mensaje: `No hay stock suficiente: quedan ${insumo.stock} ${insumo.unidad}.`,
        campos: { cantidad: 'Supera el stock disponible' },
      }
    }

    const movimiento: Movimiento = {
      ...datos,
      cantidad,
      id: nuevoId('mv'),
      fecha: new Date().toISOString(),
    }
    db.movimientos.push(movimiento)
    // Se redondea a 3 decimales para no arrastrar error de coma flotante.
    insumo.stock = Math.round(resultante * 1000) / 1000
    persistir()
    return latencia(movimiento)
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
      ingredientes: receta.ingredientes.filter((i) => i.insumoId && Number(i.cantidad) > 0),
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
    return receta.ingredientes.reduce((total, ingrediente) => {
      const insumo = db.insumos.find((i) => i.id === ingrediente.insumoId)
      return total + (insumo ? insumo.costoUnitario * ingrediente.cantidad : 0)
    }, 0)
  },
}
