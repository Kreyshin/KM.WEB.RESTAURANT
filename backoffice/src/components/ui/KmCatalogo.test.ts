import { screen, waitFor, within } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, type Component } from 'vue'
import KmCatalogo from './KmCatalogo.vue'
import KmToaster from './KmToaster.vue'
import { aplicarConsulta } from '@/services/mock/consulta'
import { renderizar } from '@/test/renderizar'
import type { Consulta } from '@/types'

interface Canal {
  id: string
  nombre: string
  activo: boolean
}

/**
 * Servicio falso en memoria. Con `vi.fn` cada método queda espiado: se puede
 * comprobar con qué datos se llamó y forzar respuestas (como un error de campo).
 */
function crearServicio() {
  let datos: Canal[] = [
    { id: 'c1', nombre: 'Salón', activo: true },
    { id: 'c2', nombre: 'Rappi', activo: false },
  ]
  return {
    consultar: vi.fn(async (c: Consulta) => aplicarConsulta(datos, c, ['nombre'])),
    crear: vi.fn(async (d: Omit<Canal, 'id'>) => {
      const nuevo = { ...d, id: `c${datos.length + 1}` }
      datos.push(nuevo)
      return nuevo
    }),
    actualizar: vi.fn(async (id: string, d: Partial<Canal>) => {
      datos = datos.map((c) => (c.id === id ? { ...c, ...d } : c))
      return datos.find((c) => c.id === id)!
    }),
    eliminar: vi.fn(async (id: string) => {
      datos = datos.filter((c) => c.id !== id)
    }),
  }
}

function montar(servicio = crearServicio()) {
  // Página mínima: el catálogo más el lugar donde aparecen los avisos.
  const Pagina = defineComponent(() => () => [
    h(KmToaster),
    h(
      // Componente genérico: se trata como componente sin tipar para montarlo con h().
      KmCatalogo as unknown as Component,
      {
        titulo: 'Canales de venta',
        entidad: 'canal',
        servicio,
        columnas: [{ clave: 'nombre', etiqueta: 'Canal' }],
        nuevo: () => ({ nombre: '', activo: true }),
        nombreDe: (c: Canal) => c.nombre,
        validar: (c: Omit<Canal, 'id'>) =>
          c.nombre.trim() ? {} : { nombre: 'El nombre es obligatorio.' },
      },
      {
        formulario: ({ borrador, errores }: { borrador: Canal; errores: Record<string, string> }) =>
          h('label', [
            'Nombre',
            h('input', {
              value: borrador.nombre,
              onInput: (e: Event) => (borrador.nombre = (e.target as HTMLInputElement).value),
            }),
            errores.nombre && h('span', errores.nombre),
          ]),
      },
    ),
  ])
  return { servicio, ...renderizar(Pagina) }
}

const filaDe = (texto: string) => screen.getByText(texto).closest('tr')!

describe('KmCatalogo', () => {
  it('lista los registros que devuelve el servicio', async () => {
    montar()
    expect(await screen.findByText('Salón')).toBeInTheDocument()
    expect(screen.getByText('Rappi')).toBeInTheDocument()
  })

  it('no llama al servicio si la validación del cliente falla', async () => {
    const { usuario, servicio } = montar()
    await screen.findByText('Salón')

    await usuario.click(screen.getByRole('button', { name: 'Nuevo canal' }))
    await usuario.click(screen.getByRole('button', { name: 'Crear canal' }))

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(servicio.crear).not.toHaveBeenCalled()
  })

  it('crea un registro, avisa y lo muestra en la tabla', async () => {
    const { usuario, servicio } = montar()
    await screen.findByText('Salón')

    await usuario.click(screen.getByRole('button', { name: 'Nuevo canal' }))
    await usuario.type(screen.getByLabelText('Nombre'), 'Glovo')
    await usuario.click(screen.getByRole('button', { name: 'Crear canal' }))

    expect(servicio.crear).toHaveBeenCalledWith({ nombre: 'Glovo', activo: true })
    expect(await screen.findByRole('status')).toHaveTextContent('Canal creado.')
    expect(await screen.findByText('Glovo')).toBeInTheDocument()
  })

  it('muestra en su campo el error que devuelve el servicio', async () => {
    const servicio = crearServicio()
    servicio.crear.mockRejectedValueOnce({
      mensaje: 'Ya existe un canal con ese nombre.',
      campos: { nombre: 'Nombre duplicado' },
    })
    const { usuario } = montar(servicio)
    await screen.findByText('Salón')

    await usuario.click(screen.getByRole('button', { name: 'Nuevo canal' }))
    await usuario.type(screen.getByLabelText('Nombre'), 'Salón')
    await usuario.click(screen.getByRole('button', { name: 'Crear canal' }))

    expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Ya existe un canal con ese nombre.')
  })

  it('edita un registro con sus datos precargados', async () => {
    const { usuario, servicio } = montar()
    await screen.findByText('Rappi')

    await usuario.click(within(filaDe('Rappi')).getByRole('button', { name: 'Editar' }))
    const campo = screen.getByLabelText('Nombre')
    expect(campo).toHaveValue('Rappi')

    await usuario.clear(campo)
    await usuario.type(campo, 'Rappi Turbo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(servicio.actualizar).toHaveBeenCalledWith('c2', { nombre: 'Rappi Turbo', activo: false })
  })

  it('activa o desactiva desde la insignia de estado', async () => {
    const { usuario, servicio } = montar()
    await screen.findByText('Rappi')

    await usuario.click(within(filaDe('Rappi')).getByRole('button', { name: /Inactivo/ }))

    expect(servicio.actualizar).toHaveBeenCalledWith('c2', { activo: true })
    await waitFor(() => expect(within(filaDe('Rappi')).getByText('Activo')).toBeInTheDocument())
  })

  it('pide confirmación antes de eliminar', async () => {
    const { usuario, servicio } = montar()
    await screen.findByText('Rappi')

    await usuario.click(within(filaDe('Rappi')).getByRole('button', { name: 'Eliminar' }))
    const dialogo = screen.getByRole('dialog', { name: '' })
    expect(dialogo).toHaveTextContent('¿Eliminar «Rappi»?')
    expect(servicio.eliminar).not.toHaveBeenCalled()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))

    expect(servicio.eliminar).toHaveBeenCalledWith('c2')
    await waitFor(() => expect(screen.queryByText('Rappi')).not.toBeInTheDocument())
  })
})
