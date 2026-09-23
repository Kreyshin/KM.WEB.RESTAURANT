import { screen } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KmRangoFechas from './KmRangoFechas.vue'
import { renderizar } from '@/test/renderizar'

/**
 * El calendario real es una librería de terceros: aquí no se prueba ella, sino
 * cómo la usa nuestro componente. `vi.mock` sustituye el módulo entero por un
 * «doble» que emite lo mismo que la librería, para provocar a voluntad el caso
 * que falló en producción: el rango a medias al elegir el primer día.
 *
 * `vi.mock` se eleva al principio del archivo, por eso lo que usa se importa
 * dentro de la fábrica.
 */
vi.mock('@vuepic/vue-datepicker', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    VueDatePicker: defineComponent({
      props: { modelValue: { type: Array, default: null } },
      emits: ['update:modelValue'],
      setup(props, { emit }) {
        const emitir = (valor: (string | null)[]) => () => emit('update:modelValue', valor)
        return () =>
          h('div', [
            h('output', { 'data-testid': 'valor' }, JSON.stringify(props.modelValue)),
            h('button', { onClick: emitir(['2026-09-02', null]) }, 'Primer día'),
            h('button', { onClick: emitir(['2026-09-02', '2026-09-09']) }, 'Segundo día'),
          ])
      },
    }),
  }
})

const montar = () =>
  renderizar(KmRangoFechas, {
    props: { modelValue: { desde: '2026-09-06', hasta: '2026-09-12' } },
  })

describe('KmRangoFechas', () => {
  beforeEach(() => {
    // «Hoy» fijo: los atajos dependen de la fecha y la prueba no puede cambiar cada día.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 12, 10, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('entrega el rango a la librería como [desde, hasta]', () => {
    montar()
    expect(screen.getByTestId('valor')).toHaveTextContent('["2026-09-06","2026-09-12"]')
  })

  it('ignora el rango a medias y emite solo con los dos extremos', async () => {
    const { usuario, emitted } = montar()

    await usuario.click(screen.getByRole('button', { name: 'Primer día' }))
    expect(emitted('update:modelValue')).toBeUndefined()

    await usuario.click(screen.getByRole('button', { name: 'Segundo día' }))
    expect(emitted('update:modelValue')).toEqual([[{ desde: '2026-09-02', hasta: '2026-09-09' }]])
  })

  it('resalta el atajo que coincide y lo aplica al pulsar otro', async () => {
    const { usuario, emitted } = montar()

    expect(screen.getByRole('button', { name: 'Últimos 7 días' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(emitted('update:modelValue')!.at(-1)).toEqual([
      { desde: '2026-08-01', hasta: '2026-08-31' },
    ])
  })
})
