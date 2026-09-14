import type { AlcanceParametro, DefinicionParametro, PermisoVertical, Rol, Usuario } from '@/types'
import { db, latencia } from './mock/db'

/**
 * Configuración propia de la vertical (D-006).
 *
 * - **Vertical:** afecta a todos los locales de la cadena.
 * - **Local:** afecta a un local; cada usuario solo ve los locales a los que
 *   tiene acceso (dato del ERP).
 * - **Permisos:** se asignan a los roles del ERP y se ajustan por usuario.
 *
 * Los catálogos de parámetros y permisos empiezan vacíos: cada fase añade sus
 * definiciones aquí y las pantallas las muestran sin cambios.
 */

const definiciones: DefinicionParametro[] = []
const permisos: PermisoVertical[] = []

export const etiquetaRol: Record<Rol, string> = {
  admin: 'Administrador',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
}

export const parametrosService = {
  async definiciones(alcance: AlcanceParametro): Promise<DefinicionParametro[]> {
    return latencia(definiciones.filter((d) => d.alcance === alcance))
  },

  async permisos(): Promise<PermisoVertical[]> {
    return latencia(permisos)
  },

  /** Roles que llegan del ERP, con cuántos usuarios tiene cada uno. */
  async roles(): Promise<{ rol: Rol; etiqueta: string; usuarios: number }[]> {
    const roles = Object.keys(etiquetaRol) as Rol[]
    return latencia(
      roles.map((rol) => ({
        rol,
        etiqueta: etiquetaRol[rol],
        usuarios: db.usuarios.filter((u) => u.rol === rol).length,
      })),
    )
  },

  async usuarios(): Promise<Usuario[]> {
    return latencia([...db.usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  },
}
