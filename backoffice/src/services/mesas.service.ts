import type { EstadoMesa, Mesa, NuevaMesa } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'

export const mesasService = {
  async listar(salonId?: string): Promise<Mesa[]> {
    const mesas = salonId ? db.mesas.filter((m) => m.salonId === salonId) : db.mesas
    return latencia([...mesas].sort((a, b) => a.codigo.localeCompare(b.codigo)))
  },

  async crear(datos: NuevaMesa): Promise<Mesa> {
    const codigo = datos.codigo.trim().toUpperCase()
    if (db.mesas.some((m) => m.salonId === datos.salonId && m.codigo === codigo)) {
      throw {
        mensaje: 'Ya existe una mesa con ese código en el salón.',
        campos: { codigo: 'Código duplicado' },
      }
    }
    const mesa: Mesa = { ...datos, codigo, id: nuevoId('m') }
    db.mesas.push(mesa)
    persistir()
    return latencia(mesa)
  },

  async actualizar(id: string, datos: Partial<NuevaMesa>): Promise<Mesa> {
    const mesa = db.mesas.find((m) => m.id === id)
    if (!mesa) throw { mensaje: 'Mesa no encontrada.' }
    const codigo = datos.codigo?.trim().toUpperCase()
    if (
      codigo &&
      db.mesas.some(
        (m) => m.id !== id && m.salonId === (datos.salonId ?? mesa.salonId) && m.codigo === codigo,
      )
    ) {
      throw {
        mensaje: 'Ya existe una mesa con ese código en el salón.',
        campos: { codigo: 'Código duplicado' },
      }
    }
    Object.assign(mesa, datos, codigo ? { codigo } : {})
    persistir()
    return latencia(mesa)
  },

  /** Cambio de estado rápido desde el plano del salón. */
  async cambiarEstado(id: string, estado: EstadoMesa): Promise<Mesa> {
    const mesa = db.mesas.find((m) => m.id === id)
    if (!mesa) throw { mensaje: 'Mesa no encontrada.' }
    mesa.estado = estado
    // Al liberar una mesa se suelta también al mesero asignado.
    if (estado === 'libre') delete mesa.meseroId
    persistir()
    return latencia(mesa, 80)
  },

  /** Reposiciona la mesa en el plano (coordenadas en % del contenedor). */
  async mover(id: string, posX: number, posY: number): Promise<Mesa> {
    const mesa = db.mesas.find((m) => m.id === id)
    if (!mesa) throw { mensaje: 'Mesa no encontrada.' }
    mesa.posX = Math.min(100, Math.max(0, posX))
    mesa.posY = Math.min(100, Math.max(0, posY))
    persistir()
    return latencia(mesa, 0)
  },

  async eliminar(id: string): Promise<void> {
    const mesa = db.mesas.find((m) => m.id === id)
    if (mesa && mesa.estado === 'ocupada') {
      throw { mensaje: 'No se puede eliminar una mesa ocupada. Libérala primero.' }
    }
    db.mesas = db.mesas.filter((m) => m.id !== id)
    persistir()
    await latencia(null)
  },
}
