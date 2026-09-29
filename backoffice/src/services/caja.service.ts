import type { ApiError, ConteoMedio, ResumenCaja, SesionCaja } from '@/types'
import { registrar } from './auditoria.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso, valorConfig } from './parametros.service'

/**
 * Sesión de caja (F7, D-012). Se abre con un fondo y se cierra contando: lo
 * que el cajero cuenta contra lo que el sistema esperaba. El cierre es ciego
 * por defecto —quien cuenta no ve lo esperado— porque si no, el arqueo deja de
 * medir nada.
 */

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function sesionAbierta(localId: string): SesionCaja | undefined {
  return db.sesionesCaja.find((s) => s.localId === localId && s.estado === 'abierta')
}

function exigir(usuarioId?: string) {
  if (!tienePermiso(usuarioId, 'caja.gestionar'))
    throw { mensaje: 'No tienes permiso para abrir ni cerrar la caja.' } satisfies ApiError
}

/** Lo vendido en la sesión, por medio de pago: la base del arqueo. */
export function resumen(sesionId: string): ResumenCaja {
  const sesion = db.sesionesCaja.find((s) => s.id === sesionId)
  if (!sesion) throw { mensaje: 'Sesión de caja no encontrada.' } satisfies ApiError

  const ventas = db.ventas.filter((v) => v.sesionCajaId === sesionId && v.estado === 'cobrada')
  const porMedio = new Map<string, number>()
  let vueltos = 0
  for (const venta of ventas) {
    for (const pago of venta.pagos)
      porMedio.set(pago.medioPagoId, redondear((porMedio.get(pago.medioPagoId) ?? 0) + pago.monto))
    vueltos = redondear(vueltos + venta.vuelto)
  }

  const efectivoIds = db.mediosPago.filter((m) => m.tipo === 'efectivo').map((m) => m.id)
  const efectivoCobrado = [...porMedio.entries()]
    .filter(([id]) => efectivoIds.includes(id))
    .reduce((s, [, monto]) => s + monto, 0)

  return {
    sesion: clonar(sesion),
    ventas: ventas.length,
    totalVendido: redondear(ventas.reduce((s, v) => s + v.totales.total, 0)),
    propinas: redondear(ventas.reduce((s, v) => s + v.propina, 0)),
    porMedio: [...porMedio.entries()].map(([medioPagoId, monto]) => ({
      medioPagoId,
      nombre: db.mediosPago.find((m) => m.id === medioPagoId)?.nombre ?? medioPagoId,
      monto,
    })),
    // El vuelto sale del cajón: se resta de lo que debería haber.
    efectivoEsperado: redondear(sesion.fondoInicial + efectivoCobrado - vueltos),
  }
}

export const cajaService = {
  async sesionDe(localId: string): Promise<SesionCaja | null> {
    return latencia(clonar(sesionAbierta(localId) ?? null))
  },

  async historial(localId: string): Promise<SesionCaja[]> {
    return latencia(
      clonar(
        db.sesionesCaja
          .filter((s) => s.localId === localId)
          .sort((a, b) => b.abierta.localeCompare(a.abierta)),
      ),
    )
  },

  async resumen(sesionId: string): Promise<ResumenCaja> {
    return latencia(resumen(sesionId))
  },

  async abrir(localId: string, fondoInicial: number, usuarioId: string): Promise<SesionCaja> {
    exigir(usuarioId)
    if (!db.locales.some((l) => l.id === localId))
      throw errorCampo('localId', 'Elige el local.', 'Requerido')
    if (sesionAbierta(localId))
      throw { mensaje: 'Este local ya tiene una caja abierta.' } satisfies ApiError
    if (!(fondoInicial >= 0)) throw errorCampo('fondoInicial', 'El fondo no puede ser negativo.')

    const sesion: SesionCaja = {
      id: nuevoId('sc'),
      localId,
      usuarioId,
      abierta: new Date().toISOString(),
      fondoInicial: redondear(fondoInicial),
      estado: 'abierta',
    }
    db.sesionesCaja.push(sesion)
    registrar({
      usuarioId,
      localId,
      modulo: 'Caja',
      accion: 'Caja abierta',
      detalle: `Fondo inicial S/ ${sesion.fondoInicial.toFixed(2)}`,
    })
    persistir()
    return latencia(clonar(sesion))
  },

  /**
   * Cierra contando. Se recibe lo contado por medio de pago y el sistema pone
   * lo esperado al lado: la diferencia es el resultado del arqueo, no un error
   * que haya que esconder.
   */
  async cerrar(
    sesionId: string,
    contado: { medioPagoId: string; monto: number }[],
    usuarioId: string,
    nota?: string,
  ): Promise<SesionCaja> {
    exigir(usuarioId)
    const sesion = db.sesionesCaja.find((s) => s.id === sesionId)
    if (!sesion) throw { mensaje: 'Sesión de caja no encontrada.' } satisfies ApiError
    if (sesion.estado === 'cerrada')
      throw { mensaje: 'Esa caja ya está cerrada.' } satisfies ApiError

    const datos = resumen(sesionId)
    const efectivoIds = db.mediosPago.filter((m) => m.tipo === 'efectivo').map((m) => m.id)
    const medios = db.mediosPago.filter(
      (m) => m.activo || datos.porMedio.some((p) => p.medioPagoId === m.id),
    )

    const conteo: ConteoMedio[] = medios.map((medio) => {
      const esperado = efectivoIds.includes(medio.id)
        ? datos.efectivoEsperado
        : (datos.porMedio.find((p) => p.medioPagoId === medio.id)?.monto ?? 0)
      const monto = contado.find((c) => c.medioPagoId === medio.id)?.monto ?? 0
      if (monto < 0) throw errorCampo('contado', 'Lo contado no puede ser negativo.')
      return {
        medioPagoId: medio.id,
        nombre: medio.nombre,
        esperado: redondear(esperado),
        contado: redondear(monto),
        diferencia: redondear(monto - esperado),
      }
    })

    sesion.conteo = conteo
    sesion.diferencia = redondear(conteo.reduce((s, c) => s + c.diferencia, 0))
    sesion.cerrada = new Date().toISOString()
    sesion.nota = nota?.trim() || undefined
    sesion.estado = 'cerrada'

    registrar({
      usuarioId,
      localId: sesion.localId,
      modulo: 'Caja',
      accion: 'Caja cerrada',
      detalle: `${datos.ventas} venta(s) · S/ ${datos.totalVendido.toFixed(2)} · diferencia S/ ${sesion.diferencia.toFixed(2)}${sesion.nota ? ` · ${sesion.nota}` : ''}`,
    })
    persistir()
    return latencia(clonar(sesion))
  },

  /** Si el cajero ve lo esperado mientras cuenta (D-012). */
  cierreCiego: (localId: string) => valorConfig<boolean>('caja.cierreCiego', localId),
  sesionAbierta,
}
