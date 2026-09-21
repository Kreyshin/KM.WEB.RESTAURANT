import { beforeEach, describe, expect, it } from 'vitest'
import { auditoriaService } from './auditoria.service'
import { integracionService } from './integracion.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService, origenPermiso, tienePermiso } from './parametros.service'
import { duracionMin, turnosDelErp, turnosService } from './personal.service'
import { preciosService } from './precios.service'

/**
 * Reglas de F5: permisos por rol con excepciones por persona, turnos sin
 * cruces y bitácora de lo que se toca.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'
const COCINERO = 'u5'

describe('permisos', () => {
  it('el administrador puede todo y su rol no se edita', async () => {
    expect(tienePermiso(ADMIN, 'personal.permisos')).toBe(true)
    expect(origenPermiso(ADMIN, 'inventario.ajustar')).toBe('admin')
    await expect(parametrosService.guardarPermisosDeRol('admin', [], ADMIN)).rejects.toBeTruthy()
  })

  it('el permiso sale del rol y la excepción de la persona manda encima', async () => {
    // La semilla le concede aprobar recetas a Marco, que es cocinero.
    expect(tienePermiso(COCINERO, 'recetas.aprobar')).toBe(true)
    expect(origenPermiso(COCINERO, 'recetas.aprobar')).toBe('concedido')
    expect(tienePermiso(COCINERO, 'produccion.registrar')).toBe(true)

    await parametrosService.fijarExcepcion(COCINERO, 'produccion.registrar', false, ADMIN)
    expect(tienePermiso(COCINERO, 'produccion.registrar')).toBe(false)
    expect(origenPermiso(COCINERO, 'produccion.registrar')).toBe('quitado')

    await parametrosService.fijarExcepcion(COCINERO, 'produccion.registrar', undefined, ADMIN)
    expect(origenPermiso(COCINERO, 'produccion.registrar')).toBe('rol')
  })

  it('cambiar permisos exige el permiso de asignarlos', async () => {
    await expect(
      parametrosService.guardarPermisosDeRol('cajero', ['carta.editar'], COCINERO),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('permiso') })
    await parametrosService.guardarPermisosDeRol('cajero', ['carta.editar'], ADMIN)
    expect(await parametrosService.permisosDeRol('cajero')).toEqual(['carta.editar'])
  })

  it('el administrador no acepta excepciones', async () => {
    await expect(
      parametrosService.fijarExcepcion(ADMIN, 'carta.editar', false, ADMIN),
    ).rejects.toBeTruthy()
  })
})

describe('turnos', () => {
  const turno = {
    nombre: 'Tarde',
    localId: 'l1',
    desde: '14:00',
    hasta: '22:00',
    dias: [0, 1] as const,
    usuarioIds: ['u2'],
    activo: true,
  }

  it('cuenta las horas aunque el turno cruce medianoche', () => {
    expect(duracionMin({ desde: '18:00', hasta: '00:30' })).toBe(390)
    expect(duracionMin({ desde: '11:00', hasta: '18:00' })).toBe(420)
  })

  it('una persona no puede estar en dos turnos que se cruzan el mismo día', async () => {
    await expect(
      turnosService.crear({ ...turno, dias: [...turno.dias] }, ADMIN),
    ).rejects.toMatchObject({ campos: { usuarioIds: 'Turnos cruzados' } })
    // Fuera del horario de «Mañana» sí entra.
    await expect(
      turnosService.crear(
        { ...turno, nombre: 'Madrugada', desde: '00:00', hasta: '08:00', dias: [0, 1] },
        ADMIN,
      ),
    ).resolves.toBeTruthy()
  })

  it('no admite dos turnos con el mismo nombre en el local ni horario vacío', async () => {
    await expect(
      turnosService.crear({ ...turno, nombre: 'Mañana', usuarioIds: [], dias: [6] }, ADMIN),
    ).rejects.toMatchObject({ campos: { nombre: 'Nombre duplicado' } })
    await expect(
      turnosService.crear(
        { ...turno, nombre: 'Vacío', desde: '10:00', hasta: '10:00', usuarioIds: [], dias: [6] },
        ADMIN,
      ),
    ).rejects.toMatchObject({ campos: { horario: 'Horario vacío' } })
  })

  it('con la asistencia delegada al ERP los turnos no se editan aquí', async () => {
    await integracionService.cambiarModo('asistencia', 'delegado', 'Piloto con el ERP')
    expect(turnosDelErp('l1')).toBe(true)
    await expect(
      turnosService.crear({ ...turno, nombre: 'Otro', usuarioIds: [], dias: [6] }, ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('ERP') })
  })

  it('dice quién debería estar a una hora dada', async () => {
    // Miércoles al mediodía: el turno de mañana (lunes a viernes, 11:00–18:00).
    const miercoles = new Date('2026-09-16T12:30:00')
    const enTurno = await turnosService.enTurno('l1', miercoles)
    expect(enTurno.map((e) => e.turno.nombre)).toEqual(['Mañana'])
    expect(enTurno[0]!.personas).toHaveLength(2)
  })
})

describe('bitácora', () => {
  it('anota los cambios de permisos, turnos, modo de integración y precios', async () => {
    await parametrosService.guardarPermisosDeRol('mesero', ['carta.editar'], ADMIN)
    await integracionService.cambiarModo('precios', 'sincronizado', 'Piloto de precios')
    const { id, ...lista } = db.listasPrecios[0]!
    await preciosService.actualizar(id, { ...lista, nombre: 'Carta Miraflores 2' })

    const todos = await auditoriaService.listar()
    expect(todos.map((r) => r.modulo)).toEqual(
      expect.arrayContaining(['Permisos', 'Integración', 'Precios']),
    )
    // Lo más reciente primero.
    expect(todos[0]!.fecha >= todos[1]!.fecha).toBe(true)

    const soloPermisos = await auditoriaService.listar({ modulo: 'Permisos' })
    expect(soloPermisos.every((r) => r.modulo === 'Permisos')).toBe(true)
    expect(await auditoriaService.listar({ buscar: 'Piloto de precios' })).toHaveLength(1)
  })

  it('filtra por persona y por local', async () => {
    await turnosService.crear(
      {
        nombre: 'Extra',
        localId: 'l2',
        desde: '09:00',
        hasta: '12:00',
        dias: [6],
        usuarioIds: [],
        activo: true,
      },
      ADMIN,
    )
    expect(await auditoriaService.listar({ usuarioId: ADMIN, localId: 'l2' })).toHaveLength(1)
  })
})
