import { screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import KmTable from './KmTable.vue'
import { renderizar } from '@/test/renderizar'

/**
 * Patrón de una prueba de componente (Arrange · Act · Assert):
 * 1. Montar con props concretas.
 * 2. Interactuar como lo haría una persona (clic, teclado).
 * 3. Comprobar lo que se VE en pantalla o lo que el componente EMITE,
 *    nunca detalles internos como variables o clases CSS.
 */

const columnas = [
  { clave: 'nombre', etiqueta: 'Plato', ordenable: true },
  { clave: 'precio', etiqueta: 'Precio' },
]
const filas = [
  { id: '1', nombre: 'Ceviche', precio: 38 },
  { id: '2', nombre: 'Lomo saltado', precio: 48 },
]

describe('KmTable', () => {
  it('pinta una fila por registro con sus valores', () => {
    renderizar(KmTable, { props: { columnas, filas } })

    const cuerpo = screen.getAllByRole('rowgroup')[1]!
    expect(within(cuerpo).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByText('Lomo saltado')).toBeInTheDocument()
  })

  it('muestra el mensaje vacío cuando no hay filas', () => {
    renderizar(KmTable, { props: { columnas, filas: [], mensajeVacio: 'Aún no hay platos.' } })

    expect(screen.getByText('Aún no hay platos.')).toBeInTheDocument()
  })

  it('en error sustituye el cuerpo y emite «reintentar» al pulsar el botón', async () => {
    const { usuario, emitted } = renderizar(KmTable, {
      props: { columnas, filas, error: 'Error de red simulado.' },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Error de red simulado.')
    expect(screen.queryByText('Ceviche')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(emitted('reintentar')).toHaveLength(1)
  })

  it('el orden de una columna cicla asc → desc → sin orden', async () => {
    const { usuario, emitted, rerender } = renderizar(KmTable, { props: { columnas, filas } })
    const cabecera = () => screen.getByRole('button', { name: /Plato/ })

    // Solo las columnas ordenables tienen botón.
    expect(screen.queryByRole('button', { name: /Precio/ })).not.toBeInTheDocument()

    await usuario.click(cabecera())
    expect(emitted('update:orden')!.at(-1)).toEqual([{ campo: 'nombre', direccion: 'asc' }])

    // El padre devuelve el valor (v-model): lo simulamos con rerender.
    await rerender({ orden: { campo: 'nombre', direccion: 'asc' } })
    expect(screen.getByRole('columnheader', { name: /Plato/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    await usuario.click(cabecera())
    expect(emitted('update:orden')!.at(-1)).toEqual([{ campo: 'nombre', direccion: 'desc' }])

    await rerender({ orden: { campo: 'nombre', direccion: 'desc' } })
    await usuario.click(cabecera())
    expect(emitted('update:orden')!.at(-1)).toEqual([undefined])
  })
})

describe('KmTable · tandas', () => {
  /** Una carta grande: nadie lee mil filas seguidas y el navegador las sufre. */
  const muchas = Array.from({ length: 400 }, (_, i) => ({
    id: String(i),
    nombre: `Plato ${i}`,
    precio: i,
  }))

  it('pinta solo la primera tanda y dice cuántas hay', () => {
    renderizar(KmTable, { props: { columnas, filas: muchas, limiteInicial: 50 } })
    expect(screen.getAllByRole('row')).toHaveLength(52) // 50 filas + cabecera + «mostrar más»
    expect(screen.getByText('50 de 400')).toBeInTheDocument()
  })

  it('«mostrar más» añade otra tanda sin perder lo anterior', async () => {
    const { usuario } = renderizar(KmTable, {
      props: { columnas, filas: muchas, limiteInicial: 50 },
    })
    await usuario.click(screen.getByRole('button', { name: /Mostrar 50 más/ }))
    expect(screen.getByText('100 de 400')).toBeInTheDocument()
    expect(screen.getByText('Plato 0')).toBeInTheDocument()
    expect(screen.getByText('Plato 99')).toBeInTheDocument()
  })

  it('sin pasar del límite no estorba con controles', () => {
    renderizar(KmTable, { props: { columnas, filas } })
    expect(screen.queryByRole('button', { name: /Mostrar/ })).not.toBeInTheDocument()
  })

  it('al cambiar el filtro vuelve a la primera tanda', async () => {
    const { usuario, rerender } = renderizar(KmTable, {
      props: { columnas, filas: muchas, limiteInicial: 50 },
    })
    await usuario.click(screen.getByRole('button', { name: /Mostrar 50 más/ }))
    expect(screen.getByText('100 de 400')).toBeInTheDocument()

    await rerender({ filas: muchas.slice(0, 300) })
    expect(screen.getByText('50 de 300')).toBeInTheDocument()
  })
})
