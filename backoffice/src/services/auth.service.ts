import type { Sesion } from '@/types'
import { db, latencia } from './mock/db'

export const authService = {
  /**
   * Mock: cualquier contraseña es válida para un email existente.
   * Reemplazar por `http.post<Sesion>('/auth/login', { email, password })`.
   */
  async login(email: string, _password: string): Promise<Sesion> {
    const usuario = db.usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    await latencia(null, 400)
    if (!usuario) {
      throw {
        mensaje: 'No existe una cuenta con ese correo.',
        campos: { email: 'Correo no registrado' },
      }
    }
    if (!usuario.activo) {
      throw { mensaje: 'La cuenta está desactivada. Contacta al administrador.' }
    }
    return { token: `mock.${usuario.id}.${Date.now()}`, usuario: structuredClone(usuario) }
  },

  async logout(): Promise<void> {
    await latencia(null, 100)
  },
}
