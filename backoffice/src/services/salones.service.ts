import type { Consulta, NuevoSalon, Paginado, Salon } from '@/types'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia, nuevoId, persistir } from './mock/db'

export const salonesService = {
  /** Listado paginado para tablas. Sin orden explícito, respeta `orden`. */
  async consultar(consulta: Consulta = {}): Promise<Paginado<Salon>> {
    const base = [...db.salones].sort((a, b) => a.orden - b.orden)
    return latencia(aplicarConsulta(base, consulta, ['nombre', 'descripcion']))
  },

  async listar(): Promise<Salon[]> {
    const ordenados = [...db.salones].sort((a, b) => a.orden - b.orden)
    return latencia(ordenados)
  },

  async obtener(id: string): Promise<Salon> {
    const salon = db.salones.find((s) => s.id === id)
    if (!salon) throw { mensaje: 'Salón no encontrado.' }
    return latencia(salon)
  },

  async crear(datos: NuevoSalon): Promise<Salon> {
    if (!datos.localId)
      throw { mensaje: 'Elige el local del salón.', campos: { localId: 'Obligatorio' } }
    const mismoLocal = db.salones.filter((s) => s.localId === datos.localId)
    if (mismoLocal.some((s) => s.nombre.toLowerCase() === datos.nombre.trim().toLowerCase())) {
      throw {
        mensaje: 'Ya existe un salón con ese nombre en el local.',
        campos: { nombre: 'Nombre duplicado' },
      }
    }
    const salon: Salon = { ...datos, nombre: datos.nombre.trim(), id: nuevoId('s') }
    db.salones.push(salon)
    persistir()
    return latencia(salon)
  },

  async actualizar(id: string, datos: Partial<NuevoSalon>): Promise<Salon> {
    const salon = db.salones.find((s) => s.id === id)
    if (!salon) throw { mensaje: 'Salón no encontrado.' }
    if (
      datos.nombre &&
      db.salones.some(
        (s) =>
          s.id !== id &&
          s.localId === salon.localId &&
          s.nombre.toLowerCase() === datos.nombre!.trim().toLowerCase(),
      )
    ) {
      throw {
        mensaje: 'Ya existe un salón con ese nombre.',
        campos: { nombre: 'Nombre duplicado' },
      }
    }
    Object.assign(salon, datos, datos.nombre ? { nombre: datos.nombre.trim() } : {})
    persistir()
    return latencia(salon)
  },

  async eliminar(id: string): Promise<void> {
    if (db.mesas.some((m) => m.salonId === id)) {
      throw { mensaje: 'No se puede eliminar: el salón todavía tiene mesas asignadas.' }
    }
    const areas = db.areas.filter((a) => a.salonId === id).map((a) => a.nombre)
    if (areas.length) {
      throw { mensaje: `No se puede eliminar: el salón tiene las áreas ${areas.join(', ')}.` }
    }
    db.salones = db.salones.filter((s) => s.id !== id)
    persistir()
    await latencia(null)
  },
}
