import type { ModuloAuditoria, RegistroAuditoria } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'

/**
 * Bitácora de acciones sensibles (F5): quién cambió un permiso, un modo de
 * integración, un precio o una receta. Solo se escribe: no se edita ni se
 * borra, porque su valor es poder reconstruir qué pasó.
 */

export interface NuevoRegistro {
  modulo: ModuloAuditoria
  accion: string
  detalle: string
  usuarioId?: string
  localId?: string
  /** Cuando la acción no la hace una persona del ERP (la consola de Karma). */
  autor?: string
}

/** Anota una acción. Se llama desde los servicios, no desde las pantallas. */
export function registrar(datos: NuevoRegistro): RegistroAuditoria {
  const registro: RegistroAuditoria = {
    id: nuevoId('au'),
    fecha: new Date().toISOString(),
    usuarioId: datos.usuarioId,
    autor: datos.autor ?? db.usuarios.find((u) => u.id === datos.usuarioId)?.nombre ?? 'Sistema',
    modulo: datos.modulo,
    accion: datos.accion,
    detalle: datos.detalle,
    localId: datos.localId,
  }
  db.bitacora.push(registro)
  persistir()
  return registro
}

export interface FiltroBitacora {
  modulo?: ModuloAuditoria
  usuarioId?: string
  localId?: string
  /** AAAA-MM-DD, ambos incluidos. */
  desde?: string
  hasta?: string
  buscar?: string
}

export const auditoriaService = {
  /** De lo más reciente a lo más antiguo. */
  async listar(filtro: FiltroBitacora = {}): Promise<RegistroAuditoria[]> {
    const texto = filtro.buscar?.trim().toLowerCase()
    return latencia(
      [...db.bitacora]
        .filter((r) => {
          const dia = r.fecha.slice(0, 10)
          if (filtro.modulo && r.modulo !== filtro.modulo) return false
          if (filtro.usuarioId && r.usuarioId !== filtro.usuarioId) return false
          if (filtro.localId && r.localId !== filtro.localId) return false
          if (filtro.desde && dia < filtro.desde) return false
          if (filtro.hasta && dia > filtro.hasta) return false
          if (texto && !`${r.accion} ${r.detalle} ${r.autor}`.toLowerCase().includes(texto))
            return false
          return true
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    )
  },
}
