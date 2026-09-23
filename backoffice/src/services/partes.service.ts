import type { EntradaParte, ParteProduccion, SalidaParte } from '@/types'
import { consumirDetalle, stockDetalleService, valoresParametros } from './abastecimiento.service'
import { aplicarMovimiento } from './inventario.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { valorConfig } from './parametros.service'
import { exigirGestion, loteDe, transaccionAbastecimiento } from './recepcion.service'

/**
 * Partes de producción (F4.5, D-007): el registro real de una transformación.
 *
 * Escala la transformación a la cantidad que se quiere producir, consume las
 * entradas (con FEFO si llevan lote) y da de alta lo que sale con su lote y
 * vencimiento. Según la configuración del local:
 *
 * - **Simple:** se aplica lo esperado; no hay nada que explicar.
 * - **Detallado:** se anotan consumos y salidas reales, y la diferencia entre
 *   lo que entra y lo que sale debe ir a merma con un motivo.
 */

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const ahora = () => new Date().toISOString()
const hoy = () => new Date().toLocaleDateString('sv-SE')

function siguiente(numeros: string[]) {
  const max = numeros.reduce((m, n) => Math.max(m, Number(n.split('-')[1]) || 0), 0)
  return `PP-${String(max + 1).padStart(6, '0')}`
}

function transformacion(id: string) {
  const t = db.transformaciones.find((x) => x.id === id)
  if (!t) throw errorCampo('transformacionId', 'Elige una transformación.')
  if (!t.activo) throw errorCampo('transformacionId', `«${t.nombre}» está inactiva.`)
  return t
}

const insumo = (id?: string) => db.insumos.find((i) => i.id === id)

export type ModoProduccion = 'simple' | 'detallado'

export function modoProduccion(localId: string): ModoProduccion {
  return valorConfig<ModoProduccion>('produccion.modo', localId)
}

/** Lo esperado de una transformación multiplicado por `factor` tandas. */
export function escalar(transformacionId: string, factor: number) {
  const t = transformacion(transformacionId)
  const entradas: EntradaParte[] = t.entradas.map((e) => ({
    insumoId: e.insumoId,
    esperada: r3(e.cantidad * factor),
    real: r3(e.cantidad * factor),
  }))
  const salidas: SalidaParte[] = t.salidas.map((s) => ({
    salidaId: s.id,
    tipo: s.tipo,
    insumoId: s.insumoId,
    esperada: r3(s.cantidad * factor),
    real: r3(s.cantidad * factor),
  }))
  return { entradas, salidas }
}

/**
 * Diferencia entre lo que entra y todo lo que sale (incluida la merma). Solo
 * tiene sentido si todo se mide en la misma unidad; si no, es `null`.
 */
export function diferencia(parte: Pick<ParteProduccion, 'entradas' | 'salidas'>) {
  const unidades = new Set(
    [...parte.entradas.map((e) => e.insumoId), ...parte.salidas.map((s) => s.insumoId)]
      .filter(Boolean)
      .map((id) => insumo(id)?.unidad),
  )
  if (unidades.size !== 1) return null
  const entra = parte.entradas.reduce((t, e) => t + e.real, 0)
  const sale = parte.salidas.reduce((t, s) => t + s.real, 0)
  return r3(entra - sale)
}

/** Vencimiento que corresponde a lo producido según la configuración de vida útil. */
export function vencimientoPropuesto(transformacionId: string) {
  const t = db.transformaciones.find((x) => x.id === transformacionId)
  const dias = t?.salidas
    .filter((s) => s.tipo === 'insumo')
    .map((s) => insumo(s.insumoId)?.vidaUtilDias)
    .filter((d): d is number => d !== undefined)
  if (!dias?.length) return undefined
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + Math.min(...dias))
  return fecha.toLocaleDateString('sv-SE')
}

export interface DatosParte {
  localId: string
  zonaId: string
  transformacionId: string
  factor: number
  entradas: EntradaParte[]
  salidas: SalidaParte[]
  motivoDiferencia?: string
  vencimiento?: string
}

