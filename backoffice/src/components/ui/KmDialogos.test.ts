import { screen, waitFor } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { renderizar } from '@/test/renderizar'
import KmDrawer from './KmDrawer.vue'
import KmModal from './KmModal.vue'

/**
 * F10 · Accesibilidad de los diálogos: mientras uno está abierto, el teclado le
 * pertenece. Se cierra con Escape, el foco entra, no se escapa al fondo y
 * vuelve al botón que lo abrió.
 */

/** Monta el diálogo con un botón detrás, que es lo que hay en la app de verdad. */
function anfitrion(dialogo: typeof KmModal | typeof KmDrawer) {
  return defineComponent({
    setup() {
      const abierto = ref(false)
      return { abierto }
    },
    render() {
      return h('div', [
        h(
          'button',
          { onClick: () => (this.abierto = true), 'data-testid': 'abrir' },
          'Abrir diálogo',
        ),
        h('button', { 'data-testid': 'fondo' }, 'Botón del fondo'),
        h(
          dialogo,
          {
            modelValue: this.abierto,
            'onUpdate:modelValue': (v: boolean) => (this.abierto = v),
            titulo: 'Título del diálogo',
            subtitulo: 'Con su subtítulo',
          },
          {
            default: () => [
              h('input', { 'aria-label': 'Primero' }),
              h('input', { 'aria-label': 'Segundo' }),
            ],
            footer: () => h('button', 'Guardar'),
          },
        ),
      ])
    },
  })
}

describe.each([
  ['KmModal', KmModal],
  ['KmDrawer', KmDrawer],
])('%s', (_nombre, componente) => {
  it('tiene nombre accesible tomado de su título', async () => {
    const { usuario } = renderizar(anfitrion(componente))
    await usuario.click(screen.getByTestId('abrir'))
    const dialogo = await screen.findByRole('dialog', { name: 'Título del diálogo' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveTextContent('Con su subtítulo')
  })

  it('lleva el foco dentro al abrirse', async () => {
    const { usuario } = renderizar(anfitrion(componente))
    await usuario.click(screen.getByTestId('abrir'))
    const dialogo = await screen.findByRole('dialog')
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))
  })

  it('el tabulador no se escapa al fondo', async () => {
    const { usuario } = renderizar(anfitrion(componente))
    await usuario.click(screen.getByTestId('abrir'))
    const dialogo = await screen.findByRole('dialog')
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))

    // Una vuelta completa: el foco sigue dentro, nunca en el botón del fondo.
    for (let i = 0; i < 6; i++) {
      await usuario.tab()
      expect(dialogo.contains(document.activeElement)).toBe(true)
    }
    expect(document.activeElement).not.toBe(screen.getByTestId('fondo'))
  })

  it('Escape lo cierra y el foco vuelve a quien lo abrió', async () => {
    const { usuario } = renderizar(anfitrion(componente))
    const abrir = screen.getByTestId('abrir')
    await usuario.click(abrir)
    await screen.findByRole('dialog')

    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(abrir))
  })

  it('devuelve el scroll al cuerpo al cerrarse', async () => {
    const { usuario } = renderizar(anfitrion(componente))
    await usuario.click(screen.getByTestId('abrir'))
    await screen.findByRole('dialog')
    expect(document.body.style.overflow).toBe('hidden')

    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(document.body.style.overflow).toBe(''))
  })
})
