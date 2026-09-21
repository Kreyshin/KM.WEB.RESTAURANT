import type {
  ComprobanteIngreso,
  LineaRecepcion,
  Lote,
  PorProcesar,
  Recepcion,
  RequerimientoCompra,
} from '@/types'
import {
  stockDetalleService,
  ubicacionesService,
  valoresParametros,
} from './abastecimiento.service'
import { aplicarMovimiento } from './inventario.service'
import { recalcularCostosTransformados } from './abastecimiento.service'
import { db, latencia, nuevoId, persistir, type Esquema } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { nivelZona } from './accesos.service'
import { registrar } from './auditoria.service'
import { tienePermiso, valorConfig } from './parametros.service'

/**
 * Recepción (F4.5, D-004 y D-007).
 *
 * - **Contra OC:** se recibe lo que el ERP convirtió en orden de compra, total
 *   o a detalle y admitiendo parciales. Cada unidad de compra se convierte al
 *   insumo con el factor del artículo; lote, vencimiento y ubicación se piden
 *   solo si el insumo los controla en esa zona.
 * - **Sin OC:** compras de emergencia o de mercado, si el local lo permite.
 *   El stock entra de inmediato y el ingreso queda pendiente de regularizar.
 *
 * Lo que el artículo marca «procesar» queda por procesar hasta registrar su
 * transformación en una parte de producción.
 */

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000
const r4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000
const ahora = () => new Date().toISOString()

function siguiente(prefijo: string, numeros: string[]) {
  const max = numeros.reduce((m, n) => Math.max(m, Number(n.split('-')[1]) || 0), 0)
  return `${prefijo}-${String(max + 1).padStart(6, '0')}`
}

/** Snapshot de lo que toca una recepción o una parte, para deshacer si algo falla. */
const COLECCIONES = [
  'insumos',
  'movimientos',
  'lotes',
  'stockDetalle',
  'porProcesar',
  'requerimientos',
  'recepciones',
  'partesProduccion',
] as const satisfies (keyof Esquema)[]

export function transaccionAbastecimiento<T>(fn: () => T): T {
  const copia = clonar(Object.fromEntries(COLECCIONES.map((c) => [c, db[c]])))
  try {
    const r = fn()
    recalcularCostosTransformados()
    persistir()
    return r
  } catch (e) {
    for (const c of COLECCIONES) (db as unknown as Record<string, unknown>)[c] = copia[c]
    persistir()
    throw e
  }
}

/** El usuario debe poder gestionar la zona (acceso del ERP). */
export function exigirGestion(usuarioId: string, zonaId: string, localId: string) {
  const zona = db.zonas.find((a) => a.id === zonaId)
  if (!zona || zona.localId !== localId) {
    throw errorCampo('zonaId', 'Elige una zona de este local.')
  }
  if (nivelZona(usuarioId, zonaId) !== 'gestionar') {
    throw errorCampo('zonaId', `No tienes permiso para registrar movimientos en ${zona.nombre}.`)
  }
  return zona
}

/** Crea el lote si no existe (mismo insumo y código) y devuelve su id. */
export function loteDe(datos: Omit<Lote, 'id' | 'recepcion'>): string {
  const existente = db.lotes.find(
    (l) => l.insumoId === datos.insumoId && l.codigo.toLowerCase() === datos.codigo.toLowerCase(),
  )
  if (existente) {
    if (datos.vencimiento && existente.vencimiento && existente.vencimiento !== datos.vencimiento) {
      throw errorCampo('lote', `El lote ${datos.codigo} ya existe con otro vencimiento.`)
    }
    return existente.id
  }
  const lote: Lote = { ...datos, id: nuevoId('lt'), recepcion: ahora() }
  db.lotes.push(lote)
  return lote.id
}

/** Tipo de recepción que corresponde a un insumo en una zona. */
export function modoRecepcion(insumoId: string, zonaId: string) {
  return valoresParametros({ insumoId, zonaId }).tipoRecepcion
}

function vinculo(insumoId: string, articuloId?: string) {
  return db.insumos
    .find((i) => i.id === insumoId)
    ?.articulos.find((v) => v.articuloId === articuloId)
}

export interface LineaPorRecibir {
  lineaId: string
  insumoId: string
  articuloId: string
  /** Unidades de compra que faltan recibir. */
  pendiente: number
  factor: number
  precioNeto: number
  procesar: boolean
}

function pendientesDe(r: RequerimientoCompra): LineaPorRecibir[] {
  return r.lineas
    .map((l) => ({
      lineaId: l.id,
      insumoId: l.insumoId,
      articuloId: l.articuloId,
      pendiente: r3((l.cantidadConvertida ?? 0) - (l.cantidadRecibida ?? 0)),
      factor: vinculo(l.insumoId, l.articuloId)?.factor ?? 1,
      precioNeto: l.precioNeto ?? 0,
      procesar: !!vinculo(l.insumoId, l.articuloId)?.procesar,
    }))
    .filter((l) => l.pendiente > 0)
}

