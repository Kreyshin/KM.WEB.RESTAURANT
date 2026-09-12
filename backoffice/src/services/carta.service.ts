import type { Categoria, NuevaCategoria, NuevoProducto, Producto } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'

export const cartaService = {
  // ── Categorías ─────────────────────────────────────────────────────────────

  async listarCategorias(): Promise<Categoria[]> {
    return latencia([...db.categorias].sort((a, b) => a.orden - b.orden))
  },

  async crearCategoria(datos: NuevaCategoria): Promise<Categoria> {
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
    db.productos = db.productos.filter((p) => p.id !== id)
    // El escandallo deja de tener sentido sin su producto.
    db.recetas = db.recetas.filter((r) => r.productoId !== id)
    persistir()
    await latencia(null)
  },
}
