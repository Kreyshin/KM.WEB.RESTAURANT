import type { Cadena, NuevaCadena } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo, existeOtro } from './mock/reglas'

/**
 * Cadenas de la vertical (D-008): agrupan locales por concepto de negocio.
 * Son opcionales y un local pertenece como mucho a una. Quien tiene uno o
 * pocos locales no las necesita: todo se configura en la empresa y el local.
 */

function validar(datos: NuevaCadena, id?: string) {
  const nombre = datos.nombre.trim()
  if (!nombre) throw errorCampo('nombre', 'El nombre es obligatorio.')
  if (existeOtro(db.cadenas, (c) => c.nombre, nombre, id)) {
    throw errorCampo('nombre', 'Ya existe una cadena con ese nombre.', 'Nombre duplicado')
  }
  for (const localId of datos.localIds) {
    const otra = db.cadenas.find((c) => c.id !== id && c.localIds.includes(localId))
    if (otra) {
      const local = db.locales.find((l) => l.id === localId)?.nombre ?? 'Un local'
      throw errorCampo('localIds', `${local} ya pertenece a la cadena «${otra.nombre}».`)
    }
  }
  return { ...datos, nombre }
}

export const cadenasService = {
  async todos(): Promise<Cadena[]> {
    return latencia([...db.cadenas].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  },

  async crear(datos: NuevaCadena): Promise<Cadena> {
    const cadena: Cadena = { ...clonar(validar(datos)), id: nuevoId('cd') }
    db.cadenas.push(cadena)
    persistir()
    return latencia(cadena)
  },

  async actualizar(id: string, datos: NuevaCadena): Promise<Cadena> {
    const cadena = db.cadenas.find((c) => c.id === id)
    if (!cadena) throw { mensaje: 'Cadena no encontrada.' }
    Object.assign(cadena, clonar(validar(datos, id)))
    persistir()
    return latencia(cadena)
  },

  /** Al eliminarla, sus locales heredan directo de la empresa y se descartan sus valores propios. */
  async eliminar(id: string): Promise<void> {
    db.cadenas = db.cadenas.filter((c) => c.id !== id)
    delete db.configuracion.cadenas[id]
    db.ajustesParametros = db.ajustesParametros.filter(
      (a) => !(a.nivel === 'cadena' && a.referencia === id),
    )
    db.accesosCadena = db.accesosCadena.filter((a) => a.cadenaId !== id)
    persistir()
    await latencia(null)
  },
}
