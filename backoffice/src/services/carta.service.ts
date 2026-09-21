import type { Categoria, NuevaCategoria, NuevoProducto, Producto } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { errorCampo } from './mock/reglas'

function validarProducto(datos: Partial<NuevoProducto>) {
  for (const l of datos.noOfrecidoEn ?? [])
    if (!db.locales.some((x) => x.id === l))
      throw errorCampo('noOfrecidoEn', 'Hay un local que ya no existe.')
  if (datos.precio !== undefined && !(Number(datos.precio) >= 0)) {
    throw errorCampo('precio', 'El precio no puede ser negativo.')
  }
}

/** ¿Se ofrece la categoría en este local y canal? Hereda las restricciones de su sección. */
export function categoriaOfrecida(
  categoriaId: string,
  localId?: string,
  canalId?: string,
): boolean {
  const c = db.categorias.find((x) => x.id === categoriaId)
  if (!c || !c.activa) return false
  if (localId && c.localIds?.length && !c.localIds.includes(localId)) return false
  if (canalId && c.canalIds?.length && !c.canalIds.includes(canalId)) return false
  return c.seccionId ? categoriaOfrecida(c.seccionId, localId, canalId) : true
}

/** ¿Se ofrece el producto en este local y canal? */
export function productoOfrecido(productoId: string, localId?: string, canalId?: string): boolean {
  const p = db.productos.find((x) => x.id === productoId)
  if (!p) return false
  if (localId && p.noOfrecidoEn?.includes(localId)) return false
  return categoriaOfrecida(p.categoriaId, localId, canalId)
}

function validarAlcance(datos: Partial<NuevaCategoria>, id?: string) {
  if (datos.seccionId) {
    const seccion = db.categorias.find((c) => c.id === datos.seccionId)
    if (!seccion || datos.seccionId === id)
      throw errorCampo('seccionId', 'Elige otra categoría como sección.')
    if (seccion.seccionId)
      throw errorCampo(
        'seccionId',
        `«${seccion.nombre}» ya está dentro de una sección: se agrupa en un solo nivel.`,
        'Un solo nivel',
      )
    if (id && db.categorias.some((c) => c.seccionId === id))
      throw errorCampo(
        'seccionId',
        'Esta categoría agrupa a otras: no puede estar dentro de una sección.',
        'Un solo nivel',
      )
  }
  for (const l of datos.localIds ?? [])
    if (!db.locales.some((x) => x.id === l))
      throw errorCampo('localIds', 'Hay un local que ya no existe.')
  for (const c of datos.canalIds ?? [])
    if (!db.canales.some((x) => x.id === c))
      throw errorCampo('canalIds', 'Hay un canal que ya no existe.')
  const o = datos.foodCostObjetivo
  if (o !== undefined && o !== null && !(o > 0 && o < 100))
    throw errorCampo('foodCostObjetivo', 'El objetivo debe estar entre 0 % y 100 %.')
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
    validarAlcance(datos)
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
    validarAlcance(datos, id)
    for (const clave of ['seccionId', 'foodCostObjetivo', 'localIds', 'canalIds'] as const)
      if (clave in datos && (datos[clave] === undefined || datos[clave] === null))
        delete categoria[clave]
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
    const agrupadas = db.categorias.filter((c) => c.seccionId === id)
    if (agrupadas.length) {
      throw {
        mensaje: `No se puede eliminar: agrupa a ${agrupadas.map((c) => `«${c.nombre}»`).join(', ')}.`,
      }
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
    const eliminado = db.productos.find((p) => p.id === id)
    db.productos = db.productos.filter((p) => p.id !== id)
    // Las recetas del producto y de sus presentaciones dejan de tener sentido sin él.
    const variantes = new Set(eliminado?.variantes.map((v) => `v:${v.id}`) ?? [])
    db.recetasEstandar = db.recetasEstandar.filter(
      (r) => r.vendibleId !== `p:${id}` && !variantes.has(r.vendibleId),
    )
    persistir()
    await latencia(null)
  },
}
