import { describe, expect, it } from 'vitest'
import { aCsv, aExcel, nombreArchivo, type ColumnaExportable } from './exportar'

interface Fila {
  nombre: string
  precio: number
  activo: boolean
}

const columnas: ColumnaExportable<Fila>[] = [
  { etiqueta: 'Nombre', valor: (f) => f.nombre },
  { etiqueta: 'Precio', valor: (f) => f.precio },
  { etiqueta: 'Activo', valor: (f) => f.activo },
]

describe('aCsv', () => {
  it('empieza con BOM, usa punto y coma y traduce booleanos', () => {
    const csv = aCsv([{ nombre: 'Causa', precio: 24, activo: true }], columnas)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual(['Nombre;Precio;Activo', 'Causa;24;Sí'])
  })

  it('entrecomilla valores con separador, comillas o saltos de línea', () => {
    const csv = aCsv([{ nombre: 'Pisco "sour"; doble', precio: 18, activo: false }], columnas)
    expect(csv).toContain('"Pisco ""sour""; doble";18;No')
  })
})

describe('aExcel', () => {
  it('escribe números como Number y escapa el texto', () => {
    const xml = aExcel([{ nombre: 'Tacu <tacu> & huevo', precio: 35.5, activo: true }], columnas)
    expect(xml).toContain('<Data ss:Type="Number">35.5</Data>')
    expect(xml).toContain('Tacu &lt;tacu&gt; &amp; huevo')
    expect(xml).toContain('<Row ss:StyleID="cab">')
  })
})

describe('nombreArchivo', () => {
  it('añade la fecha en formato ISO', () => {
    expect(nombreArchivo('salones', 'csv', new Date(2026, 8, 12))).toBe('salones-2026-09-12.csv')
  })
})
