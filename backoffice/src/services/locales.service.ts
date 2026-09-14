import type { Local, NuevoLocal } from '@/types'
import { validarHorario } from '@/utils/validaciones'
import { db } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('locales', {
  prefijo: 'l',
  entidad: 'Local',
  camposBusqueda: ['nombre', 'distrito', 'direccion', 'codigoEstablecimiento'],
})

function validar(datos: Partial<NuevoLocal>, id?: string) {
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    if (existeOtro(db.locales, (l) => l.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya existe un local con ese nombre.', 'Nombre duplicado')
    }
  }
  if (datos.codigoEstablecimiento !== undefined) {
    if (!/^\d{4}$/.test(datos.codigoEstablecimiento)) {
      throw errorCampo(
        'codigoEstablecimiento',
        'El código de establecimiento tiene 4 dígitos.',
        'Usa 4 dígitos, p. ej. 0001',
      )
    }
    if (existeOtro(db.locales, (l) => l.codigoEstablecimiento, datos.codigoEstablecimiento, id)) {
      throw errorCampo(
        'codigoEstablecimiento',
        'Otro local ya usa ese código de establecimiento.',
        'Código duplicado',
      )
    }
  }
  if (datos.horario && Object.keys(validarHorario(datos.horario)).length) {
    throw errorCampo('horario', 'Revisa el horario: hay días con horas incompletas.')
  }
  if (datos.activo === false && id) {
    const quedanActivos = db.locales.some((l) => l.id !== id && l.activo)
    if (!quedanActivos) throw { mensaje: 'Debe quedar al menos un local activo.' }
  }
}

/** Locales del negocio con su horario y código de establecimiento SUNAT. */
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

  async crear(datos: NuevoLocal): Promise<Local> {
    validar(datos)
    return repo.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoLocal>): Promise<Local> {
    validar(datos, id)
    return repo.actualizar(id, datos)
  },

  async eliminar(id: string): Promise<void> {
    const enUso =
      db.series.some((s) => s.localId === id) ||
      db.areas.some((a) => a.localId === id) ||
      db.impresoras.some((i) => i.localId === id)
    if (enUso) {
      throw {
        mensaje:
          'No se puede eliminar: el local tiene series, áreas o impresoras. Desactívalo en su lugar.',
      }
    }
    validar({ activo: false }, id)
    return repo.eliminar(id)
  },
}
