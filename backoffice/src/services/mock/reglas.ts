import type { ApiError } from '@/types'

/** Error de validación ligado a un campo del formulario. */
export function errorCampo(campo: string, mensaje: string, detalle = mensaje): ApiError {
  return { mensaje, campos: { [campo]: detalle } }
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

/** ¿Hay otro registro (distinto de `id`) con el mismo texto, sin distinguir tildes ni mayúsculas? */
export function existeOtro<T extends { id: string }>(
  items: readonly T[],
  valor: (item: T) => string,
  texto: string,
  id?: string,
) {
  const buscado = normalizar(texto)
  return items.some((i) => i.id !== id && normalizar(valor(i)) === buscado)
}

/** Porcentaje entre 0 y `maximo`, con dos decimales como mucho. */
export function esPorcentaje(valor: number, maximo = 100) {
  return Number.isFinite(valor) && valor >= 0 && valor <= maximo
}
