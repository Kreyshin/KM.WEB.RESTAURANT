import type {
  Alergeno,
  Cliente,
  Consulta,
  EstadoReserva,
  FichaCliente,
  NuevaReserva,
  Paginado,
  Reserva,
  TipoDocumento,
} from '@/types'
import { registrar } from './auditoria.service'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso, valorConfig } from './parametros.service'

/**
 * Clientes y reservas (F6.1). El cliente es del ERP —ahí se factura— y la
 * vertical solo lo consulta; encima le pone su **ficha de sala** (alergias,
 * etiquetas, notas) y sus reservas, que sí son de la vertical.
 */

export const etiquetaTipoDocumento: Record<TipoDocumento, string> = {
  dni: 'DNI',
  ruc: 'RUC',
  ce: 'Carné de extranjería',
  pasaporte: 'Pasaporte',
}

export const etiquetaEstadoReserva: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  sentada: 'Sentada',
  noShow: 'No vino',
  cancelada: 'Cancelada',
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const hoy = () => new Date().toISOString().slice(0, 10)
const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3))

/** Una reserva cuenta mientras no se haya cancelado ni marcado como no vino. */
const vive = (r: Reserva) => r.estado !== 'cancelada' && r.estado !== 'noShow'

export const clientesService = {
  async consultar(consulta: Consulta = {}): Promise<Paginado<Cliente>> {
    return latencia(
      aplicarConsulta(db.clientes, consulta, ['nombre', 'documento', 'telefono', 'distrito']),
    )
  },

  async todos(): Promise<Cliente[]> {
    return latencia(clonar(db.clientes))
  },

  async fichas(): Promise<FichaCliente[]> {
    return latencia(clonar(db.fichasCliente))
  },

  /** La ficha de sala es de la vertical: se guarda aunque el cliente venga del ERP. */
  async guardarFicha(
    clienteId: string,
    datos: {
      alergenos: Alergeno[]
      etiquetas: string[]
      notas?: string
      salonPreferidoId?: string
    },
  ): Promise<FichaCliente> {
    if (!db.clientes.some((c) => c.id === clienteId)) throw { mensaje: 'Cliente no encontrado.' }
    if (datos.salonPreferidoId && !db.salones.some((s) => s.id === datos.salonPreferidoId))
      throw errorCampo('salonPreferidoId', 'Ese salón ya no existe.')
    const ficha: FichaCliente = {
      clienteId,
      alergenos: [...new Set(datos.alergenos)],
      etiquetas: [...new Set(datos.etiquetas.map((e) => e.trim()).filter(Boolean))],
      notas: datos.notas?.trim() || undefined,
      salonPreferidoId: datos.salonPreferidoId || undefined,
    }
    db.fichasCliente = [...db.fichasCliente.filter((f) => f.clienteId !== clienteId), ficha]
    persistir()
    return latencia(clonar(ficha))
  },
}

// ── Reservas ──