function validarPartes(linea: LineaRecepcion, zonaId: string, total: number, i: number) {
  const insumo = db.insumos.find((x) => x.id === linea.insumoId)
  if (!insumo) throw errorCampo(`lineas.${i}`, 'Insumo no encontrado.')
  const p = valoresParametros({ insumoId: linea.insumoId, zonaId })
  const partes = linea.partes.filter((pt) => pt.cantidad > 0)
  if (linea.modo === 'total' && partes.length > 1) {
    throw errorCampo(`lineas.${i}`, `${insumo.nombre} se recibe total: una sola parte.`)
  }
  const suma = r3(partes.reduce((t, pt) => t + pt.cantidad, 0))
  if (Math.abs(suma - total) > 0.0005) {
    throw errorCampo(
      `lineas.${i}`,
      `Las partes de ${insumo.nombre} suman ${suma} ${insumo.unidad} y deberían sumar ${total}.`,
    )
  }
  for (const pt of partes) {
    if (p.controlaLote && !pt.loteCodigo?.trim()) {
      throw errorCampo(
        `lineas.${i}`,
        `${insumo.nombre} controla lote: indica el código de cada parte.`,
      )
    }
    // El vencimiento vive en el lote: sin lote no hay dónde guardarlo.
    if (p.controlaLote && p.controlaVencimiento && !pt.vencimiento) {
      throw errorCampo(`lineas.${i}`, `${insumo.nombre} controla vencimiento: indica la fecha.`)
    }
    if (p.controlaUbicacion && !pt.ubicacionId && !ubicacionesService.porDefectoDe(zonaId)) {
      throw errorCampo(
        `lineas.${i}`,
        `${insumo.nombre} controla ubicación y la zona no tiene una por defecto: elígela.`,
      )
    }
  }
  return { insumo, parametros: p, partes }
}

/** Da entrada al stock, con su detalle, y deja por procesar lo que corresponda. */
function ingresar(recepcion: Recepcion) {
  for (const linea of recepcion.lineas) {
    const total = r3(linea.partes.reduce((t, p) => t + p.cantidad, 0))
    if (total <= 0) continue
    aplicarMovimiento({
      insumoId: linea.insumoId,
      zonaId: recepcion.zonaId,
      tipo: 'entrada',
      cantidad: total,
      costoUnitario: linea.costoUnitario,
      motivo: recepcion.ordenCompra
        ? `Recepción ${recepcion.ordenCompra}`
        : `Ingreso sin OC · ${recepcion.motivo ?? ''}`,
      referencia: recepcion.numero,
      usuarioId: recepcion.usuarioId,
    })
    const p = valoresParametros({ insumoId: linea.insumoId, zonaId: recepcion.zonaId })
    if (p.controlaLote || p.controlaUbicacion) {
      for (const parte of linea.partes.filter((x) => x.cantidad > 0)) {
        stockDetalleService.ajustar({
          insumoId: linea.insumoId,
          zonaId: recepcion.zonaId,
          cantidad: parte.cantidad,
          ubicacionId: p.controlaUbicacion ? parte.ubicacionId : undefined,
          loteId: p.controlaLote
            ? loteDe({
                insumoId: linea.insumoId,
                codigo: parte.loteCodigo!.trim(),
                vencimiento: parte.vencimiento,
                origen: 'compra',
                referencia: recepcion.numero,
              })
            : undefined,
        })
      }
    }
    if (linea.porProcesar) {
      const pendiente: PorProcesar = {
        id: nuevoId('pp'),
        recepcionId: recepcion.id,
        insumoId: linea.insumoId,
        zonaId: recepcion.zonaId,
        cantidad: total,
        pendiente: total,
        fecha: recepcion.fecha,
      }
      db.porProcesar.push(pendiente)
    }
  }
}

export interface DatosRecepcionOc {
  localId: string
  requerimientoId: string
  zonaId: string
  lineas: LineaRecepcion[]
}

export interface DatosIngresoSinOc {
  localId: string
  zonaId: string
  comprobante?: ComprobanteIngreso
  motivo: string
  lineas: LineaRecepcion[]
}

