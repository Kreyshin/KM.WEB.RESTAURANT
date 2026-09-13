/**
 * Copia profunda para formularios. A diferencia de structuredClone, acepta los
 * proxies reactivos de Vue (datos que vienen de ref/reactive) sin lanzar error.
 */
export function copiar<T>(valor: T): T {
  return valor === undefined ? valor : (JSON.parse(JSON.stringify(valor)) as T)
}