function validar(datos: DatosParte, usuarioId: string) {
  exigirGestion(usuarioId, datos.zonaId, datos.localId)
  const t = transformacion(datos.transformacionId)
  if (!(datos.factor > 0)) throw errorCampo('factor', 'Indica cuánto se produce.')
  const modo = modoProduccion(datos.localId)
  const esperado = escalar(t.id, datos.factor)

  // En modo simple no se registran reales: se aplica lo esperado.
  const entradas = modo === 'simple' ? esperado.entradas : datos.entradas
  const salidas = modo === 'simple' ? esperado.salidas : datos.salidas
  if (entradas.some((e) => !(e.real >= 0)) || salidas.some((s) => !(s.real >= 0))) {
    throw errorCampo('cantidades', 'Las cantidades reales no pueden ser negativas.')
  }
  if (!salidas.some((s) => s.tipo === 'insumo' && s.real > 0)) {
    throw errorCampo('salidas', 'No salió nada utilizable: si se perdió todo, recházala.')
  }

  let mermaAdicional: number | undefined
  let motivoDiferencia: string | undefined
  if (modo === 'detallado') {
    const dif = diferencia({ entradas, salidas })
    if (dif !== null && dif < -0.0005) {
      throw errorCampo(
        'salidas',
        `Sale ${-dif} más de lo que entra: revisa las cantidades reales.`,
        'Salida mayor que la entrada',
      )
    }
    if (dif !== null && dif > 0.0005) {
      if (!datos.motivoDiferencia?.trim()) {
        throw errorCampo(
          'motivoDiferencia',
          `Faltan ${dif} por explicar entre lo que entró y lo que salió: indica el motivo para enviarlo a merma.`,
          'Diferencia sin motivo',
        )
      }
      mermaAdicional = dif
      motivoDiferencia = datos.motivoDiferencia.trim()
    }
  }

  // Vencimiento de lo producido.
  let vencimiento = datos.vencimiento || undefined
  if (valorConfig<string>('produccion.vidaUtil') === 'validada') {
    const sinValidar = t.salidas
      .filter((s) => s.tipo === 'insumo')
      .map((s) => insumo(s.insumoId)!)
      .find((i) => i.vidaUtilDias === undefined || !i.vidaUtilAprobadaPor)
    if (sinValidar) {
      throw {
        mensaje: `${sinValidar.nombre} no tiene una vida útil aprobada: defínela en el insumo.`,
      }
    }
    vencimiento = vencimientoPropuesto(t.id)
  }
  for (const s of salidas.filter((x) => x.tipo === 'insumo' && x.real > 0)) {
    const p = valoresParametros({ insumoId: s.insumoId!, zonaId: datos.zonaId })
    if (p.controlaLote && p.controlaVencimiento && !vencimiento) {
      throw errorCampo(
        'vencimiento',
        `${insumo(s.insumoId)?.nombre} controla vencimiento: indica la fecha.`,
      )
    }
  }
  if (vencimiento && vencimiento < hoy()) {
    throw errorCampo('vencimiento', 'El vencimiento no puede ser anterior a hoy.')
  }
  return { t, entradas, salidas, mermaAdicional, motivoDiferencia, vencimiento }
}

