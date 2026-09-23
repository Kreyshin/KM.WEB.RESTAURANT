import type { AccesoZona, NivelAcceso } from '@/types'
import { db, latencia, persistir } from './mock/db'

/**
 * Accesos de la vertical (D-008, D-009).
 *
 * - **Almacén:** el ERP da a cada usuario nivel ver o gestionar sobre el almacén del local.
 * - **Zona:** la vertical puede restringir ese nivel por zona (el bartender solo
 *   gestiona la barra). Nunca lo amplía más allá de lo que da el ERP.
 * - **Cadena:** quién configura cada cadena. Sin registros, los administradores.
 */

const orden: Record<NivelAcceso | 'ninguno', number> = { ninguno: 0, ver: 1, gestionar: 2 }

/** Nivel que el ERP da sobre un almacén. Sin lista de accesos: gestionar. */
export function nivelAlmacen(usuarioId: string | undefined, almacenId: string): NivelAcceso | null {
  const usuario = db.usuarios.find((u) => u.id === usuarioId)
  if (!usuario) return null
  if (!usuario.almacenes) return 'gestionar'
  return usuario.almacenes.find((a) => a.almacenId === almacenId)?.nivel ?? null
}

/** Nivel efectivo sobre una zona: el del almacén, recortado por la restricción de la vertical. */
export function nivelZona(usuarioId: string | undefined, zonaId: string): NivelAcceso | null {
  const zona = db.zonas.find((z) => z.id === zonaId)
  if (!zona) return null
  const erp = nivelAlmacen(usuarioId, zona.almacenId)
  if (!erp) return null
  const restriccion = db.accesosZona.find((a) => a.usuarioId === usuarioId && a.zonaId === zonaId)
  if (!restriccion) return erp
  const efectivo = orden[restriccion.nivel] < orden[erp] ? restriccion.nivel : erp
  return efectivo === 'ninguno' ? null : efectivo
}

export function puedeConfigurarCadena(usuarioId: string | undefined, cadenaId: string) {
  const usuario = db.usuarios.find((u) => u.id === usuarioId)
  if (!usuario) return false
  const asignados = db.accesosCadena.filter((a) => a.cadenaId === cadenaId)
  if (asignados.length === 0) return usuario.rol === 'admin'
  return asignados.some((a) => a.usuarioId === usuarioId)
}

export const accesosService = {
  async restriccionesZona(zonaId?: string): Promise<AccesoZona[]> {
    return latencia(db.accesosZona.filter((a) => !zonaId || a.zonaId === zonaId))
  },

  /** `undefined` quita la restricción: la zona vuelve a heredar el nivel del almacén. */
  async restringirZona(usuarioId: string, zonaId: string, nivel: AccesoZona['nivel'] | undefined) {
    db.accesosZona = db.accesosZona.filter(
      (a) => !(a.usuarioId === usuarioId && a.zonaId === zonaId),
    )
    if (nivel) db.accesosZona.push({ usuarioId, zonaId, nivel })
    persistir()
    await latencia(null)
  },
}