function validar(datos: NuevaReserva, id?: string) {
  if (!db.locales.some((l) => l.id === datos.localId))
    throw errorCampo('localId', 'Elige el local de la reserva.', 'Requerido')
  if (!datos.nombreContacto?.trim())
    throw errorCampo('nombreContacto', 'Indica a nombre de quién es.', 'Requerido')
  if (!(datos.personas > 0)) throw errorCampo('personas', 'Indica cuántas personas vienen.')
  if (!FECHA.test(datos.fecha ?? '')) throw errorCampo('fecha', 'Elige la fecha.', 'Requerido')
  if (!HORA.test(datos.hora ?? '')) throw errorCampo('hora', 'Indica la hora.', 'Requerido')
  if (!(datos.duracionMin > 0)) throw errorCampo('duracionMin', 'La duración debe ser mayor a 0.')
  if (datos.fecha < hoy()) throw errorCampo('fecha', 'No se reserva en el pasado.', 'Fecha pasada')

  const maxDias = valorConfig<number>('reservas.anticipacionMaxDias', datos.localId)
  if (maxDias > 0) {
    const limite = new Date(Date.now() + maxDias * 86_400_000).toISOString().slice(0, 10)
    if (datos.fecha > limite)
      throw errorCampo(
        'fecha',
        `Solo se reserva hasta ${maxDias} días antes.`,
        'Demasiada anticipación',
      )
  }

  if (datos.clienteId && !db.clientes.some((c) => c.id === datos.clienteId))
    throw errorCampo('clienteId', 'Ese cliente ya no existe.')

  if (!datos.mesaIds.length) throw errorCampo('mesaIds', 'Elige al menos una mesa.', 'Requerido')
  const mesas = datos.mesaIds.map((m) => db.mesas.find((x) => x.id === m))
  const salonesDelLocal = db.salones.filter((s) => s.localId === datos.localId).map((s) => s.id)
  for (const mesa of mesas) {
    if (!mesa) throw errorCampo('mesaIds', 'Hay una mesa que ya no existe.')
    if (!salonesDelLocal.includes(mesa.salonId))
      throw errorCampo('mesaIds', `La mesa ${mesa.codigo} no es de este local.`, 'Otro local')
    if (mesa.estado === 'inactiva')
      throw errorCampo('mesaIds', `La mesa ${mesa.codigo} está inactiva.`, 'Mesa inactiva')
  }
  const capacidad = mesas.reduce((s, m) => s + (m?.capacidad ?? 0), 0)
  if (capacidad < datos.personas)
    throw errorCampo(
      'mesaIds',
      `Las mesas elegidas alcanzan para ${capacidad} personas y vienen ${datos.personas}.`,
      'Capacidad insuficiente',
    )

  const inicio = minutos(datos.hora)
  const fin = inicio + datos.duracionMin
  const choque = db.reservas.find(
    (r) =>
      r.id !== id &&
      vive(r) &&
      r.fecha === datos.fecha &&
      r.mesaIds.some((m) => datos.mesaIds.includes(m)) &&
      inicio < minutos(r.hora) + r.duracionMin &&
      minutos(r.hora) < fin,
  )
  if (choque) {
    const mesa = db.mesas.find((m) => choque.mesaIds.some((x) => x === m.id))
    throw errorCampo(
      'mesaIds',
      `La mesa ${mesa?.codigo ?? ''} ya está reservada a las ${choque.hora} para ${choque.nombreContacto}.`,
      'Mesa ocupada',
    )
  }

  const cupo = valorConfig<number>('reservas.cupoPorFranja', datos.localId)
  if (cupo > 0) {
    const enFranja = db.reservas
      .filter(
        (r) =>
          r.id !== id &&
          vive(r) &&
          r.localId === datos.localId &&
          r.fecha === datos.fecha &&
          inicio < minutos(r.hora) + r.duracionMin &&
          minutos(r.hora) < fin,
      )
      .reduce((s, r) => s + r.personas, 0)
    if (enFranja + datos.personas > cupo)
      throw errorCampo(
        'personas',
        `A esa hora ya hay ${enFranja} personas reservadas y el cupo del local es ${cupo}.`,
        'Cupo lleno',
      )
  }
}

function exigirGestion(usuarioId: string) {
  if (!tienePermiso(usuarioId, 'reservas.gestionar'))
    throw { mensaje: 'No tienes permiso para gestionar reservas.' }
}

/** Marca las mesas de la reserva según su estado, solo si la reserva es de hoy. */
function reflejarEnMesas(reserva: Reserva) {
  if (reserva.fecha !== hoy()) return
  for (const mesa of db.mesas.filter((m) => reserva.mesaIds.includes(m.id))) {
    if (reserva.estado === 'sentada' && mesa.estado !== 'inactiva') mesa.estado = 'ocupada'
    else if (reserva.estado === 'confirmada' && mesa.estado === 'libre') mesa.estado = 'reservada'
    else if (!vive(reserva) && mesa.estado === 'reservada') mesa.estado = 'libre'
  }
}

const siguientes: Record<EstadoReserva, EstadoReserva[]> = {
  pendiente: ['confirmada', 'sentada', 'cancelada', 'noShow'],
  confirmada: ['sentada', 'cancelada', 'noShow'],
  sentada: [],
  noShow: [],
  cancelada: [],
}

export interface FiltroReservas {
  localId?: string
  fecha?: string
  desde?: string
  hasta?: string
  estado?: EstadoReserva
  clienteId?: string
}

