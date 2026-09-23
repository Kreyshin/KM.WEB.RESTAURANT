import type { Alergeno, CategoriaInsumo, TipoMovimiento, UnidadMedida } from '@/types'
import type { TonoMesa } from '@/types/ui'

const soles = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
})

export function formatearSoles(valor: number) {
  return soles.format(valor)
}

const fechaCorta = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatearFecha(iso: string) {
  return fechaCorta.format(new Date(iso))
}

/** Cantidad con su unidad, sin ceros decimales sobrantes. */
export function formatearCantidad(cantidad: number, unidad: UnidadMedida) {
  const numero = Number(cantidad.toFixed(3)).toLocaleString('es-PE')
  return `${numero} ${etiquetaUnidad[unidad]}`
}

export const etiquetaUnidad: Record<UnidadMedida, string> = {
  kg: 'kg',
  g: 'g',
  l: 'L',
  ml: 'ml',
  unidad: 'u.',
  paquete: 'paq.',
}

export const unidadesMedida: UnidadMedida[] = ['kg', 'g', 'l', 'ml', 'unidad', 'paquete']

export const alergenos: Alergeno[] = [
  'gluten',
  'lacteos',
  'huevo',
  'pescado',
  'mariscos',
  'frutosSecos',
  'soya',
  'aji',
]

export const etiquetaAlergeno: Record<Alergeno, string> = {
  gluten: 'Gluten',
  lacteos: 'Lácteos',
  huevo: 'Huevo',
  pescado: 'Pescado',
  mariscos: 'Mariscos',
  frutosSecos: 'Frutos secos',
  soya: 'Soya',
  aji: 'Ají',
}

/** Tipos que se registran a mano; el resto los generan traslados, tomas y producción. */
export const tiposMovimiento: TipoMovimiento[] = ['entrada', 'salida', 'merma', 'ajuste']

export const etiquetaMovimiento: Record<TipoMovimiento, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  merma: 'Merma',
  ajuste: 'Ajuste',
  trasladoSalida: 'Traslado (sale)',
  trasladoEntrada: 'Traslado (llega)',
  produccion: 'Producción',
  consumoProduccion: 'Consumo en producción',
}

export const tonoMovimiento: Record<TipoMovimiento, TonoMesa> = {
  entrada: 'verde',
  salida: 'pizarra',
  merma: 'vino',
  ajuste: 'laton',
  trasladoSalida: 'neutro',
  trasladoEntrada: 'neutro',
  produccion: 'verde',
  consumoProduccion: 'pizarra',
}

/** Efecto de cada tipo sobre el stock. */
export const signoNumerico: Record<TipoMovimiento, 1 | -1> = {
  entrada: 1,
  salida: -1,
  merma: -1,
  ajuste: 1,
  trasladoSalida: -1,
  trasladoEntrada: 1,
  produccion: 1,
  consumoProduccion: -1,
}

/** Signo visible del movimiento, para leer el kardex de un vistazo. */
export const signoMovimiento = Object.fromEntries(
  Object.entries(signoNumerico).map(([t, s]) => [t, s > 0 ? '+' : '−']),
) as Record<TipoMovimiento, string>

export const etiquetaCategoriaInsumo: Record<CategoriaInsumo, string> = {
  carnes: 'Carnes y aves',
  pescados: 'Pescados y mariscos',
  verduras: 'Frutas y verduras',
  abarrotes: 'Abarrotes',
  lacteos: 'Lácteos y huevos',
  bebidas: 'Bebidas y licores',
  descartables: 'Descartables',
  preparaciones: 'Preparaciones',
}
