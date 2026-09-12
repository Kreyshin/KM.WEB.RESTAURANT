import type { NuevoUsuario, Usuario } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const usuariosService = {
  async listar(): Promise<Usuario[]> {
    return latencia([...db.usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  },

  /** Meseros activos, para el selector de asignación de mesa. */
  async listarMeseros(): Promise<Usuario[]> {
    return latencia(db.usuarios.filter((u) => u.rol === 'mesero' && u.activo))
  },

  async crear(datos: NuevoUsuario): Promise<Usuario> {
    const email = datos.email.trim().toLowerCase()
    if (!CORREO.test(email)) {
      throw { mensaje: 'El correo no es válido.', campos: { email: 'Formato incorrecto' } }
    }
    if (db.usuarios.some((u) => u.email.toLowerCase() === email)) {
      throw {
        mensaje: 'Ya existe un usuario con ese correo.',
        campos: { email: 'Correo duplicado' },
      }
    }
    const usuario: Usuario = { ...datos, nombre: datos.nombre.trim(), email, id: nuevoId('u') }
    db.usuarios.push(usuario)
    persistir()
    return latencia(usuario)
  },

  async actualizar(id: string, datos: Partial<NuevoUsuario>): Promise<Usuario> {
    const usuario = db.usuarios.find((u) => u.id === id)
    if (!usuario) throw { mensaje: 'Usuario no encontrado.' }

    const email = datos.email?.trim().toLowerCase()
    if (email) {
      if (!CORREO.test(email)) {
        throw { mensaje: 'El correo no es válido.', campos: { email: 'Formato incorrecto' } }
      }
      if (db.usuarios.some((u) => u.id !== id && u.email.toLowerCase() === email)) {
        throw {
          mensaje: 'Ya existe un usuario con ese correo.',
          campos: { email: 'Correo duplicado' },
        }
      }
    }

    // Dejar el sistema sin ningún administrador activo lo vuelve inadministrable.
    const dejaDeSerAdminActivo =
      usuario.rol === 'admin' &&
      usuario.activo &&
      ((datos.rol !== undefined && datos.rol !== 'admin') || datos.activo === false)

    if (dejaDeSerAdminActivo && contarAdminsActivos() <= 1) {
      throw { mensaje: 'Debe quedar al menos un administrador activo.' }
    }

    Object.assign(
      usuario,
      datos,
      datos.nombre ? { nombre: datos.nombre.trim() } : {},
      email ? { email } : {},
    )
    persistir()
    return latencia(usuario)
  },

  async eliminar(id: string): Promise<void> {
    const usuario = db.usuarios.find((u) => u.id === id)
    if (!usuario) throw { mensaje: 'Usuario no encontrado.' }

    if (usuario.rol === 'admin' && usuario.activo && contarAdminsActivos() <= 1) {
      throw { mensaje: 'Debe quedar al menos un administrador activo.' }
    }
    if (db.mesas.some((m) => m.meseroId === id)) {
      throw { mensaje: 'No se puede eliminar: el usuario tiene mesas asignadas.' }
    }

    db.usuarios = db.usuarios.filter((u) => u.id !== id)
    persistir()
    await latencia(null)
  },

  /**
   * Mock: el backend real enviará un correo con enlace de restablecimiento.
   * Aquí solo confirma que el usuario existe.
   */
  async restablecerContrasena(id: string): Promise<void> {
    if (!db.usuarios.some((u) => u.id === id)) throw { mensaje: 'Usuario no encontrado.' }
    await latencia(null, 400)
  },
}

function contarAdminsActivos() {
  return db.usuarios.filter((u) => u.rol === 'admin' && u.activo).length
}
