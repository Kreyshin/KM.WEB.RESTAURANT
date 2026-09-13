import type { Local } from '@/types'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('locales', {
  prefijo: 'l',
  entidad: 'Local',
  camposBusqueda: ['nombre', 'distrito', 'direccion'],
})

/**
 * Locales del negocio. El CRUD completo llega en la Fase 2 (Configuración);
 * de momento el shell lo usa para el selector de local activo.
 */
export const localesService = {
  ...repo,

  async listarActivos(): Promise<Local[]> {
    const { items } = await repo.consultar({
      filtros: { activo: true },
      orden: { campo: 'nombre', direccion: 'asc' },
      porPagina: 100,
    })
    return items
  },
}
