import type { HorarioDia, TipoComprobante } from '@/types'

/**
 * RUC peruano: 11 dígitos, prefijo válido y dígito verificador módulo 11.
 * Prefijos: 10 persona natural, 15 y 17 no domiciliados, 20 persona jurídica.
 */
export function validarRuc(ruc: string): boolean {
  if (!/^(10|15|17|20)\d{9}$/.test(ruc)) return false
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((total, peso, i) => total + peso * Number(ruc[i]), 0)
  const resto = 11 - (suma % 11)
  const verificador = resto === 10 ? 0 : resto === 11 ? 1 : resto
  return verificador === Number(ruc[10])
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

export function validarIpv4(ip: string): boolean {
  const partes = ip.split('.')
  return (
    partes.length === 4 &&
    partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255 && String(Number(p)) === p)
  )
}

/**
 * Formato de serie según SUNAT: la primera letra identifica el comprobante
 * electrónico (B boleta, F factura); las notas de crédito heredan la letra del
 * comprobante que modifican. La nota de venta es interna y admite cualquier
 * combinación alfanumérica.
 */
const formatoSerie: Record<TipoComprobante, RegExp> = {
  boleta: /^B[A-Z0-9]{3}$/,
  factura: /^F[A-Z0-9]{3}$/,
  notaCredito: /^[BF][A-Z0-9]{3}$/,
  notaVenta: /^[A-Z0-9]{4}$/,
}

export const ejemploSerie: Record<TipoComprobante, string> = {
  boleta: 'B001',
  factura: 'F001',
  notaCredito: 'BC01 o FC01',
  notaVenta: 'NV01',
}

export function validarSerie(tipo: TipoComprobante, serie: string): boolean {
  return formatoSerie[tipo].test(serie)
}

/** `B001-00000123`: el correlativo se muestra siempre con 8 dígitos. */
export function formatearNumeroComprobante(serie: string, correlativo: number) {
  return `${serie}-${String(correlativo).padStart(8, '0')}`
}

function aMinutos(hora: string) {
  const [h = 0, m = 0] = hora.split(':').map(Number)
  return h * 60 + m
}

/** Errores por día (índice del día → mensaje). Vacío si el horario es válido. */
export function validarHorario(horario: HorarioDia[]): Record<number, string> {
  const errores: Record<number, string> = {}
  for (const d of horario) {
    if (!d.abierto) continue
    if (!/^\d{2}:\d{2}$/.test(d.apertura) || !/^\d{2}:\d{2}$/.test(d.cierre)) {
      errores[d.dia] = 'Indica la hora de apertura y de cierre.'
    } else if (d.apertura === d.cierre) {
      errores[d.dia] = 'La apertura y el cierre no pueden coincidir.'
    }
  }
  return errores
}

/** Duración de un turno en minutos; si cruza la medianoche, suma el día siguiente. */
export function duracionTurno(apertura: string, cierre: string) {
  const inicio = aMinutos(apertura)
  const fin = aMinutos(cierre)
  return fin > inicio ? fin - inicio : 24 * 60 - inicio + fin
}
