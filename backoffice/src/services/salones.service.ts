import type { NuevoSalon, Salon } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'

export const salonesService = {
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
    if (db.salones.some((s) => s.nombre.toLowerCase() === datos.nombre.trim().toLowerCase())) {
      throw {
        mensaje: 'Ya existe un salón con ese nombre.',
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
        (s) => s.id !== id && s.nombre.toLowerCase() === datos.nombre!.trim().toLowerCase(),
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
    db.salones = db.salones.filter((s) => s.id !== id)
    persistir()
    await latencia(null)
  },
}
