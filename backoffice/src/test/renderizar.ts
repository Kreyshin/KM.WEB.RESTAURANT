import { render } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'

type OpcionesRender = NonNullable<Parameters<typeof render>[1]>

/**
 * Monta un componente como lo haría la app: con un Pinia nuevo por prueba
 * (sin estado compartido entre pruebas) y un `usuario` que simula teclado y
 * ratón de verdad.
 *
 * Uso:
 *   const { usuario, emitted } = renderizar(KmTabs, { props: { ... } })
 *   await usuario.click(screen.getByRole('tab', { name: 'Impresoras' }))
 */
// `unknown`: los componentes genéricos (KmTable<T>) no encajan en el tipo `Component`.
export function renderizar(componente: unknown, opciones: OpcionesRender = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const usuario = userEvent.setup()
  const resultado = render(componente as Component, {
    ...opciones,
    global: { ...opciones.global, plugins: [pinia, ...(opciones.global?.plugins ?? [])] },
  })
  return { usuario, ...resultado }
}
