import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import type { Rol, Usuario } from '@/types'

/**
 * La guarda del router es el único punto que impide que un mesero entre a
 * Salones o a Facturación. Si `puede()` se rompe, el fallo es silencioso y
 * grave, así que se prueba la matriz completa de rol contra ruta.
 */

function sesionDe(rol: Rol) {
  const auth = useAuthStore()
  const usuario: Usuario = {
    id: 'test',
    nombre: 'Usuario Prueba',
    email: 'test@kmrestaurante.pe',
    rol,
    activo: true,
  }
  auth.usuario = usuario
  auth.token = 'token-de-prueba'
  return auth
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('permisos por rol', () => {
  it('sin sesión no se puede nada, ni siquiera una ruta sin roles declarados', () => {
    const auth = useAuthStore()
    expect(auth.autenticado).toBe(false)
    expect(auth.puede()).toBe(false)
    expect(auth.puede(['admin'])).toBe(false)
  })

  it('una ruta sin roles declarados la ve cualquier usuario autenticado', () => {
    for (const rol of ['admin', 'cajero', 'mesero', 'cocinero'] as Rol[]) {
      setActivePinia(createPinia())
      expect(sesionDe(rol).puede()).toBe(true)
      expect(sesionDe(rol).puede([])).toBe(true)
    }
  })

  it('el admin entra a todo', () => {
    const auth = sesionDe('admin')
    expect(auth.puede(['admin'])).toBe(true)
    expect(auth.puede(['admin', 'cajero'])).toBe(true)
  })

  it('el mesero no entra a las rutas de administración', () => {
    const auth = sesionDe('mesero')
    expect(auth.puede(['admin'])).toBe(false)
    expect(auth.puede(['admin', 'cajero'])).toBe(false)
  })

  it('el cajero entra a caja y facturación, pero no a los maestros', () => {
    const auth = sesionDe('cajero')
    expect(auth.puede(['admin', 'cajero'])).toBe(true)
    expect(auth.puede(['admin'])).toBe(false)
  })

  it('al cerrar sesión se pierden todos los permisos', async () => {
    const auth = sesionDe('admin')
    await auth.logout()
    expect(auth.autenticado).toBe(false)
    expect(auth.puede(['admin'])).toBe(false)
  })
})

describe('restauración de sesión', () => {
  it('rehidrata la sesión guardada', () => {
    const sesion = {
      token: 'abc',
      usuario: { id: 'u1', nombre: 'Ana', email: 'ana@x.pe', rol: 'cajero', activo: true },
    }
    localStorage.setItem('km.restaurante.sesion', JSON.stringify(sesion))

    const auth = useAuthStore()
    auth.restaurar()

    expect(auth.autenticado).toBe(true)
    expect(auth.rol).toBe('cajero')
  })

  it('una sesión corrupta no deja la app en un estado a medias', () => {
    localStorage.setItem('km.restaurante.sesion', 'no-es-json')

    const auth = useAuthStore()
    auth.restaurar()

    expect(auth.autenticado).toBe(false)
    expect(localStorage.getItem('km.restaurante.sesion')).toBeNull()
  })
})
