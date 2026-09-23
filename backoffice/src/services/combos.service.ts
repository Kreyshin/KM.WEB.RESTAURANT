import type { Combo, NuevoCombo } from '@/types'
import { db } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('combos', {
  prefijo: 'cb',
  entidad: 'Combo',
  camposBusqueda: ['nombre', 'descripcion'],
})

function validar(datos: Partial<NuevoCombo>, id?: string) {
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    if (existeOtro(db.combos, (c) => c.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya existe un combo o menú con ese nombre.', 'Nombre duplicado')
    }
  }
  if (datos.precio !== undefined && !(Number(datos.precio) > 0)) {
    throw errorCampo('precio', 'El precio debe ser mayor que cero.')
  }
  if (datos.grupos !== undefined) {
    if (datos.grupos.length === 0) throw errorCampo('grupos', 'Añade al menos una parte al combo.')
    for (const g of datos.grupos) {
      if (!g.nombre.trim()) throw errorCampo('grupos', 'Cada parte necesita un nombre.')
      if (g.opciones.length === 0) {
        throw errorCampo('grupos', `«${g.nombre}» no tiene ningún producto.`)
      }
      if (g.opciones.some((p) => !db.productos.some((x) => x.id === p))) {
        throw errorCampo('grupos', `«${g.nombre}» incluye un producto que ya no existe.`)
      }
    }
  }
  const tipo = datos.tipo ?? db.combos.find((c) => c.id === id)?.tipo
  if (tipo === 'menuDia' && datos.dias !== undefined && datos.dias.length === 0) {
    throw errorCampo('dias', 'Elige al menos un día para el menú.')
  }
}

/** Precio de referencia: la opción más barata de cada parte, sumadas. */
export function precioSueltos(combo: Pick<Combo, 'grupos'>) {
  return combo.grupos.reduce((total, g) => {
    const precios = g.opciones
      .map((id) => db.productos.find((p) => p.id === id)?.precio)
      .filter((p): p is number => p !== undefined)
    return total + (precios.length ? Math.min(...precios) : 0)
  }, 0)
}

export const combosService = {
  ...repo,

  async crear(datos: NuevoCombo): Promise<Combo> {
    validar(datos)
    return repo.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoCombo>): Promise<Combo> {
    validar(datos, id)
    return repo.actualizar(id, datos)
  },
}
