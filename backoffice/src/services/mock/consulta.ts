import type { Consulta, Paginado } from '@/types'

/** Tamaño de página cuando la consulta no indica uno. */
export const POR_PAGINA_DEFECTO = 10

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function comparar(a: unknown, b: unknown) {
  if (a === b) return 0
  if (a === undefined || a === null) return 1
  if (b === undefined || b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return a ? -1 : 1
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
}

/**
 * Aplica búsqueda, filtros, orden y paginación sobre una colección en memoria.
 * Es exactamente lo que hará el backend con la misma `Consulta`, así que las
 * vistas ya se construyen contra el comportamiento definitivo.
 *
 * @param camposBusqueda campos de texto donde busca `consulta.buscar`
 *   (sin distinguir mayúsculas ni tildes).
 */
export function aplicarConsulta<T extends object>(
  items: readonly T[],
  consulta: Consulta = {},
  camposBusqueda: (keyof T)[] = [],
): Paginado<T> {
  let resultado = [...items]
  const registro = (item: T) => item as Record<string, unknown>

  const termino = consulta.buscar?.trim()
  if (termino && camposBusqueda.length) {
    const buscado = normalizar(termino)
    resultado = resultado.filter((item) =>
      camposBusqueda.some((campo) => {
        const valor = item[campo]
        return valor !== undefined && valor !== null && normalizar(String(valor)).includes(buscado)
      }),
    )
  }

  for (const [campo, valor] of Object.entries(consulta.filtros ?? {})) {
    if (valor === undefined || valor === '') continue
    resultado = resultado.filter((item) => registro(item)[campo] === valor)
  }

  if (consulta.orden) {
    const { campo, direccion } = consulta.orden
    const signo = direccion === 'desc' ? -1 : 1
    resultado.sort((a, b) => signo * comparar(registro(a)[campo], registro(b)[campo]))
  }

  const total = resultado.length
  const porPagina = Math.max(1, consulta.porPagina ?? POR_PAGINA_DEFECTO)
  const ultimaPagina = Math.max(1, Math.ceil(total / porPagina))
  const pagina = Math.min(Math.max(1, consulta.pagina ?? 1), ultimaPagina)
  const inicio = (pagina - 1) * porPagina

  return { items: resultado.slice(inicio, inicio + porPagina), total, pagina, porPagina }
}
