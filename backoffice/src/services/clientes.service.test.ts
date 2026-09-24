import { beforeEach, describe, expect, it } from 'vitest'
import { auditoriaService } from './auditoria.service'
import { clientesService, reservasService } from './clientes.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'

/**
 * Reglas de F6.1: la ficha de sala es de la vertical y las reservas no pisan
 * una mesa ya apartada ni pasan el cupo del local.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'
const hoy = new Date().toISOString().slice(0, 10)
const dia = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10)

const base = {
  localId: 'l1',
  nombreContacto: 'Prueba',
  telefono: '999 000 111',
  personas: 2,
  fecha: hoy,
  hora: '17:00',
  duracionMin: 90,
  mesaIds: ['m3'],
  canal: 'telefono' as const,
}

describe('ficha de sala', () => {
  it('guarda alergias, etiquetas y notas sobre el cliente del ERP', async () => {
    const ficha = await clientesService.guardarFicha('cl3', {
      alergenos: ['gluten', 'gluten'],
      etiquetas: ['Frecuente', ' ', 'Frecuente'],
      notas: '  Siempre pide mesa alta  ',
      salonPreferidoId: 's1',
    })
    expect(ficha.alergenos).toEqual(['gluten'])
    expect(ficha.etiquetas).toEqual(['Frecuente'])
    expect(ficha.notas).toBe('Siempre pide mesa alta')
    // El cliente del ERP no se toca.
    expect(db.clientes.find((c) => c.id === 'cl3')).not.toHaveProperty('alergenos')
  })

  it('rechaza un cliente o un salón que no existen', async () => {
    await expect(
      clientesService.guardarFicha('no-existe', { alergenos: [], etiquetas: [] }),
    ).rejects.toBeTruthy()
    await expect(
      clientesService.guardarFicha('cl3', {
        alergenos: [],
        etiquetas: [],
        salonPreferidoId: 'no-existe',
      }),
    ).rejects.toMatchObject({ campos: { salonPreferidoId: expect.any(String) } })
  })
})

describe('reservas', () => {
  it('crea la reserva pendiente y la confirma automáticamente si el local lo pide', async () => {
    const r = await reservasService.crear(base, ADMIN)
    expect(r.estado).toBe('pendiente')
    await parametrosService.guardarValor('reservas.confirmarAutomatico', true, 'l1')
    const r2 = await reservasService.crear({ ...base, hora: '19:00' }, ADMIN)
    expect(r2.estado).toBe('confirmada')
  })

  it('no reserva la misma mesa a una hora que se cruza', async () => {
    await reservasService.crear(base, ADMIN)
    await expect(reservasService.crear({ ...base, hora: '18:00' }, ADMIN)).rejects.toMatchObject({
      campos: { mesaIds: 'Mesa ocupada' },
    })
    // Después de que termina, la misma mesa vuelve a estar libre.
    await expect(reservasService.crear({ ...base, hora: '18:30' }, ADMIN)).resolves.toBeTruthy()
  })

  it('exige que las mesas alcancen para las personas', async () => {
    await expect(
      reservasService.crear({ ...base, personas: 6, mesaIds: ['m3'] }, ADMIN),
    ).rejects.toMatchObject({ campos: { mesaIds: 'Capacidad insuficiente' } })
  })

  it('respeta el cupo de personas por franja del local', async () => {
    await parametrosService.guardarValor('reservas.cupoPorFranja', 10, 'l1')
    // A las 13:00 ya hay 4 personas en la semilla.
    await expect(
      reservasService.crear({ ...base, hora: '13:00', personas: 2, mesaIds: ['m3'] }, ADMIN),
    ).resolves.toBeTruthy()
    await expect(
      reservasService.crear({ ...base, hora: '13:15', personas: 6, mesaIds: ['m1', 'm2'] }, ADMIN),
    ).rejects.toMatchObject({ campos: { personas: 'Cupo lleno' } })
  })

  it('no reserva en el pasado ni más allá de la anticipación máxima', async () => {
    await expect(reservasService.crear({ ...base, fecha: dia(-1) }, ADMIN)).rejects.toMatchObject({
      campos: { fecha: 'Fecha pasada' },
    })
    await parametrosService.guardarValor('reservas.anticipacionMaxDias', 7, 'l1')
    await expect(reservasService.crear({ ...base, fecha: dia(30) }, ADMIN)).rejects.toMatchObject({
      campos: { fecha: 'Demasiada anticipación' },
    })
  })

  it('rechaza mesas que no existen o están inactivas', async () => {
    await expect(
      reservasService.crear({ ...base, mesaIds: ['no-existe'] }, ADMIN),
    ).rejects.toMatchObject({ campos: { mesaIds: expect.any(String) } })
    const mesa = db.mesas.find((m) => m.id === 'm3')!
    mesa.estado = 'inactiva'
    await expect(reservasService.crear(base, ADMIN)).rejects.toMatchObject({
      campos: { mesaIds: 'Mesa inactiva' },
    })
  })

  it('sentar ocupa la mesa y cancelar exige motivo y queda en la bitácora', async () => {
    const r = await reservasService.crear(base, ADMIN)
    await expect(reservasService.cambiarEstado(r.id, 'cancelada', ADMIN)).rejects.toMatchObject({
      campos: { motivo: 'Requerido' },
    })
    const sentada = await reservasService.cambiarEstado(r.id, 'sentada', ADMIN)
    expect(sentada.estado).toBe('sentada')
    expect(db.mesas.find((m) => m.id === 'm3')!.estado).toBe('ocupada')
    // Una reserva sentada ya no cambia.
    await expect(
      reservasService.cambiarEstado(r.id, 'cancelada', ADMIN, 'tarde'),
    ).rejects.toBeTruthy()

    const otra = await reservasService.crear({ ...base, hora: '21:00', mesaIds: ['m4'] }, ADMIN)
    await reservasService.cambiarEstado(otra.id, 'noShow', ADMIN, 'No contestó el teléfono')
    const bitacora = await auditoriaService.listar({ modulo: 'Reservas' })
    expect(bitacora[0]!.detalle).toContain('No contestó el teléfono')
  })

  it('gestionar reservas exige el permiso', async () => {
    const mesero = db.usuarios.find((u) => u.rol === 'mesero')!
    await expect(reservasService.crear(base, mesero.id)).rejects.toMatchObject({
      mensaje: expect.stringContaining('permiso'),
    })
  })

  it('la agenda del día resume personas y pendientes', async () => {
    const agenda = await reservasService.agenda('l1', hoy)
    expect(agenda.reservas).toHaveLength(2)
    expect(agenda.personas).toBe(12)
    expect(agenda.pendientes).toBe(1)
  })
})

/**
 * El reloj del servicio.
 *
 * Mover una reserva de mesa es el gesto del jefe de sala, y las dos cosas que
 * tiene que impedir son las que se descubren con la gente de pie: sentar a
 * seis en una mesa de cuatro, y poner dos grupos a la misma hora en el mismo
 * sitio.
 */
