import type { ApiError, Consulta, Paginado } from '@/types'
import { aplicarConsulta } from './consulta'
import { db, latencia, nuevoId, persistir, type Esquema } from './db'

type Coleccion = {
  [K in keyof Esquema]: Esquema[K] extends { id: string }[] ? K : never
}[keyof Esquema]

type ItemDe<K extends Coleccion> = Esquema[K][number]

export interface OpcionesRepositorio<T> {
  /** Prefijo de los ids generados: `l` → `l8f3k2a1`. */
  prefijo: string
  /** Nombre en singular para los mensajes de error: «Local no encontrado». */
  entidad: string
  camposBusqueda?: (keyof T)[]
}

/**
 * CRUD genérico sobre una colección del mock.
 *
 * Los servicios nuevos se apoyan en él y añaden solo sus reglas de negocio
 * (unicidad, bloqueos de borrado...). Su forma es la del futuro servicio HTTP:
 * `consultar` ≈ GET /recurso?..., `crear` ≈ POST, `actualizar` ≈ PATCH.
 */
export function crearRepositorio<K extends Coleccion>(
  coleccion: K,
  opciones: OpcionesRepositorio<ItemDe<K>>,
) {
  type T = ItemDe<K>
  const items = () => db[coleccion] as T[]
  const noEncontrado = (): ApiError => ({ mensaje: `${opciones.entidad} no encontrado.` })

  return {
    consultar(consulta?: Consulta): Promise<Paginado<T>> {
      return latencia(aplicarConsulta(items(), consulta, opciones.camposBusqueda))
    },

    todos(): Promise<T[]> {
      return latencia(items())
    },

    async obtener(id: string): Promise<T> {
      const item = items().find((i) => i.id === id)
      if (!item) throw noEncontrado()
      return latencia(item)
    },

    async crear(datos: Omit<T, 'id'>): Promise<T> {
      const item = { ...datos, id: nuevoId(opciones.prefijo) } as T
      const resultado = await latencia(item)
      items().push(item)
      persistir()
      return resultado
    },

    async actualizar(id: string, datos: Partial<Omit<T, 'id'>>): Promise<T> {
      const item = items().find((i) => i.id === id)
      if (!item) throw noEncontrado()
      const actualizado = { ...item, ...datos }
      const resultado = await latencia(actualizado)
      Object.assign(item, datos)
      persistir()
      return resultado
    },

    async eliminar(id: string): Promise<void> {
      if (!items().some((i) => i.id === id)) throw noEncontrado()
      await latencia(null)
      ;(db[coleccion] as T[]) = items().filter((i) => i.id !== id)
      persistir()
    },
  }
}
