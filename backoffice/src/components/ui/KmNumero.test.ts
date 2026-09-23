import { fireEvent, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type Component } from 'vue'
import KmNumero from './KmNumero.vue'
import { renderizar } from '@/test/renderizar'

/** Padre con v-model real y el valor visible, para comprobar lo que recibe la vista. */
function montar(props: Record<string, unknown>, inicial: number | null = 10) {
  const Padre = defineComponent(() => {
    const valor = ref<number | null>(inicial)
    return () => [
      h(KmNumero as Component, {
        ...props,
        modelValue: valor.value,
        'onUpdate:modelValue': (v: number | null) => (valor.value = v),
      }),
      h('output', { 'data-testid': 'modelo' }, JSON.stringify(valor.value)),
      h('button', 'Otro campo'),
    ]
  })
  const r = renderizar(Padre)
  return { ...r, campo: screen.getByRole('spinbutton'), modelo: () => screen.getByTestId('modelo') }
}

describe('KmNumero', () => {
  it('muestra los decimales fijos fuera de foco y el prefijo', () => {
    const { campo } = montar({ prefijo: 'S/', decimales: 2 }, 38)
    expect(campo).toHaveValue('38.00')
    expect(screen.getByText('S/')).toBeInTheDocument()
  })

  it('acepta coma decimal y entrega un número a la vista', async () => {
    const { usuario, campo, modelo } = montar({ decimales: 2 }, null)

    await usuario.type(campo, '12,5')
    expect(modelo()).toHaveTextContent('12.5')

    await usuario.tab()
    expect(campo).toHaveValue('12.50')
  })

  it('ignora letras y decimales de más', async () => {
    const { usuario, campo, modelo } = montar({ decimales: 1 }, null)

    await usuario.type(campo, '7a.25')
    expect(campo).toHaveValue('7.2')
    expect(modelo()).toHaveTextContent('7.2')
  })

  it('no corrige en silencio un valor escrito fuera de rango', async () => {
    const { usuario, campo, modelo } = montar({ min: 0, max: 13 })

    await usuario.clear(campo)
    await usuario.type(campo, '15')
    await usuario.tab()

    // Se conserva para que la validación del formulario muestre el error.
    expect(modelo()).toHaveTextContent('15')
    expect(screen.getByRole('button', { name: 'Aumentar' })).toBeDisabled()
  })

  it('los botones no superan los límites', async () => {
    const { usuario, modelo } = montar({ min: 0, max: 13, step: 5 }, 12)

    await usuario.click(screen.getByRole('button', { name: 'Aumentar' }))
    expect(modelo()).toHaveTextContent('13')
  })

  it('los botones y las flechas suman el paso, con Shift de diez en diez', async () => {
    const { usuario, campo, modelo } = montar({ step: 0.5, decimales: 1, max: 20 })

    await usuario.click(screen.getByRole('button', { name: 'Aumentar' }))
    expect(modelo()).toHaveTextContent('10.5')

    campo.focus()
    await usuario.keyboard('{ArrowDown}')
    expect(modelo()).toHaveTextContent('10')

    await usuario.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(modelo()).toHaveTextContent('15')
  })

  it('deshabilita − en el mínimo y + en el máximo', async () => {
    const { campo } = montar({ min: 1, max: 30 }, 1)
    expect(screen.getByRole('button', { name: 'Disminuir' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Aumentar' })).toBeEnabled()

    await fireEvent.update(campo, '30')
    expect(screen.getByRole('button', { name: 'Aumentar' })).toBeDisabled()
  })

  it('vaciar el campo entrega null', async () => {
    const { usuario, campo, modelo } = montar({})

    await usuario.clear(campo)
    await usuario.tab()
    expect(modelo()).toHaveTextContent('null')
  })
})
