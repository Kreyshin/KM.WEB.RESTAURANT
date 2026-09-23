import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import KmTabs from './KmTabs.vue'
import { renderizar } from '@/test/renderizar'

const pestanas = [
  { valor: 'estaciones', etiqueta: 'Estaciones' },
  { valor: 'impresoras', etiqueta: 'Impresoras', contador: 4 },
  { valor: 'motivos', etiqueta: 'Motivos' },
]

/**
 * Para probar un v-model de verdad se monta un pequeño padre que guarda el
 * valor, igual que lo usaría una vista.
 */
const Padre = defineComponent(() => {
  const activa = ref('estaciones')
  return () =>
    h(
      KmTabs,
      {
        pestanas,
        etiqueta: 'Producción',
        modelValue: activa.value,
        'onUpdate:modelValue': (v: string) => (activa.value = v),
      },
      { default: () => h('p', `Panel de ${activa.value}`) },
    )
})

describe('KmTabs', () => {
  it('marca la pestaña activa y muestra su panel', () => {
    renderizar(Padre)

    expect(screen.getByRole('tab', { name: 'Estaciones' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel de estaciones')
  })

  it('cambia de pestaña con clic', async () => {
    const { usuario } = renderizar(Padre)

    await usuario.click(screen.getByRole('tab', { name: /Impresoras/ }))

    expect(screen.getByRole('tab', { name: /Impresoras/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel de impresoras')
  })

  it('se maneja con teclado: flechas, Inicio y Fin, con foco en la activa', async () => {
    const { usuario } = renderizar(Padre)
    screen.getByRole('tab', { name: 'Estaciones' }).focus()

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Impresoras/ })).toHaveFocus()

    await usuario.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Motivos' })).toHaveAttribute('aria-selected', 'true')

    // Desde la última, la flecha derecha vuelve a la primera.
    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Estaciones' })).toHaveFocus()

    await usuario.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel de motivos')
  })

  it('solo la pestaña activa entra en el orden de tabulación', () => {
    renderizar(Padre)

    const tabindex = screen.getAllByRole('tab').map((t) => t.getAttribute('tabindex'))
    expect(tabindex).toEqual(['0', '-1', '-1'])
  })
})