export const recepcionService = {
  async listar(localId: string): Promise<Recepcion[]> {
    return latencia(
      db.recepciones
        .filter((r) => r.localId === localId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    )
  },

  /** Requerimientos del local con OC y líneas pendientes de recibir. */
  async porRecibir(
    localId: string,
  ): Promise<{ requerimiento: RequerimientoCompra; lineas: LineaPorRecibir[] }[]> {
    return latencia(
      db.requerimientos
        .filter(
          (r) => r.localId === localId && (r.estado === 'convertido' || r.estado === 'despachado'),
        )
        .map((r) => ({ requerimiento: clonar(r), lineas: pendientesDe(r) }))
        .filter((x) => x.lineas.length > 0),
    )
  },

  /** Propuesta de recepción: todo lo pendiente, con su modo y costo por unidad del insumo. */
  preparar(requerimientoId: string, zonaId: string): LineaRecepcion[] {
    const r = db.requerimientos.find((x) => x.id === requerimientoId)
    if (!r) return []
    const porDefecto = ubicacionesService.porDefectoDe(zonaId)?.id
    return pendientesDe(r).map((l) => {
      const modo = modoRecepcion(l.insumoId, zonaId) === 'detalle' ? 'detalle' : 'total'
      return {
        id: l.lineaId,
        lineaRequerimientoId: l.lineaId,
        insumoId: l.insumoId,
        articuloId: l.articuloId,
        cantidadCompra: l.pendiente,
        factor: l.factor,
        costoUnitario: r4(l.precioNeto / (l.factor || 1)),
        modo,
        partes: [{ cantidad: r3(l.pendiente * l.factor), ubicacionId: porDefecto }],
        porProcesar: l.procesar,
      }
    })
  },

  async recibir(datos: DatosRecepcionOc, usuarioId: string): Promise<Recepcion> {
    exigirGestion(usuarioId, datos.zonaId, datos.localId)
    const r = db.requerimientos.find((x) => x.id === datos.requerimientoId)
    if (!r || r.localId !== datos.localId) throw { mensaje: 'Requerimiento no encontrado.' }
    if (r.estado !== 'convertido' && r.estado !== 'despachado') {
      throw { mensaje: 'Solo se recibe un requerimiento convertido en OC o despachado.' }
    }
    const pendientes = pendientesDe(r)
    const lineas = datos.lineas.filter((l) => (l.cantidadCompra ?? 0) > 0)
    if (lineas.length === 0) throw errorCampo('lineas', 'Indica al menos una cantidad recibida.')

    lineas.forEach((l, i) => {
      const pendiente = pendientes.find((p) => p.lineaId === l.lineaRequerimientoId)
      if (!pendiente) throw errorCampo(`lineas.${i}`, 'Esa línea ya está recibida.')
      if ((l.cantidadCompra ?? 0) > pendiente.pendiente + 0.0005) {
        const articulo = db.articulos.find((a) => a.id === l.articuloId)
        throw errorCampo(
          `lineas.${i}`,
          `De ${articulo?.nombre ?? 'esa línea'} faltan ${pendiente.pendiente}: no se puede recibir más de lo pedido.`,
        )
      }
      validarPartes(l, datos.zonaId, r3((l.cantidadCompra ?? 0) * pendiente.factor), i)
    })

    const recepcion = transaccionAbastecimiento(() => {
      const nueva: Recepcion = {
        id: nuevoId('rc'),
        numero: siguiente(
          'REC',
          db.recepciones.map((x) => x.numero),
        ),
        localId: datos.localId,
        zonaId: datos.zonaId,
        requerimientoId: r.id,
        ordenCompra: r.ordenCompra,
        estado: 'registrada',
        fecha: ahora(),
        usuarioId,
        lineas: clonar(lineas).map((l) => ({ ...l, id: nuevoId('rl') })),
      }
      ingresar(nueva)
      const req = db.requerimientos.find((x) => x.id === r.id)!
      for (const l of lineas) {
        const lr = req.lineas.find((x) => x.id === l.lineaRequerimientoId)!
        lr.cantidadRecibida = r3((lr.cantidadRecibida ?? 0) + (l.cantidadCompra ?? 0))
      }
      const nombre = db.usuarios.find((u) => u.id === usuarioId)?.nombre ?? 'Usuario'
      const completo = req.lineas.every(
        (l) => (l.cantidadRecibida ?? 0) >= (l.cantidadConvertida ?? 0),
      )
      if (completo) {
        req.estado = 'recepcionado'
        req.historial.push({
          estado: 'recepcionado',
          fecha: ahora(),
          autor: nombre,
          nota: nueva.numero,
        })
      } else {
        req.historial.push({
          estado: req.estado,
          fecha: ahora(),
          autor: nombre,
          nota: `Recepción parcial ${nueva.numero}`,
        })
      }
      db.recepciones.push(nueva)
      return nueva
    })
    return latencia(clonar(recepcion))
  },

  async ingresoSinOc(datos: DatosIngresoSinOc, usuarioId: string): Promise<Recepcion> {
    if (!valorConfig<boolean>('recepcion.sinOc.permitido', datos.localId)) {
      throw { mensaje: 'Este local no permite ingresos sin orden de compra.' }
    }
    exigirGestion(usuarioId, datos.zonaId, datos.localId)
    if (!datos.motivo.trim()) throw errorCampo('motivo', 'Explica por qué se compró sin OC.')
    const c = datos.comprobante
    if (valorConfig<boolean>('recepcion.sinOc.comprobante', datos.localId)) {
      if (!c || !c.serie.trim() || !c.numero.trim() || !(c.monto > 0)) {
        throw errorCampo('comprobante', 'Completa tipo, serie, número y monto del comprobante.')
      }
      if (!c.proveedorId && !c.proveedorOcasional?.trim()) {
        throw errorCampo('comprobante', 'Indica el proveedor o a quién se le compró.')
      }
    }
    const tope = valorConfig<number>('recepcion.sinOc.tope', datos.localId)
    if (tope > 0 && c && c.monto > tope) {
      throw errorCampo(
        'comprobante',
        `El comprobante supera el tope de S/ ${tope} para ingresos sin OC.`,
      )
    }
    const lineas = datos.lineas.filter((l) => l.insumoId && l.partes.some((p) => p.cantidad > 0))
    if (lineas.length === 0) throw errorCampo('lineas', 'Añade al menos un insumo con cantidad.')
    lineas.forEach((l, i) => {
      if (!(l.costoUnitario >= 0))
        throw errorCampo(`lineas.${i}`, 'El costo no puede ser negativo.')
      validarPartes(l, datos.zonaId, r3(l.partes.reduce((t, p) => t + p.cantidad, 0)), i)
    })

    const recepcion = transaccionAbastecimiento(() => {
      const nueva: Recepcion = {
        id: nuevoId('rc'),
        numero: siguiente(
          'REC',
          db.recepciones.map((x) => x.numero),
        ),
        localId: datos.localId,
        zonaId: datos.zonaId,
        comprobante: c ? clonar(c) : undefined,
        motivo: datos.motivo.trim(),
        estado: 'pendienteRegularizar',
        fecha: ahora(),
        usuarioId,
        lineas: clonar(lineas).map((l) => ({ ...l, id: nuevoId('rl'), factor: l.factor || 1 })),
      }
      ingresar(nueva)
      db.recepciones.push(nueva)
      return nueva
    })
    registrar({
      usuarioId,
      localId: recepcion.localId,
      modulo: 'Compras',
      accion: 'Ingreso sin OC',
      detalle: `Recepción ${recepcion.numero} · ${recepcion.lineas.length} insumo(s)${
        recepcion.comprobante ? ` · S/ ${recepcion.comprobante.monto.toFixed(2)}` : ''
      }${recepcion.motivo ? ` · ${recepcion.motivo}` : ''}`,
    })
    return latencia(clonar(recepcion))
  },

  async regularizar(id: string, usuarioId: string): Promise<Recepcion> {
    if (!tienePermiso(usuarioId, 'compras.regularizarIngresos')) {
      throw { mensaje: 'No tienes el permiso «Regularizar ingresos sin OC».' }
    }
    const r = db.recepciones.find((x) => x.id === id)
    if (!r) throw { mensaje: 'Recepción no encontrada.' }
    if (r.estado !== 'pendienteRegularizar') throw { mensaje: 'Esta recepción no está pendiente.' }
    r.estado = 'regularizada'
    r.regularizadaPor = db.usuarios.find((u) => u.id === usuarioId)?.nombre
    registrar({
      usuarioId,
      localId: r.localId,
      modulo: 'Compras',
      accion: 'Ingreso sin OC regularizado',
      detalle: `Recepción ${r.numero}${r.comprobante ? ` · ${r.comprobante.serie}-${r.comprobante.numero}` : ''}`,
    })
    persistir()
    return latencia(clonar(r))
  },

  /** Costo neto por unidad del insumo en cada recepción, de la más reciente a la más antigua. */
  historialPrecios(insumoId: string) {
    return db.recepciones
      .flatMap((r) =>
        r.lineas
          .filter((l) => l.insumoId === insumoId)
          .map((l) => ({
            fecha: r.fecha,
            numero: r.numero,
            costo: l.costoUnitario,
            articuloId: l.articuloId,
          })),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  },

  async porProcesar(localId: string): Promise<PorProcesar[]> {
    const zonas = db.zonas.filter((a) => a.localId === localId).map((a) => a.id)
    return latencia(
      db.porProcesar
        .filter((p) => p.pendiente > 0 && zonas.includes(p.zonaId))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    )
  },
}
