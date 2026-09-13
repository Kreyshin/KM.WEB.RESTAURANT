import type {
  DiaSemana,
  EstadoOrdenCompra,
  EstadoToma,
  TipoCombo,
  TipoCanal,
  TipoComprobante,
  TipoMedioPago,
  TipoMotivo,
  UsoImpresora,
} from '@/types'
import type { OpcionSelect, TonoMesa } from '@/types/ui'

const opciones = <K extends string>(etiquetas: Record<K, string>): OpcionSelect[] =>
  (Object.keys(etiquetas) as K[]).map((valor) => ({ valor, etiqueta: etiquetas[valor] }))

export const etiquetaDia: Record<DiaSemana, string> = {
  0: 'Lunes',
  1: 'Martes',
  2: 'Miércoles',
  3: 'Jueves',
  4: 'Viernes',
  5: 'Sábado',
  6: 'Domingo',
}

export const etiquetaTipoMedioPago: Record<TipoMedioPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  billetera: 'Billetera digital',
  transferencia: 'Transferencia',
  credito: 'Crédito',
}
export const opcionesTipoMedioPago = opciones(etiquetaTipoMedioPago)

export const etiquetaTipoCanal: Record<TipoCanal, string> = {
  salon: 'Salón',
  llevar: 'Para llevar',
  delivery: 'Delivery propio',
  plataforma: 'Plataforma externa',
}
export const opcionesTipoCanal = opciones(etiquetaTipoCanal)

export const etiquetaUsoImpresora: Record<UsoImpresora, string> = {
  comandas: 'Comandas',
  precuentas: 'Precuentas',
  comprobantes: 'Comprobantes',
}
export const opcionesUsoImpresora = opciones(etiquetaUsoImpresora)

export const etiquetaTipoMotivo: Record<TipoMotivo, string> = {
  anulacion: 'Anulación',
  descuento: 'Descuento',
  cortesia: 'Cortesía',
}

export const etiquetaTipoComprobante: Record<TipoComprobante, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
  notaCredito: 'Nota de crédito',
  notaVenta: 'Nota de venta',
}
export const opcionesTipoComprobante = opciones(etiquetaTipoComprobante)

export const tonoTipoComprobante: Record<TipoComprobante, TonoMesa> = {
  boleta: 'verde',
  factura: 'pizarra',
  notaCredito: 'vino',
  notaVenta: 'neutro',
}

export const etiquetaEstadoOrden: Record<EstadoOrdenCompra, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  parcial: 'Recibida en parte',
  recibida: 'Recibida',
  anulada: 'Anulada',
}

export const tonoEstadoOrden: Record<EstadoOrdenCompra, TonoMesa> = {
  borrador: 'neutro',
  emitida: 'pizarra',
  parcial: 'laton',
  recibida: 'verde',
  anulada: 'vino',
}

export const etiquetaEstadoToma: Record<EstadoToma, string> = {
  abierta: 'Abierta',
  aplicada: 'Aplicada',
  anulada: 'Anulada',
}

export const tonoEstadoToma: Record<EstadoToma, TonoMesa> = {
  abierta: 'laton',
  aplicada: 'verde',
  anulada: 'neutro',
}

export const etiquetaTipoCombo: Record<TipoCombo, string> = {
  combo: 'Combo',
  menuDia: 'Menú del día',
}
