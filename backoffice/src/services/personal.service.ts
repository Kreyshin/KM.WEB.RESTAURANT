import type { DiaSemana, NuevoTurno, Turno, Usuario } from '@/types'
import { registrar } from './auditoria.service'
import { modoIntegracion } from './integracion.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso } from './parametros.service'

/**
 * Turnos del local (F5). La vertical organiza quién debería estar en cada
 * franja; las marcaciones son de la capacidad «asistencia» (D-009): con el ERP
 * delegado, los turnos se consultan y no se editan aquí.
 */

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/** Minutos de duración, contando el turno que cruza medianoche. */
export function duracionMin(turno: Pick<Turno, 'desde' | 'hasta'>) {
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3))
  const d = min(turno.desde)
  const h = min(turno.hasta)
  return h > d ? h - d : 24 * 60 - d + h
}

function seCruzan(a: Pick<Turno, 'desde' | 'hasta'>, b: Pick<Turno, 'desde' | 'hasta'>) {
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3))
  const tramos = (t: Pick<Turno, 'desde' | 'hasta'>) =>
    min(t.hasta) > min(t.desde)
      ? [[min(t.desde), min(t.hasta)]]
      : [
          [min(t.desde), 24 * 60],
          [0, min(t.hasta)],
        ]
  return tramos(a).some(([ai, af]) => tramos(b).some(([bi, bf]) => ai! < bf! && bi! < af!))
}

/** ¿La edición de turnos es de la vertical o la manda el ERP? */
export const turnosDelErp = (localId?: string) =>
  modoIntegracion('asistencia', localId) === 'delegado'

function validar(datos: NuevoTurno, id?: string) {
  if (!datos.nombre?.trim()) throw errorCampo('nombre', 'Ponle un nombre al turno.', 'Requerido')
  if (!db.locales.some((l) => l.id === datos.localId))
    throw errorCampo('localId', 'Elige el local del turno.', 'Requerido')
  if (!HORA.test(datos.desde) || !HORA.test(datos.hasta))
    throw errorCampo('horario', 'Indica la hora de inicio y de fin.', 'Requerido')
  if (datos.desde === datos.hasta)
    throw errorCampo('horario', 'El inicio y el fin no pueden ser la misma hora.', 'Horario vacío')
  if (!datos.dias.length) throw errorCampo('dias', 'Elige al menos un día.', 'Requerido')
  if (
    db.turnos.some(
      (t) =>
        t.id !== id &&
        t.localId === datos.localId &&
        t.nombre.trim().toLowerCase() === datos.nombre.trim().toLowerCase(),
    )
  )
    throw errorCampo('nombre', 'Ya hay un turno con ese nombre en el local.', 'Nombre duplicado')

  for (const usuarioId of datos.usuarioIds) {
    const usuario = db.usuarios.find((u) => u.id === usuarioId)
    if (!usuario) throw errorCampo('usuarioIds', 'Hay una persona que ya no existe.')
    if (usuario.localIds?.length && !usuario.localIds.includes(datos.localId))
      throw errorCampo(
        'usuarioIds',
        `${usuario.nombre} no tiene acceso a este local.`,
        'Sin acceso al local',
      )
    const choque = db.turnos.find(
      (t) =>
        t.id !== id &&
        t.activo &&
        t.usuarioIds.includes(usuarioId) &&
        t.dias.some((d) => datos.dias.includes(d)) &&
        seCruzan(t, datos),
    )
    if (choque && datos.activo)
      throw errorCampo(
        'usuarioIds',
        `${usuario.nombre} ya está en «${choque.nombre}» a esa hora.`,
        'Turnos cruzados',
      )
  }
}

function exigirEdicion(usuarioId: string, localId: string) {
  if (!tienePermiso(usuarioId, 'personal.turnos'))
    throw { mensaje: 'No tienes permiso para gestionar turnos.' }
  if (turnosDelErp(localId))
    throw { mensaje: 'La asistencia de este local la maneja el ERP: los turnos se consultan aquí.' }
}

function normalizar(datos: NuevoTurno): NuevoTurno {
  return {
    ...clonar(datos),
    nombre: datos.nombre.trim(),
    dias: [...new Set(datos.dias)].sort() as DiaSemana[],
    usuarioIds: [...new Set(datos.usuarioIds)],
  }
}

const texto = (t: NuevoTurno) =>
  `${t.nombre} · ${t.desde}–${t.hasta} · ${t.usuarioIds.length} persona(s)`

export const turnosService = {
  async todos(): Promise<Turno[]> {
    return latencia(clonar(db.turnos))
  },

  /** Turnos de una persona, para su ficha y para saber si le toca hoy. */
  async delUsuario(usuarioId: string): Promise<Turno[]> {
    return latencia(clonar(db.turnos.filter((t) => t.usuarioIds.includes(usuarioId))))
  },

  async crear(datos: NuevoTurno, usuarioId: string): Promise<Turno> {
    exigirEdicion(usuarioId, datos.localId)
    const n = normalizar(datos)
    validar(n)
    const turno: Turno = { ...n, id: nuevoId('tu') }
    db.turnos.push(turno)
    registrar({
      usuarioId,
      localId: turno.localId,
      modulo: 'Turnos',
      accion: 'Turno creado',
      detalle: texto(turno),
    })
    persistir()
    return latencia(clonar(turno))
  },

  async actualizar(id: string, datos: NuevoTurno, usuarioId: string): Promise<Turno> {
    const i = db.turnos.findIndex((t) => t.id === id)
    if (i < 0) throw { mensaje: 'Turno no encontrado.' }
    exigirEdicion(usuarioId, datos.localId)
    const n = normalizar(datos)
    validar(n, id)
    db.turnos[i] = { ...n, id }
    registrar({
      usuarioId,
      localId: n.localId,
      modulo: 'Turnos',
      accion: 'Turno actualizado',
      detalle: texto(n),
    })
    persistir()
    return latencia(clonar(db.turnos[i]!))
  },

  async eliminar(id: string, usuarioId: string): Promise<void> {
    const turno = db.turnos.find((t) => t.id === id)
    if (!turno) throw { mensaje: 'Turno no encontrado.' }
    exigirEdicion(usuarioId, turno.localId)
    db.turnos = db.turnos.filter((t) => t.id !== id)
    registrar({
      usuarioId,
      localId: turno.localId,
      modulo: 'Turnos',
      accion: 'Turno eliminado',
      detalle: texto(turno),
    })
    persistir()
    await latencia(null)
  },

  /** Quién debería estar en el local a esta hora, según sus turnos. */
  async enTurno(
    localId: string,
    fecha = new Date(),
  ): Promise<{ turno: Turno; personas: Usuario[] }[]> {
    const dia = ((fecha.getDay() + 6) % 7) as DiaSemana
    const ahora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`
    return latencia(
      db.turnos
        .filter(
          (t) =>
            t.activo &&
            t.localId === localId &&
            t.dias.includes(dia) &&
            // El turno que cruza medianoche cubre desde su inicio hasta el fin del día.
            (t.hasta > t.desde
              ? ahora >= t.desde && ahora < t.hasta
              : ahora >= t.desde || ahora < t.hasta),
        )
        .map((t) => ({
          turno: clonar(t),
          personas: t.usuarioIds
            .map((id) => db.usuarios.find((u) => u.id === id))
            .filter((u): u is Usuario => !!u),
        })),
    )
  },
}
