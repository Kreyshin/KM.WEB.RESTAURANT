import { describe, expect, it } from 'vitest'
import { aFechaIso, atajoDeRango, diaLocal, diaRelativo, hoyLocal, rangoDeAtajo } from './fechas'

// Sábado 12 de septiembre de 2026, 21:30 hora local.
const hoy = new Date(2026, 8, 12, 21, 30)

describe('rangoDeAtajo', () => {
  it('usa la fecha local y no la UTC', () => {
    expect(aFechaIso(hoy)).toBe('2026-09-12')
  })

  it('calcula los atajos relativos a hoy', () => {
    expect(rangoDeAtajo('ayer', hoy)).toEqual({ desde: '2026-09-11', hasta: '2026-09-11' })
    expect(rangoDeAtajo('ultimos7', hoy)).toEqual({ desde: '2026-09-06', hasta: '2026-09-12' })
    expect(rangoDeAtajo('esteMes', hoy)).toEqual({ desde: '2026-09-01', hasta: '2026-09-12' })
  })

  it('el mes anterior cubre el mes natural completo', () => {
    expect(rangoDeAtajo('mesAnterior', hoy)).toEqual({ desde: '2026-08-01', hasta: '2026-08-31' })
    expect(rangoDeAtajo('mesAnterior', new Date(2026, 0, 15))).toEqual({
      desde: '2025-12-01',
      hasta: '2025-12-31',
    })
  })
})

describe('atajoDeRango', () => {
  it('reconoce un atajo y devuelve null para un rango libre', () => {
    expect(atajoDeRango({ desde: '2026-09-06', hasta: '2026-09-12' }, hoy)).toBe('ultimos7')
    expect(atajoDeRango({ desde: '2026-09-02', hasta: '2026-09-05' }, hoy)).toBeNull()
  })
})

describe('el día del restaurante', () => {
  // 21:30 en Lima ya es el día siguiente en UTC: ahí se rompía todo.
  const noche = new Date(2026, 8, 12, 21, 30)

  it('toma el día local de una marca ISO, no el de Greenwich', () => {
    expect(diaLocal(noche.toISOString())).toBe('2026-09-12')
  })

  it('acepta fecha, marca o número, y sin argumento da hoy', () => {
    expect(diaLocal(noche)).toBe('2026-09-12')
    expect(diaLocal(noche.getTime())).toBe('2026-09-12')
    expect(hoyLocal()).toBe(aFechaIso(new Date()))
  })

  it('cuenta días hacia adelante y hacia atrás', () => {
    expect(diaRelativo(0)).toBe(hoyLocal())
    expect(diaRelativo(1)).not.toBe(hoyLocal())
  })
})
