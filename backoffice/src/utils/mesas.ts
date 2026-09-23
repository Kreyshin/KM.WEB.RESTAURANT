import type { EstadoMesa, FormaMesa } from '@/types'
import type { TonoMesa } from '@/types/ui'

export const estadosMesa: EstadoMesa[] = ['libre', 'ocupada', 'reservada', 'limpieza', 'inactiva']

export const etiquetaEstado: Record<EstadoMesa, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  limpieza: 'En limpieza',
  inactiva: 'Inactiva',
}

/**
 * Estados sobre la paleta del sistema: verde para lo disponible, vino para lo
 * ocupado, latón para lo comprometido y pizarra para lo que está en proceso.
 */
export const tonoEstado: Record<EstadoMesa, TonoMesa> = {
  libre: 'verde',
  ocupada: 'vino',
  reservada: 'laton',
  limpieza: 'pizarra',
  inactiva: 'neutro',
}

/** Clase de tono para el plano del salón (resuelta con color-mix en main.css). */
export const clasePlanoEstado: Record<EstadoMesa, string> = {
  libre: 'rs-tono-verde',
  ocupada: 'rs-tono-vino',
  reservada: 'rs-tono-laton',
  limpieza: 'rs-tono-pizarra',
  inactiva: 'rs-tono-neutro',
}

/**
 * Marca gráfica por estado, para no comunicar el estado únicamente por color.
 * Se dibuja como un pequeño glifo dentro de la mesa en el plano.
 */
export const glifoEstado: Record<EstadoMesa, string> = {
  libre: '○',
  ocupada: '●',
  reservada: '◐',
  limpieza: '◍',
  inactiva: '✕',
}

export const etiquetaForma: Record<FormaMesa, string> = {
  cuadrada: 'Cuadrada',
  redonda: 'Redonda',
  rectangular: 'Rectangular',
}

/** Clases de tamaño/redondeo de la mesa en el plano según su forma. */
export const formaPlano: Record<FormaMesa, string> = {
  cuadrada: 'size-16 rounded-control',
  redonda: 'size-16 rounded-full',
  rectangular: 'h-16 w-24 rounded-control',
}
