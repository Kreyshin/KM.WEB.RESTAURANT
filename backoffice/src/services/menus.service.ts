import type { Menu, NuevoMenu } from '@/types'
import { db, latencia } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'
import { diaSemana } from './promociones.service'

/**
 * Menús (D-016): selecciones de lo que se ofrece. No tienen precio —cada
 * producto se cobra por su lista— y cada uno lleva su propia vigencia, así que
 * «menú del día» es un menú con vigencia diaria y no una entidad aparte.
 */

const repo = crearRepositorio('menus', {
  prefijo: 'mn',
  entidad: 'Menú',
  camposBusqueda: ['nombre', 'descripcion'],
})

function validar(datos: Partial<NuevoMenu>, id?: string) {
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    if (existeOtro(db.menus, (m) => m.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya existe un menú con ese nombre.', 'Nombre duplicado')
    }
  }

  const modo = datos.modoVigencia ?? db.menus.find((m) => m.id === id)?.modoVigencia
  if (modo === 'fechas') {
    const desde = datos.desde ?? db.menus.find((m) => m.id === id)?.desde
    const hasta = datos.hasta ?? db.menus.find((m) => m.id === id)?.hasta
    if (!desde || !hasta) throw errorCampo('vigencia', 'Indica desde cuándo y hasta cuándo.')
    if (desde > hasta) {
      throw errorCampo('vigencia', 'El inicio no puede ser posterior al fin.', 'Fechas invertidas')
    }
  }
  if (modo === 'dias') {
    const dias = datos.dias ?? db.menus.find((m) => m.id === id)?.dias ?? []
    if (!dias.length) throw errorCampo('dias', 'Elige al menos un día de la semana.')
  }

  if (datos.secciones !== undefined) {
    if (datos.secciones.length === 0) {
      throw errorCampo('secciones', 'Añade al menos una sección al menú.')
    }
    for (const s of datos.secciones) {
      if (!s.nombre.trim()) throw errorCampo('secciones', 'Cada sección necesita un nombre.')
      if (s.productoIds.length === 0) {
        throw errorCampo('secciones', `«${s.nombre}» no ofrece ningún producto.`)
      }
      if (s.productoIds.some((p) => !db.productos.some((x) => x.id === p))) {
        throw errorCampo('secciones', `«${s.nombre}» incluye un producto que ya no existe.`)
      }
    }
  }

  if (datos.localIds?.some((l) => !db.locales.some((x) => x.id === l))) {
    throw errorCampo('localIds', 'Hay un local que ya no existe.')
  }
}

/**
 * Si el menú se ofrece ese día en ese local. `fecha` es AAAA-MM-DD en la hora
 * del restaurante; el día de la semana sale de ella con el convenio de la
 * vertical (0 = lunes), no el de JavaScript.
 */
export function menuVigente(menu: Menu, fecha: string, localId?: string) {
  if (!menu.activo) return false
  if (localId && menu.localIds.length && !menu.localIds.includes(localId)) return false
  if (menu.modoVigencia === 'fechas') {
    return Boolean(menu.desde && menu.hasta && fecha >= menu.desde && fecha <= menu.hasta)
  }
  if (menu.modoVigencia === 'dias') return menu.dias.includes(diaSemana(fecha))
  return true
}

/** Cuántos productos ofrece el menú, sin contar los repetidos entre secciones. */
export function productosDelMenu(menu: Pick<Menu, 'secciones'>) {
  return new Set(menu.secciones.flatMap((s) => s.productoIds)).size
}

export const menusService = {
  ...repo,

  async crear(datos: NuevoMenu): Promise<Menu> {
    validar(datos)
    return repo.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoMenu>): Promise<Menu> {
    validar(datos, id)
    return repo.actualizar(id, datos)
  },

  /** Los menús que se ofrecen hoy en un local: lo que vería la carta. */
  async vigentes(fecha: string, localId?: string): Promise<Menu[]> {
    return latencia(db.menus.filter((m) => menuVigente(m, fecha, localId)))
  },
}
