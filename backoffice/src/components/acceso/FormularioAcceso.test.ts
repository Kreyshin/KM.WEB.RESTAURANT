import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import FormularioAcceso from './FormularioAcceso.vue'
import { renderizar } from '@/test/renderizar'
import {
  esVarianteAcceso,
  etiquetaVariante,
  descripcionVariante,
  variantesAcceso,
} from '@/config/acceso'

// El formulario usa el router para volver al destino pedido tras entrar.
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

describe('formulario de acceso', () => {
  it('exige la contraseña antes de llamar al servicio', async () => {
    const { usuario } = renderizar(FormularioAcceso)

    await usuario.clear(screen.getByLabelText(/contraseña/i))
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Ingresa tu contraseña.')).toBeInTheDocument()
  })

  it('las cuentas de prueba rellenan el correo', async () => {
    const { usuario } = renderizar(FormularioAcceso)
    const correo = screen.getByLabelText(/correo/i) as HTMLInputElement

    await usuario.click(screen.getByRole('button', { name: 'Mesero' }))

    expect(correo.value).toBe('lucia@kmrestaurante.pe')
  })

  it('la acción del botón la decide la variante que lo envuelve', () => {
    renderizar(FormularioAcceso, { props: { accion: 'Abrir el servicio' } })
    expect(screen.getByRole('button', { name: 'Abrir el servicio' })).toBeInTheDocument()
  })
})

describe('variantes de la pantalla de acceso', () => {
  it('solo acepta las variantes conocidas', () => {
    expect(esVarianteAcceso('comanda')).toBe(true)
    expect(esVarianteAcceso('otra')).toBe(false)
    expect(esVarianteAcceso(undefined)).toBe(false)
  })

  it('todas tienen etiqueta y descripción', () => {
    for (const v of variantesAcceso) {
      expect(etiquetaVariante[v]).toBeTruthy()
      expect(descripcionVariante[v]).toBeTruthy()
    }
  })
})
