import type { Categoria, NuevaCategoria, NuevoProducto, Producto } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { errorCampo } from './mock/reglas'

function validarProducto(datos: Partial<NuevoProducto>) {
  if (datos.estacionId && !db.estaciones.some((e) => e.id === datos.estacionId)) {
    throw errorCampo('estacionId', 'La estación elegida ya no existe.')
  }
  for (const pc of datos.preciosCanal ?? []) {
    if (!db.canales.some((c) => c.id === pc.canalId)) {
      throw errorCampo('preciosCanal', 'Hay un precio para un canal que ya no existe.')
    }
    if (!(Number(pc.precio) >= 0)) {
      throw errorCampo('preciosCanal', 'Los precios por canal no pueden ser negativos.')
    }
  }
  if (
    datos.preciosCanal &&
    new Set(datos.preciosCanal.map((p) => p.canalId)).size !== datos.preciosCanal.length
  ) {
    throw errorCampo('preciosCanal', 'Un canal tiene dos precios.')
  }
}

function validarCategoria(datos: Partial<NuevaCategoria>) {
  const d = datos.disponibilidad
  if (!d) return
  if (d.dias.length === 0) throw errorCampo('disponibilidad', 'Elige al menos un día.')
  if (!d.desde || !d.hasta || d.desde === d.hasta) {
    throw errorCampo('disponibilidad', 'Indica una hora de inicio y de fin distintas.')
  }
}

export const cartaService = {
  // ── Categorías ─────────────────────────────────────────────────────────────

  async listarCategorias(): Promise<Categoria[]> {
    return latencia([...db.categorias].sort((a, b) => a.orden - b.orden))
  },

  async crearCategoria(datos: NuevaCategoria): Promise<Categoria> {
    validarCategoria(datos)
    const nombre = datos.nombre.trim()
    if (db.categorias.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw {
        mensaje: 'Ya existe una categoría con ese nombre.',
        campos: { nombre: 'Nombre duplicado' },
      }
    }
    const categoria: Categoria = { ...datos, nombre, id: nuevoId('c') }
    db.categorias.push(categoria)
    persistir()
    return latencia(categoria)
  },

  async actualizarCategoria(id: string, datos: Partial<NuevaCategoria>): Promise<Categoria> {
    const categoria = db.categorias.find((c) => c.id === id)
    if (!categoria) throw { mensaje: 'Categoría no encontrada.' }
    validarCategoria(datos)
    if ('disponibilidad' in datos && !datos.disponibilidad) delete categoria.disponibilidad
    const nombre = datos.nombre?.trim()
    if (
      nombre &&
      db.categorias.some((c) => c.id !== id && c.nombre.toLowerCase() === nombre.toLowerCase())
    ) {
      throw {
        mensaje: 'Ya existe una categoría con ese nombre.',
        campos: { nombre: 'Nombre duplicado' },
      }
    }
    Object.assign(categoria, datos, nombre ? { nombre } : {})
    persistir()
    return latencia(categoria)
  },

  async eliminarCategoria(id: string): Promise<void> {
    if (db.productos.some((p) => p.categoriaId === id)) {
      throw { mensaje: 'No se puede eliminar: la categoría todavía tiene productos.' }
    }
    db.categorias = db.categorias.filter((c) => c.id !== id)
    persistir()
    await latencia(null)
  },

  /** Mueve una categoría una posición arriba o abajo intercambiando el orden. */
  async reordenarCategoria(id: string, direccion: 'arriba' | 'abajo'): Promise<Categoria[]> {
    const ordenadas = [...db.categorias].sort((a, b) => a.orden - b.orden)
    const i = ordenadas.findIndex((c) => c.id === id)
    const j = direccion === 'arriba' ? i - 1 : i + 1
    if (i === -1 || j < 0 || j >= ordenadas.length) return latencia(ordenadas, 0)

    const orden = ordenadas[i].orden
    ordenadas[i].orden = ordenadas[j].orden
    ordenadas[j].orden = orden
    persistir()
    return latencia(
      [...db.categorias].sort((a, b) => a.orden - b.orden),
      0,
    )
  },

  // ── Productos ──────────────────────────────────────────────────────────────

  async listarProductos(categoriaId?: string): Promise<Producto[]> {
    const productos = categoriaId
      ? db.productos.filter((p) => p.categoriaId === categoriaId)
      : db.productos
    return latencia([...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  },

  async crearProducto(datos: NuevoProducto): Promise<Producto> {
    validarProducto(datos)
    const nombre = datos.nombre.trim()
    if (db.productos.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw {
        mensaje: 'Ya existe un producto con ese nombre.',
        campos: { nombre: 'Nombre duplicado' },
      }
    }
    const producto: Producto = { ...datos, nombre, id: nuevoId('p') }
    db.productos.push(producto)
    persistir()
    return latencia(producto)
  },

  async actualizarProducto(id: string, datos: Partial<NuevoProducto>): Promise<Producto> {
    const producto = db.productos.find((p) => p.id === id)
    if (!producto) throw { mensaje: 'Producto no encontrado.' }
    validarProducto(datos)
    const nombre = datos.nombre?.trim()
    if (
      nombre &&
      db.productos.some((p) => p.id !== id && p.nombre.toLowerCase() === nombre.toLowerCase())
    ) {
      throw {
        mensaje: 'Ya existe un producto con ese nombre.',
        campos: { nombre: 'Nombre duplicado' },
      }
    }
    Object.assign(producto, datos, nombre ? { nombre } : {})
    persistir()
    return latencia(producto)
  },

  /** Conmutador rápido de disponibilidad, para marcar un plato agotado en sala. */
  async cambiarDisponibilidad(id: string, disponible: boolean): Promise<Producto> {
    const producto = db.productos.find((p) => p.id === id)
    if (!producto) throw { mensaje: 'Producto no encontrado.' }
    producto.disponible = disponible
    persistir()
    return latencia(producto, 80)
  },

  async eliminarProducto(id: string): Promise<void> {
    const enCombo = db.combos.find((c) => c.grupos.some((g) => g.opciones.includes(id)))
    if (enCombo) {
      throw {
        mensaje: `No se puede eliminar: forma parte de «${enCombo.nombre}». Quítalo del combo antes.`,
      }
    }
    db.productos = db.productos.filter((p) => p.id !== id)
    // El escandallo deja de tener sentido sin su producto.
    db.recetas = db.recetas.filter((r) => r.productoId !== id)
    persistir()
    await latencia(null)
  },
}