export const reservasService = {
  async listar(filtro: FiltroReservas = {}): Promise<Reserva[]> {
    return latencia(
      clonar(
        db.reservas
          .filter(
            (r) =>
              (!filtro.localId || r.localId === filtro.localId) &&
              (!filtro.fecha || r.fecha === filtro.fecha) &&
              (!filtro.desde || r.fecha >= filtro.desde) &&
              (!filtro.hasta || r.fecha <= filtro.hasta) &&
              (!filtro.estado || r.estado === filtro.estado) &&
              (!filtro.clienteId || r.clienteId === filtro.clienteId),
          )
          .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)),
      ),
    )
  },

  async crear(datos: NuevaReserva, usuarioId: string): Promise<Reserva> {
    exigirGestion(usuarioId)
    const n = clonar(datos)
    n.nombreContacto = n.nombreContacto.trim()
    n.mesaIds = [...new Set(n.mesaIds)]
    validar(n)
    const reserva: Reserva = {
      ...n,
      id: nuevoId('rs'),
      estado: valorConfig<boolean>('reservas.confirmarAutomatico', n.localId)
        ? 'confirmada'
        : 'pendiente',
      creada: new Date().toISOString(),
      usuarioId,
      nota: n.nota?.trim() || undefined,
    }
    db.reservas.push(reserva)
    reflejarEnMesas(reserva)
    persistir()
    return latencia(clonar(reserva))
  },

  async actualizar(id: string, datos: NuevaReserva, usuarioId: string): Promise<Reserva> {
    const reserva = db.reservas.find((r) => r.id === id)
    if (!reserva) throw { mensaje: 'Reserva no encontrada.' }
    exigirGestion(usuarioId)
    if (!vive(reserva)) throw { mensaje: 'Una reserva cancelada o no vino ya no se edita.' }
    const n = clonar(datos)
    n.nombreContacto = n.nombreContacto.trim()
    n.mesaIds = [...new Set(n.mesaIds)]
    validar(n, id)
    Object.assign(reserva, n, { nota: n.nota?.trim() || undefined })
    reflejarEnMesas(reserva)
    persistir()
    return latencia(clonar(reserva))
  },

  /**
   * Avanza la reserva. Cancelar y «no vino» piden motivo y quedan en la
   * bitácora: son las que generan reclamos y mesas vacías.
   */
  async cambiarEstado(
    id: string,
    estado: EstadoReserva,
    usuarioId: string,
    motivo?: string,
  ): Promise<Reserva> {
    const reserva = db.reservas.find((r) => r.id === id)
    if (!reserva) throw { mensaje: 'Reserva no encontrada.' }
    exigirGestion(usuarioId)
    if (!siguientes[reserva.estado].includes(estado))
      throw {
        mensaje: `Una reserva ${etiquetaEstadoReserva[reserva.estado].toLowerCase()} no pasa a ${etiquetaEstadoReserva[estado].toLowerCase()}.`,
      }
    if ((estado === 'cancelada' || estado === 'noShow') && !motivo?.trim())
      throw errorCampo('motivo', 'Explica por qué se cancela o por qué no vino.', 'Requerido')
    reserva.estado = estado
    if (motivo?.trim()) reserva.motivo = motivo.trim()
    reflejarEnMesas(reserva)
    if (estado === 'cancelada' || estado === 'noShow')
      registrar({
        usuarioId,
        localId: reserva.localId,
        modulo: 'Reservas',
        accion: estado === 'cancelada' ? 'Reserva cancelada' : 'Reserva marcada como no vino',
        detalle: `${reserva.nombreContacto} · ${reserva.fecha} ${reserva.hora} · ${reserva.personas} persona(s) · ${reserva.motivo}`,
      })
    persistir()
    return latencia(clonar(reserva))
  },

  /** Resumen del día: reservas, personas esperadas y cupo del local. */
  async agenda(localId: string, fecha: string) {
    const delDia = db.reservas.filter((r) => r.localId === localId && r.fecha === fecha)
    const activas = delDia.filter(vive)
    return latencia({
      fecha,
      reservas: clonar(delDia).sort((a, b) => a.hora.localeCompare(b.hora)),
      personas: activas.reduce((s, r) => s + r.personas, 0),
      cupo: valorConfig<number>('reservas.cupoPorFranja', localId),
      pendientes: delDia.filter((r) => r.estado === 'pendiente').length,
    })
  },
}
