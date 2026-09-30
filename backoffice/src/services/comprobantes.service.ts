import type {
  ApiError,
  Comprobante,
  EstadoComprobante,
  MotivoNotaCredito,
  ReceptorComprobante,
  TipoComprobante,
  TotalesComprobante,
  Venta,
} from '@/types'
import { registrar } from './auditoria.service'
import { devolver } from './consumo.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso, valorConfig } from './parametros.service'
import { diaLocal } from '@/utils/fechas'
import { validarRuc } from '@/utils/validaciones'

/**
 * Comprobantes electrónicos (F8, D-013).
 *
 * La vertical emite; quien declara es el ERP. Aquí no hay OSE: el envío se
 * **simula** con los mismos estados que tendrá el real, para que la pantalla y
 * las reglas estén hechas cuando se enchufe la integración (decisión D).
 *
 * Anular nunca borra: se emite una nota de crédito referida al comprobante.
 */

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const ahora = () => new Date().toISOString()

export const etiquetaEstadoComprobante: Record<EstadoComprobante, string> = {
  porEnviar: 'Por enviar',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  observado: 'Observado',
}

export const etiquetaTipoComprobante: Record<TipoComprobante, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
  notaCredito: 'Nota de crédito',
  notaVenta: 'Nota de venta',
}

export const etiquetaMotivoNota: Record<MotivoNotaCredito, string> = {
  anulacion: 'Anulación de la operación',
  devolucion: 'Devolución total o parcial',
  descuento: 'Descuento posterior',
  errorDescripcion: 'Corrección por error en la descripción',
  errorRuc: 'Corrección por error en el RUC',
}

function exigir(usuarioId: string | undefined, clave: string, accion: string) {
  if (!tienePermiso(usuarioId, clave))
    throw { mensaje: `No tienes permiso para ${accion}.` } satisfies ApiError
}

/** Serie activa del local para ese tipo. Sin serie no se inventa: se avisa cuál falta. */
function serieDe(localId: string, tipo: TipoComprobante) {
  const serie = db.series.find((s) => s.localId === localId && s.tipo === tipo && s.activo)
  if (!serie)
    throw {
      mensaje: `Este local no tiene serie activa de ${etiquetaTipoComprobante[tipo].toLowerCase()}. Se configura en el ERP.`,
    } satisfies ApiError
  return serie
}

function ventaDe(ventaId: string): Venta {
  const venta = db.ventas.find((v) => v.id === ventaId)
  if (!venta) throw { mensaje: 'Venta no encontrada.' } satisfies ApiError
  return venta
}

/** Los importes se congelan como se cobraron: el comprobante no se mueve después. */
function totalesDe(venta: Venta): TotalesComprobante {
  return {
    valorVenta: venta.totales.valorVenta,
    igv: venta.totales.igv,
    tasaIgv: venta.totales.tasaIgv,
    recargoConsumo: venta.totales.recargoConsumo,
    total: venta.totales.total,
  }
}

/**
 * Qué exige cada tipo de su receptor. La factura necesita RUC válido y razón
 * social; la boleta pide DNI por encima del importe configurado, que es la
 * regla de SUNAT y por eso es un parámetro, no una constante.
 */
function validarReceptor(
  tipo: TipoComprobante,
  receptor: ReceptorComprobante,
  total: number,
  localId: string,
) {
  if (tipo === 'factura') {
    if (receptor.tipoDocumento !== 'ruc' || !receptor.documento?.trim())
      throw errorCampo('documento', 'La factura se emite a un RUC.', 'Requerido')
    if (!validarRuc(receptor.documento.trim()))
      throw errorCampo('documento', 'El RUC no es válido.', 'Revisa los 11 dígitos')
    if (!receptor.nombre?.trim()) throw errorCampo('nombre', 'Indica la razón social.', 'Requerido')
    if (!receptor.direccion?.trim())
      throw errorCampo('direccion', 'La factura lleva la dirección fiscal.', 'Requerido')
    return
  }

  const limite = valorConfig<number>('comprobantes.limiteBoletaSinDni', localId)
  if (limite > 0 && total > limite && !receptor.documento?.trim())
    throw errorCampo(
      'documento',
      `Por encima de S/ ${limite.toFixed(2)} la boleta lleva el documento del cliente.`,
      'Falta el documento',
    )
  if (receptor.documento?.trim()) {
    if (receptor.tipoDocumento === 'dni' && !/^\d{8}$/.test(receptor.documento.trim()))
      throw errorCampo('documento', 'El DNI tiene 8 dígitos.')
    if (receptor.tipoDocumento === 'ruc' && !validarRuc(receptor.documento.trim()))
      throw errorCampo('documento', 'El RUC no es válido.', 'Revisa los 11 dígitos')
  }
}

