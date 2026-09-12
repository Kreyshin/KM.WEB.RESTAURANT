import type { Alergeno, TipoMovimiento, UnidadMedida } from '@/types'
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

export const tiposMovimiento: TipoMovimiento[] = ['entrada', 'salida', 'merma', 'ajuste']

export const etiquetaMovimiento: Record<TipoMovimiento, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  merma: 'Merma',
  ajuste: 'Ajuste',
}

export const tonoMovimiento: Record<TipoMovimiento, TonoMesa> = {
  entrada: 'verde',
  salida: 'pizarra',
  merma: 'vino',
  ajuste: 'laton',
}

/** Signo visible del movimiento, para leer el kardex de un vistazo. */
export const signoMovimiento: Record<TipoMovimiento, string> = {
  entrada: '+',
  salida: '−',
  merma: '−',
  ajuste: '+',
}
