import { describe, expect, it } from 'vitest'
import { desglosarTicket } from './impuestos'

const base = {
  igvPorcentaje: 18,
  preciosIncluyenIgv: true,
  recargoConsumoActivo: false,
  recargoConsumoPorcentaje: 10,
}

describe('desglosarTicket', () => {
  it('extrae el IGV de un precio que lo incluye', () => {
    expect(desglosarTicket(118, base)).toEqual({
      baseImponible: 100,
      igv: 18,
      recargo: 0,
      total: 118,
    })
  })

  it('suma el IGV cuando los precios no lo incluyen', () => {
    expect(desglosarTicket(100, { ...base, preciosIncluyenIgv: false }).total).toBe(118)
  })

  it('calcula el recargo al consumo sobre el valor sin IGV', () => {
    const r = desglosarTicket(118, { ...base, recargoConsumoActivo: true })
    expect(r.recargo).toBe(10)
    expect(r.total).toBe(128)
  })

  it('no aplica recargo en un canal excluido', () => {
    expect(desglosarTicket(118, { ...base, recargoConsumoActivo: true }, false).recargo).toBe(0)
  })

  it('redondea a céntimos', () => {
    const r = desglosarTicket(45.9, base)
    expect(r.baseImponible).toBe(38.9)
    expect(r.igv).toBe(7)
  })
})
