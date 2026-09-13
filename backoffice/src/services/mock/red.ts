/**
 * Condiciones de red simuladas para el modo mock.
 *
 * Permiten ver cada pantalla con red lenta o con fallos sin necesitar backend.
 * Se ajustan desde el panel «Datos de ejemplo» y se guardan en el navegador.
 */

import type { ApiError } from '@/types'

export interface ConfigRed {
  /** Retardo de cada respuesta, en milisegundos. */
  latenciaMs: number
  /** Probabilidad de que una llamada falle, de 0 a 1. */
  tasaError: number
}

const CLAVE = 'km.restaurante.mock.red'

export const configRedDefecto: ConfigRed = { latenciaMs: 220, tasaError: 0 }

function cargar(): ConfigRed {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) return { ...configRedDefecto, ...(JSON.parse(crudo) as Partial<ConfigRed>) }
  } catch {
    // Sin almacenamiento disponible: se usan los valores por defecto.
  }
  return { ...configRedDefecto }
}

export const configRed: ConfigRed = cargar()

export function guardarConfigRed(cambios: Partial<ConfigRed>) {
  Object.assign(configRed, cambios)
  try {
    localStorage.setItem(CLAVE, JSON.stringify(configRed))
  } catch {
    // Sin persistencia: el ajuste dura lo que la pestaña.
  }
}

export const errorSimulado: ApiError = {
  mensaje: 'Error de red simulado. Vuelve a intentarlo.',
}

/**
 * Resuelve con una copia del valor tras la latencia configurada, o rechaza
 * con `errorSimulado` según la tasa de error.
 */
export function simularRed<T>(valor: T, ms = configRed.latenciaMs): Promise<T> {
  // Se copia antes de esperar: si falla, rechaza en vez de perderse dentro del temporizador.
  const copia = clonar(valor)
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (configRed.tasaError > 0 && Math.random() < configRed.tasaError) reject(errorSimulado)
      else resolve(copia)
    }, ms),
  )
}

/**
 * Copia profunda por JSON, igual que viajarían los datos por HTTP. A diferencia
 * de structuredClone, admite los proxies reactivos que llegan desde formularios,
 * y garantiza que la base mock nunca comparta referencias con una vista.
 */
export function clonar<T>(valor: T): T {
  return valor === undefined ? valor : (JSON.parse(JSON.stringify(valor)) as T)
}
