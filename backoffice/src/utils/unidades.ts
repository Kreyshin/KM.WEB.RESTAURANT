import type { Insumo, UnidadOperativa } from '@/types'
import { etiquetaUnidad } from './formato'

/**
 * Unidades de operación del restaurante. El stock vive siempre en la unidad
 * del insumo; pedir y recepcionar usan su propia unidad con una equivalencia
 * fija. Las conversiones completas (presentaciones de proveedor, etc.) son del
 * ERP: aquí solo se aplica el factor que llega.
 */
export type UsoUnidad = 'pedido' | 'recepcion'

type InsumoUnidades = Pick<Insumo, 'unidad' | 'unidadPedido' | 'unidadRecepcion'>

export function unidadOperativa(
  insumo: InsumoUnidades | undefined,
  uso: UsoUnidad,
): UnidadOperativa {
  const propia = uso === 'pedido' ? insumo?.unidadPedido : insumo?.unidadRecepcion
  if (propia && propia.factor > 0) return propia
  return { nombre: etiquetaUnidad[insumo?.unidad ?? 'unidad'], factor: 1 }
}

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000

export const aBase = (insumo: InsumoUnidades | undefined, uso: UsoUnidad, cantidad: number) =>
  r3(cantidad * unidadOperativa(insumo, uso).factor)

export const deBase = (insumo: InsumoUnidades | undefined, uso: UsoUnidad, cantidad: number) =>
  r3(cantidad / unidadOperativa(insumo, uso).factor)

/** «2 Jabas (60 u)» cuando la unidad no es la del stock. */
export function textoOperativo(
  insumo: InsumoUnidades | undefined,
  uso: UsoUnidad,
  cantidad: number,
) {
  const u = unidadOperativa(insumo, uso)
  const base = etiquetaUnidad[insumo?.unidad ?? 'unidad']
  return u.factor === 1 && u.nombre === base
    ? `${r3(cantidad)} ${base}`
    : `${r3(cantidad)} ${u.nombre} (${r3(cantidad * u.factor)} ${base})`
}