/** Receptor tomado del cliente del ERP de la venta, si lo tiene. */
function receptorDe(venta: Venta, dado?: ReceptorComprobante): ReceptorComprobante {
  if (dado) return dado
  const pedido = db.pedidos.find((p) => p.id === venta.pedidoId)
  const cliente = db.clientes.find((c) => c.id === pedido?.clienteId)
  if (!cliente) return {}
  return {
    tipoDocumento: cliente.tipoDocumento,
    documento: cliente.documento,
    nombre: cliente.nombre,
    direccion: cliente.direccion,
    email: cliente.email,
  }
}

export interface DatosEmision {
  ventaId: string
  tipo: TipoComprobante
  receptor?: ReceptorComprobante
}

/** Emite el comprobante de una venta. Queda por enviar: enviar es otro paso. */
export function emitir(datos: DatosEmision, usuarioId?: string): Comprobante {
  const venta = ventaDe(datos.ventaId)
  if (venta.estado === 'anulada')
    throw { mensaje: 'Esa venta está anulada: no se emite comprobante.' } satisfies ApiError
  if (datos.tipo === 'notaCredito')
    throw {
      mensaje: 'La nota de crédito se emite desde el comprobante que corrige.',
    } satisfies ApiError

  const previo = db.comprobantes.find(
    (c) => c.ventaId === venta.id && c.tipo !== 'notaCredito' && c.estado !== 'rechazado',
  )
  if (previo)
    throw {
      mensaje: `Esta venta ya tiene ${etiquetaTipoComprobante[previo.tipo].toLowerCase()} ${previo.serie}-${previo.numero}.`,
    } satisfies ApiError

  const receptor = receptorDe(venta, datos.receptor)
  const totales = totalesDe(venta)
  validarReceptor(datos.tipo, receptor, totales.total, venta.localId)

  const serie = serieDe(venta.localId, datos.tipo)
  serie.correlativo += 1

  const comprobante: Comprobante = {
    id: nuevoId('cp'),
    tipo: datos.tipo,
    serie: serie.serie,
    numero: serie.correlativo,
    localId: venta.localId,
    ventaId: venta.id,
    fecha: ahora(),
    usuarioId,
    receptor,
    totales,
    estado: 'porEnviar',
    intentos: 0,
  }
  db.comprobantes.push(comprobante)
  persistir()
  return comprobante
}

/**
 * Envío simulado. Devuelve aceptado salvo que los datos tengan algo que un OSE
 * rechazaría: así los estados de error se pueden ver sin romper nada a mano.
 */
function simularEnvio(comprobante: Comprobante): {
  estado: EstadoComprobante
  codigo: string
  mensaje: string
} {
  const receptor = comprobante.receptor
  if (comprobante.tipo === 'factura' && receptor.documento && !validarRuc(receptor.documento))
    return { estado: 'rechazado', codigo: '2017', mensaje: 'El número de RUC no existe.' }
  if (comprobante.totales.total <= 0)
    return {
      estado: 'rechazado',
      codigo: '3105',
      mensaje: 'El importe total debe ser mayor a cero.',
    }
  if (!receptor.documento && comprobante.tipo === 'boleta' && comprobante.totales.total > 700)
    return {
      estado: 'observado',
      codigo: '4000',
      mensaje: 'Boleta sin documento del adquirente por importe mayor a 700 soles.',
    }
  return { estado: 'aceptado', codigo: '0', mensaje: 'La factura o boleta ha sido aceptada.' }
}

