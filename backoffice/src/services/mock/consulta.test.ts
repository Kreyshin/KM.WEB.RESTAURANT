import { describe, expect, it } from 'vitest'
import { aplicarConsulta } from './consulta'

interface Fila {
  id: string
  nombre: string
  precio: number
  activo: boolean
}

const filas: Fila[] = [
  { id: '1', nombre: 'Ceviche clásico', precio: 38, activo: true },
  { id: '2', nombre: 'Lomo saltado', precio: 42, activo: true },
  { id: '3', nombre: 'Ají de gallina', precio: 32, activo: false },
  { id: '4', nombre: 'Causa limeña', precio: 24, activo: true },
  { id: '5', nombre: 'Chicha morada', precio: 9, activo: true },
]

describe('aplicarConsulta', () => {
  it('sin consulta devuelve la primera página en el orden original', () => {
    const r = aplicarConsulta(filas)
    expect(r.items.map((f) => f.id)).toEqual(['1', '2', '3', '4', '5'])
    expect(r).toMatchObject({ total: 5, pagina: 1, porPagina: 10 })
  })

  it('busca sin distinguir mayúsculas ni tildes', () => {
    const r = aplicarConsulta(filas, { buscar: 'AJI' }, ['nombre'])
    expect(r.items.map((f) => f.id)).toEqual(['3'])
  })

  it('ignora la búsqueda si no hay campos de búsqueda', () => {
    expect(aplicarConsulta(filas, { buscar: 'lomo' }).total).toBe(5)
  })

  it('filtra por igualdad e ignora filtros vacíos', () => {
    const r = aplicarConsulta(filas, { filtros: { activo: false, nombre: '' } })
    expect(r.items.map((f) => f.id)).toEqual(['3'])
  })

  it('ordena números y textos en ambas direcciones', () => {
    const asc = aplicarConsulta(filas, { orden: { campo: 'precio', direccion: 'asc' } })
    expect(asc.items[0]!.precio).toBe(9)
    const desc = aplicarConsulta(filas, { orden: { campo: 'nombre', direccion: 'desc' } })
    expect(desc.items[0]!.nombre).toBe('Lomo saltado')
  })

  it('pagina y reporta el total antes de paginar', () => {
    const r = aplicarConsulta(filas, { pagina: 2, porPagina: 2 })
    expect(r.items.map((f) => f.id)).toEqual(['3', '4'])
    expect(r.total).toBe(5)
  })

  it('ajusta una página fuera de rango a la última existente', () => {
    const r = aplicarConsulta(filas, { pagina: 9, porPagina: 2 })
    expect(r.pagina).toBe(3)
    expect(r.items.map((f) => f.id)).toEqual(['5'])
  })

  it('no muta la colección original', () => {
    aplicarConsulta(filas, { orden: { campo: 'precio', direccion: 'asc' } })
    expect(filas[0]!.id).toBe('1')
  })
})