describe('mover una reserva de mesa', () => {
  it('mueve la reserva sin tocarle la hora', async () => {
    const reserva = await reservasService.crear(base, ADMIN)

    const movida = await reservasService.moverAMesa(reserva.id, ['m4'], ADMIN)

    expect(movida.mesaIds).toEqual(['m4'])
    expect(movida.hora).toBe(reserva.hora)
    expect(movida.duracionMin).toBe(reserva.duracionMin)
  })

  it('no sienta a más gente de la que cabe', async () => {
    const pequena = db.mesas.reduce((a, b) => (a.capacidad <= b.capacidad ? a : b))
    const reserva = await reservasService.crear(
      { ...base, personas: pequena.capacidad + 4, mesaIds: ['m4'] },
      ADMIN,
    )

    await expect(reservasService.moverAMesa(reserva.id, [pequena.id], ADMIN)).rejects.toMatchObject(
      { mensaje: expect.stringContaining('dan para') },
    )
  })

  it('no pone dos grupos a la vez en la misma mesa', async () => {
    const primera = await reservasService.crear({ ...base, mesaIds: ['m4'] }, ADMIN)
    const segunda = await reservasService.crear({ ...base, hora: '17:30', mesaIds: ['m3'] }, ADMIN)

    await expect(reservasService.moverAMesa(segunda.id, ['m4'], ADMIN)).rejects.toMatchObject({
      mensaje: expect.stringContaining(primera.nombreContacto),
    })
  })

  it('una reserva cancelada ya no se mueve', async () => {
    const reserva = await reservasService.crear(base, ADMIN)
    await reservasService.cambiarEstado(reserva.id, 'cancelada', ADMIN, 'Cambio de planes')

    await expect(reservasService.moverAMesa(reserva.id, ['m4'], ADMIN)).rejects.toMatchObject({
      mensaje: expect.stringContaining('ya no se mueve'),
    })
  })

  it('mover exige el mismo permiso que gestionar', async () => {
    const reserva = await reservasService.crear(base, ADMIN)
    const mesero = db.usuarios.find((u) => u.rol === 'mesero')!

    await expect(reservasService.moverAMesa(reserva.id, ['m4'], mesero.id)).rejects.toMatchObject({
      mensaje: expect.stringContaining('permiso'),
    })
  })
})
