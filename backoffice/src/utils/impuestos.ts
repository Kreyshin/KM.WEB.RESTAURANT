import type { ConfigImpuestos } from '@/types'

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export interface DesgloseTicket {
  baseImponible: number
  igv: number
  recargo: number
  total: number
}

/**
 * Desglose de una cuenta de salón.
 *
 * El recargo al consumo se calcula sobre el valor de venta (sin IGV) y, según
 * la normativa, no está gravado con IGV. `aplicaRecargo` permite simular un
 * canal donde no se cobra.
 */
export function desglosarTicket(
  consumo: number,
  config: Pick<
    ConfigImpuestos,
    'igvPorcentaje' | 'preciosIncluyenIgv' | 'recargoConsumoActivo' | 'recargoConsumoPorcentaje'
  >,
  aplicaRecargo = true,
): DesgloseTicket {
  const tasa = config.igvPorcentaje / 100
  const baseImponible = config.preciosIncluyenIgv ? consumo / (1 + tasa) : consumo
  const igv = baseImponible * tasa
  const recargo =
    config.recargoConsumoActivo && aplicaRecargo
      ? baseImponible * (config.recargoConsumoPorcentaje / 100)
      : 0

  const base = redondear(baseImponible)
  const igvR = redondear(igv)
  const recargoR = redondear(recargo)
  return {
    baseImponible: base,
    igv: igvR,
    recargo: recargoR,
    total: redondear(base + igvR + recargoR),
  }
}
