import { beforeEach, describe, expect, it } from 'vitest'
import { usuariosService } from './usuarios.service'
import { db, reiniciarMock } from './mock/db'

/**
 * La regla que de verdad importa aquí es que el sistema no pueda quedarse sin
 * administrador activo: si eso ocurre, nadie puede volver a entrar a los
 * maestros y el restaurante se queda bloqueado.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

/** Deja un único admin activo, que es donde la regla debe saltar. */
function dejarUnSoloAdmin() {
  db.usuarios = db.usuarios.filter((u) => u.rol !== 'admin' || u.id === 'u1')
}

describe('último administrador', () => {
  it('no permite degradar al único admin activo', async () => {
    dejarUnSoloAdmin()
    await expect(usuariosService.actualizar('u1', { rol: 'mesero' })).rejects.toMatchObject({
      mensaje: expect.stringContaining('administrador'),
    })
    expect(db.usuarios.find((u) => u.id === 'u1')!.rol).toBe('admin')
  })

  it('no permite desactivar al único admin activo', async () => {
    dejarUnSoloAdmin()
    await expect(usuariosService.actualizar('u1', { activo: false })).rejects.toBeTruthy()
    expect(db.usuarios.find((u) => u.id === 'u1')!.activo).toBe(true)
  })

  it('no permite eliminar al único admin activo', async () => {
    dejarUnSoloAdmin()
    await expect(usuariosService.eliminar('u1')).rejects.toBeTruthy()
    expect(db.usuarios.some((u) => u.id === 'u1')).toBe(true)
  })

  it('sí permite degradarlo cuando hay otro admin activo', async () => {
    await usuariosService.crear({
      nombre: 'Segundo Admin',
      email: 'admin2@kmrestaurante.pe',
      rol: 'admin',
      activo: true,
    })
    await usuariosService.actualizar('u1', { rol: 'mesero' })
    expect(db.usuarios.find((u) => u.id === 'u1')!.rol).toBe('mesero')
  })

  it('permite editar otros campos del único admin sin bloquearlo', async () => {
    dejarUnSoloAdmin()
    const actualizado = await usuariosService.actualizar('u1', { nombre: 'Brandon R.' })
    expect(actualizado.nombre).toBe('Brandon R.')
  })
})

describe('validación de correo', () => {
  it('rechaza un correo con formato inválido', async () => {
    await expect(
      usuariosService.crear({ nombre: 'X', email: 'sin-arroba', rol: 'mesero', activo: true }),
    ).rejects.toMatchObject({ campos: { email: expect.any(String) } })
  })

  it('rechaza un correo ya registrado, sin importar mayúsculas', async () => {
    await expect(
      usuariosService.crear({
        nombre: 'Otro',
        email: 'ADMIN@kmrestaurante.pe',
        rol: 'mesero',
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { email: expect.any(String) } })
  })

  it('normaliza el correo a minúsculas al crear', async () => {
    const usuario = await usuariosService.crear({
      nombre: 'Nueva Mesera',
      email: '  Nueva@KmRestaurante.PE  ',
      rol: 'mesero',
      activo: true,
    })
    expect(usuario.email).toBe('nueva@kmrestaurante.pe')
  })
})

describe('integridad con el resto del sistema', () => {
  it('no deja eliminar a un mesero con mesas asignadas', async () => {
    // En la semilla, u2 tiene las mesas M-01 y M-06.
    await expect(usuariosService.eliminar('u2')).rejects.toMatchObject({
      mensaje: expect.stringContaining('mesas'),
    })
  })

  it('listarMeseros devuelve solo meseros activos', async () => {
    const meseros = await usuariosService.listarMeseros()
    expect(meseros.length).toBeGreaterThan(0)
    expect(meseros.every((m) => m.rol === 'mesero' && m.activo)).toBe(true)
  })
})