/** Descuenta lo pendiente de procesar de un insumo en la zona, lo más antiguo primero. */
function descontarPorProcesar(insumoId: string, zonaId: string, cantidad: number) {
  let resta = cantidad
  for (const p of db.porProcesar
    .filter((x) => x.insumoId === insumoId && x.zonaId === zonaId && x.pendiente > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (resta <= 0) break
    const toma = Math.min(p.pendiente, resta)
    p.pendiente = r3(p.pendiente - toma)
    resta = r3(resta - toma)
  }
}

function consumirEntradas(parte: ParteProduccion, motivo: string) {
  for (const e of parte.entradas.filter((x) => x.real > 0)) {
    aplicarMovimiento({
      insumoId: e.insumoId,
      zonaId: parte.zonaId,
      tipo: 'consumoProduccion',
      cantidad: e.real,
      motivo,
      referencia: parte.numero,
      usuarioId: parte.responsableId,
    })
    consumirDetalle(e.insumoId, parte.zonaId, e.real)
    descontarPorProcesar(e.insumoId, parte.zonaId, e.real)
  }
}

export const partesService = {
  async listar(localId: string): Promise<ParteProduccion[]> {
    return latencia(
      db.partesProduccion
        .filter((p) => p.localId === localId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    )
  },

  escalar,
  diferencia,
  vencimientoPropuesto,
  modoProduccion,

  /** Guarda la parte sin mover stock: se está produciendo. */
  async guardarEnProceso(
    datos: DatosParte,
    usuarioId: string,
    id?: string,
  ): Promise<ParteProduccion> {
    exigirGestion(usuarioId, datos.zonaId, datos.localId)
    transformacion(datos.transformacionId)
    const existente = id ? db.partesProduccion.find((p) => p.id === id) : undefined
    if (existente && existente.estado !== 'enProceso')
      throw { mensaje: 'La parte ya está cerrada.' }
    const base = {
      localId: datos.localId,
      zonaId: datos.zonaId,
      transformacionId: datos.transformacionId,
      factor: datos.factor,
      entradas: clonar(datos.entradas),
      salidas: clonar(datos.salidas),
      motivoDiferencia: datos.motivoDiferencia,
      vencimiento: datos.vencimiento,
    }
    let parte: ParteProduccion
    if (existente) {
      Object.assign(existente, base)
      parte = existente
    } else {
      parte = {
        ...base,
        id: nuevoId('pr'),
        numero: siguiente(db.partesProduccion.map((p) => p.numero)),
        estado: 'enProceso',
        responsableId: usuarioId,
        fecha: ahora(),
      }
      db.partesProduccion.push(parte)
    }
    persistir()
    return latencia(clonar(parte))
  },

  /** Cierra la parte: consume entradas, da de alta salidas y registra la merma. */
  async terminar(datos: DatosParte, usuarioId: string, id?: string): Promise<ParteProduccion> {
    const v = validar(datos, usuarioId)
    const parte = transaccionAbastecimiento(() => {
      let p = id ? db.partesProduccion.find((x) => x.id === id) : undefined
      if (p && p.estado !== 'enProceso') throw { mensaje: 'La parte ya está cerrada.' }
      if (!p) {
        p = {
          id: nuevoId('pr'),
          numero: siguiente(db.partesProduccion.map((x) => x.numero)),
          localId: datos.localId,
          zonaId: datos.zonaId,
          transformacionId: v.t.id,
          factor: datos.factor,
          estado: 'enProceso',
          entradas: [],
          salidas: [],
          responsableId: usuarioId,
          fecha: ahora(),
        }
        db.partesProduccion.push(p)
      }
      Object.assign(p, {
        zonaId: datos.zonaId,
        factor: datos.factor,
        entradas: clonar(v.entradas),
        salidas: clonar(v.salidas),
        mermaAdicional: v.mermaAdicional,
        motivoDiferencia: v.motivoDiferencia,
        vencimiento: v.vencimiento,
        responsableId: usuarioId,
      })

      p.costoReal = r2(
        p.entradas.reduce((t, e) => t + e.real * (insumo(e.insumoId)?.costoUnitario ?? 0), 0),
      )
      consumirEntradas(p, v.t.nombre)

      for (const s of p.salidas.filter((x) => x.tipo === 'insumo' && x.real > 0)) {
        aplicarMovimiento({
          insumoId: s.insumoId!,
          zonaId: p.zonaId,
          tipo: 'produccion',
          cantidad: s.real,
          motivo: v.t.nombre,
          referencia: p.numero,
          usuarioId,
        })
        const par = valoresParametros({ insumoId: s.insumoId!, zonaId: p.zonaId })
        if (par.controlaLote) {
          s.loteId = loteDe({
            insumoId: s.insumoId!,
            codigo: p.numero,
            vencimiento: p.vencimiento,
            origen: 'produccion',
            referencia: p.numero,
          })
        }
        if (par.controlaLote || par.controlaUbicacion) {
          stockDetalleService.ajustar({
            insumoId: s.insumoId!,
            zonaId: p.zonaId,
            cantidad: s.real,
            loteId: s.loteId,
          })
        }
      }
      p.estado = 'terminada'
      p.terminadaEn = ahora()
      return p
    })
    return latencia(clonar(parte))
  },

  /** Lo producido no sirve: se consumen las entradas y no entra nada al stock. */
  async rechazar(
    datos: DatosParte,
    motivo: string,
    usuarioId: string,
    id?: string,
  ): Promise<ParteProduccion> {
    exigirGestion(usuarioId, datos.zonaId, datos.localId)
    const t = transformacion(datos.transformacionId)
    if (!motivo.trim()) throw errorCampo('motivoRechazo', 'Explica por qué se rechaza.')
    const modo = modoProduccion(datos.localId)
    const entradas = modo === 'simple' ? escalar(t.id, datos.factor).entradas : datos.entradas
    const parte = transaccionAbastecimiento(() => {
      let p = id ? db.partesProduccion.find((x) => x.id === id) : undefined
      if (p && p.estado !== 'enProceso') throw { mensaje: 'La parte ya está cerrada.' }
      if (!p) {
        p = {
          id: nuevoId('pr'),
          numero: siguiente(db.partesProduccion.map((x) => x.numero)),
          localId: datos.localId,
          zonaId: datos.zonaId,
          transformacionId: t.id,
          factor: datos.factor,
          estado: 'enProceso',
          entradas: [],
          salidas: [],
          responsableId: usuarioId,
          fecha: ahora(),
        }
        db.partesProduccion.push(p)
      }
      Object.assign(p, {
        zonaId: datos.zonaId,
        factor: datos.factor,
        entradas: clonar(entradas),
        salidas: clonar(datos.salidas).map((s) => ({ ...s, real: 0 })),
        motivoRechazo: motivo.trim(),
      })
      p.costoReal = r2(
        p.entradas.reduce((tt, e) => tt + e.real * (insumo(e.insumoId)?.costoUnitario ?? 0), 0),
      )
      consumirEntradas(p, `${t.nombre} · rechazada: ${motivo.trim()}`)
      p.estado = 'rechazada'
      p.terminadaEn = ahora()
      return p
    })
    return latencia(clonar(parte))
  },

  async eliminarEnProceso(id: string): Promise<void> {
    const p = db.partesProduccion.find((x) => x.id === id)
    if (!p) throw { mensaje: 'Parte no encontrada.' }
    if (p.estado !== 'enProceso') throw { mensaje: 'Una parte cerrada no se elimina.' }
    db.partesProduccion = db.partesProduccion.filter((x) => x.id !== id)
    persistir()
    await latencia(null)
  },
}
