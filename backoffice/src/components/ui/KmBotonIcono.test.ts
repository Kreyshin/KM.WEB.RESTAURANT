import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import KmBotonIcono from './KmBotonIcono.vue'
import { renderizar } from '@/test/renderizar'

/** Simula la celda de una tabla con scroll horizontal, que es donde vive el botón. */
const CeldaConScroll = defineComponent(
  () => () =>
    h('div', { 'data-testid': 'contenedor', style: 'overflow-x: auto' }, [
      h(KmBotonIcono, {
        icono: 'eliminar',
        etiqueta: 'Eliminar',
        contexto: 'Miraflores',
        tono: 'peligro',
      }),
    ]),
)

describe('KmBotonIcono', () => {
  it('el nombre accesible incluye el registro, pero el tooltip solo la acción', async () => {
    const { usuario } = renderizar(CeldaConScroll)
    const boton = screen.getByRole('button', { name: 'Eliminar Miraflores' })

    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
    await usuario.hover(boton)

    expect(screen.getByText('Eliminar')).toBeInTheDocument()
    expect(screen.queryByText('Eliminar Miraflores')).not.toBeInTheDocument()
  })

  it('el tooltip se monta fuera de la tabla para no generar scroll', async () => {
    const { usuario } = renderizar(CeldaConScroll)

    await usuario.hover(screen.getByRole('button', { name: 'Eliminar Miraflores' }))

    const tooltip = screen.getByText('Eliminar')
    expect(screen.getByTestId('contenedor')).not.toContainElement(tooltip)
    expect(tooltip).toHaveClass('fixed')
  })

  it('aparece también con el foco del teclado y desaparece al salir', async () => {
    const { usuario } = renderizar(CeldaConScroll)

    await usuario.tab()
    expect(screen.getByText('Eliminar')).toBeInTheDocument()

    await usuario.tab()
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
  })
})
