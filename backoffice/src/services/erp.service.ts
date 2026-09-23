import type { Articulo, Consulta, Marca, Paginado, Proveedor } from '@/types'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia } from './mock/db'

/**
 * Maestros que pertenecen al ERP (D-005). La vertical solo los consulta: no
 * hay alta, edición ni baja. Con integración, estos métodos leerán del ERP.
 */

function soloConsulta<T extends { id: string }>(
  items: () => T[],
  entidad: string,
  camposBusqueda: (keyof T & string)[],
  filtroExtra?: (item: T, filtros: Record<string, unknown>) => boolean,
) {
  return {
    consultar(consulta: Consulta = {}): Promise<Paginado<T>> {
      const filtros = { ...consulta.filtros }
      const extra = filtroExtra
        ? items().filter((i) => filtroExtra(i, filtros as Record<string, unknown>))
        : items()
      return latencia(aplicarConsulta(extra, { ...consulta, filtros }, camposBusqueda))
    },
    todos(): Promise<T[]> {
      return latencia(items())
    },
    async obtener(id: string): Promise<T> {
      const item = items().find((i) => i.id === id)
      if (!item) throw { mensaje: `${entidad} no encontrado.` }
      return latencia(item)
    },
  }
}

export const proveedoresService = soloConsulta<Proveedor>(() => db.proveedores, 'Proveedor', [
  'razonSocial',
  'ruc',
  'contacto',
])

export const marcasService = soloConsulta<Marca>(() => db.marcas, 'Marca', ['nombre'])

export const articulosService = soloConsulta<Articulo>(() => db.articulos, 'Artículo', [
  'codigo',
  'nombre',
])
