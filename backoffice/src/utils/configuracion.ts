import type {
  DiaSemana,
  TipoCanal,
  TipoComprobante,
  TipoMedioPago,
  OperacionMotivo,
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
  salon: 'En mesa',
  llevar: 'Mostrador o para llevar',
  delivery: 'Reparto propio',
  plataforma: 'App de delivery',
}

/** Qué pide la operación en cada modalidad. Se aplicará al tomar pedidos (Ventas, F7). */
export const ayudaTipoCanal: Record<TipoCanal, string> = {
  salon: 'Pide mesa y mesero. Permite dividir la cuenta.',
  llevar: 'Sin mesa: pide nombre o número de turno del cliente.',
  delivery: 'Pide dirección, zona y repartidor. Puede cobrar envío.',
  plataforma: 'El pedido llega de una app que cobra comisión y entrega ella.',
}
export const opcionesTipoCanal = opciones(etiquetaTipoCanal)

export const etiquetaUsoImpresora: Record<UsoImpresora, string> = {
  comandas: 'Comandas',
  precuentas: 'Precuentas',
  comprobantes: 'Comprobantes',
}
export const opcionesUsoImpresora = opciones(etiquetaUsoImpresora)

/** Dónde se pide un motivo. La lista es cerrada (D-017): son puntos del flujo. */
export const etiquetaOperacionMotivo: Record<OperacionMotivo, string> = {
  anularProducto: 'Anular un producto comandado',
  anularVenta: 'Anular una venta cobrada',
  descuento: 'Descontar sobre el precio',
  cortesia: 'Invitar un producto',
  merma: 'Dar de baja por merma',
  cancelarReserva: 'Cancelar una reserva o «no vino»',
  rechazarRecepcion: 'Rechazar una recepción',
}
export const opcionesOperacionMotivo = opciones(etiquetaOperacionMotivo)

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