export const comprobantesService = {
  async listar(
    filtro: {
      localId?: string
      estado?: EstadoComprobante
      tipo?: TipoComprobante
      /** AAAA-MM-DD, ambos incluidos. Sin rango se devuelve todo. */
      desde?: string
      hasta?: string
    } = {},
  ): Promise<Comprobante[]> {
    return latencia(
      clonar(
        db.comprobantes
          .filter((c) => {
            const dia = diaLocal(c.fecha)
            return (
              (!filtro.localId || c.localId === filtro.localId) &&
              (!filtro.estado || c.estado === filtro.estado) &&
              (!filtro.tipo || c.tipo === filtro.tipo) &&
              (!filtro.desde || dia >= filtro.desde) &&
              (!filtro.hasta || dia <= filtro.hasta)
            )
          })
          .sort((a, b) => b.fecha.localeCompare(a.fecha)),
      ),
    )
  },

  /** Ventas cobradas que todavía no tienen comprobante: la cola de trabajo. */
  async ventasSinComprobante(localId?: string): Promise<Venta[]> {
    return latencia(
      clonar(
        db.ventas.filter(
          (v) =>
            v.estado === 'cobrada' &&
            (!localId || v.localId === localId) &&
            !db.comprobantes.some(
              (c) => c.ventaId === v.id && c.tipo !== 'notaCredito' && c.estado !== 'rechazado',
            ),
        ),
      ),
    )
  },

  async emitir(datos: DatosEmision, usuarioId?: string): Promise<Comprobante> {
    exigir(usuarioId, 'comprobantes.emitir', 'emitir comprobantes')
    const comprobante = emitir(datos, usuarioId)
    registrar({
      usuarioId,
      localId: comprobante.localId,
      modulo: 'Comprobantes',
      accion: `${etiquetaTipoComprobante[comprobante.tipo]} emitida`,
      detalle: `${comprobante.serie}-${comprobante.numero} · S/ ${comprobante.totales.total.toFixed(2)}${
        comprobante.receptor.documento ? ` · ${comprobante.receptor.documento}` : ''
      }`,
    })
    return latencia(clonar(comprobante))
  },

  /** Manda el comprobante y guarda lo que contestó. Un aceptado ya no se toca. */
  async enviar(id: string, usuarioId?: string): Promise<Comprobante> {
    exigir(usuarioId, 'comprobantes.emitir', 'enviar comprobantes')
    const comprobante = db.comprobantes.find((c) => c.id === id)
    if (!comprobante) throw { mensaje: 'Comprobante no encontrado.' } satisfies ApiError
    if (comprobante.estado === 'aceptado')
      throw { mensaje: 'Ese comprobante ya fue aceptado.' } satisfies ApiError

    const resultado = simularEnvio(comprobante)
    comprobante.estado = resultado.estado
    comprobante.intentos += 1
    comprobante.respuesta = {
      codigo: resultado.codigo,
      mensaje: resultado.mensaje,
      fecha: ahora(),
      cdr:
        resultado.estado === 'aceptado'
          ? `R-${comprobante.serie}-${comprobante.numero}`
          : undefined,
    }
    if (resultado.estado !== 'aceptado')
      registrar({
        usuarioId,
        localId: comprobante.localId,
        modulo: 'Comprobantes',
        accion: `Envío ${etiquetaEstadoComprobante[resultado.estado].toLowerCase()}`,
        detalle: `${comprobante.serie}-${comprobante.numero} · ${resultado.codigo} ${resultado.mensaje}`,
      })
    persistir()
    return latencia(clonar(comprobante))
  },

  /** Corrige los datos de un rechazado y lo deja listo para reintentar. */
  async corregirReceptor(
    id: string,
    receptor: ReceptorComprobante,
    usuarioId?: string,
  ): Promise<Comprobante> {
    exigir(usuarioId, 'comprobantes.emitir', 'corregir comprobantes')
    const comprobante = db.comprobantes.find((c) => c.id === id)
    if (!comprobante) throw { mensaje: 'Comprobante no encontrado.' } satisfies ApiError
    if (comprobante.estado === 'aceptado')
      throw {
        mensaje: 'Un comprobante aceptado no se corrige: se emite una nota de crédito.',
      } satisfies ApiError
    validarReceptor(comprobante.tipo, receptor, comprobante.totales.total, comprobante.localId)
    comprobante.receptor = receptor
    comprobante.estado = 'porEnviar'
    persistir()
    return latencia(clonar(comprobante))
  },

  /**
   * Nota de crédito: anular es emitir otro documento. Total devuelve la venta
   * entera y la deja anulada; parcial solo rebaja el importe indicado.
   */
  async emitirNotaCredito(
    comprobanteId: string,
    datos: { motivo: MotivoNotaCredito; detalle?: string; montoParcial?: number },
    usuarioId?: string,
  ): Promise<Comprobante> {
    exigir(usuarioId, 'comprobantes.anular', 'emitir notas de crédito')
    const original = db.comprobantes.find((c) => c.id === comprobanteId)
    if (!original) throw { mensaje: 'Comprobante no encontrado.' } satisfies ApiError
    if (original.tipo === 'notaCredito')
      throw { mensaje: 'Una nota de crédito no se corrige con otra.' } satisfies ApiError
    if (original.estado !== 'aceptado')
      throw {
        mensaje: 'Solo se emite nota de crédito sobre un comprobante aceptado.',
      } satisfies ApiError
    const previa = db.comprobantes.find((c) => c.referenciaId === original.id)
    if (previa)
      throw {
        mensaje: `Ese comprobante ya tiene la nota de crédito ${previa.serie}-${previa.numero}.`,
      } satisfies ApiError

    const parcial = datos.montoParcial !== undefined
    if (parcial && !(datos.montoParcial! > 0 && datos.montoParcial! <= original.totales.total))
      throw errorCampo(
        'montoParcial',
        `El monto debe estar entre 0 y S/ ${original.totales.total.toFixed(2)}.`,
      )

    const serie = serieDe(original.localId, 'notaCredito')
    serie.correlativo += 1

    const total = parcial ? r2(datos.montoParcial!) : original.totales.total
    const proporcion = original.totales.total ? total / original.totales.total : 0
    const nota: Comprobante = {
      id: nuevoId('cp'),
      tipo: 'notaCredito',
      serie: serie.serie,
      numero: serie.correlativo,
      localId: original.localId,
      ventaId: original.ventaId,
      fecha: ahora(),
      usuarioId,
      receptor: original.receptor,
      totales: {
        valorVenta: r2(original.totales.valorVenta * proporcion),
        igv: r2(original.totales.igv * proporcion),
        tasaIgv: original.totales.tasaIgv,
        recargoConsumo: r2(original.totales.recargoConsumo * proporcion),
        total,
      },
      estado: 'porEnviar',
      intentos: 0,
      referenciaId: original.id,
      motivoNota: datos.motivo,
      notaMotivoTexto: datos.detalle?.trim() || undefined,
    }
    db.comprobantes.push(nota)

    // Una nota total deshace la venta: se anula y lo consumido vuelve al almacén.
    if (!parcial) {
      const venta = db.ventas.find((v) => v.id === original.ventaId)
      if (venta) {
        venta.estado = 'anulada'
        venta.motivoAnulacion = `Nota de crédito ${nota.serie}-${nota.numero}`
        const pedido = db.pedidos.find((x) => x.id === venta.pedidoId)
        if (pedido) {
          devolver(pedido, pedido.lineas, usuarioId)
          pedido.estado = 'anulado'
        }
      }
    }

    registrar({
      usuarioId,
      localId: nota.localId,
      modulo: 'Comprobantes',
      accion: parcial ? 'Nota de crédito parcial' : 'Nota de crédito total',
      detalle: `${nota.serie}-${nota.numero} sobre ${original.serie}-${original.numero} · S/ ${total.toFixed(2)} · ${etiquetaMotivoNota[datos.motivo]}${nota.notaMotivoTexto ? ` · ${nota.notaMotivoTexto}` : ''}`,
    })
    persistir()
    return latencia(clonar(nota))
  },

  /** Comprobante de una venta, y su nota de crédito si la tiene. */
  async deVenta(ventaId: string): Promise<Comprobante[]> {
    return latencia(clonar(db.comprobantes.filter((c) => c.ventaId === ventaId)))
  },

  etiquetaEstadoComprobante,
  etiquetaTipoComprobante,
  etiquetaMotivoNota,
}
