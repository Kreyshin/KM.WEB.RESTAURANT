import type {
  ApiError,
  CanalVenta,
  MedioPago,
  Motivo,
  NuevoCanalVenta,
  NuevoMedioPago,
  NuevoMotivo,
  NuevoTipoMotivo,
  OperacionMotivo,
  TipoMotivo,
} from '@/types'
import { db, latencia } from './mock/db'
import { errorCampo, esPorcentaje, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

// ── Medios de pago ───────────────────────────────────────────────────────────

const repoMedios = crearRepositorio('mediosPago', {
  prefijo: 'mp',
  entidad: 'Medio de pago',
  camposBusqueda: ['nombre'],
})

function validarMedio(datos: Partial<NuevoMedioPago>, id?: string) {
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    if (existeOtro(db.mediosPago, (m) => m.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya existe un medio de pago con ese nombre.', 'Nombre duplicado')
    }
  }
  if (datos.comisionPorcentaje !== undefined && !esPorcentaje(datos.comisionPorcentaje)) {
    throw errorCampo('comisionPorcentaje', 'La comisión debe estar entre 0 % y 100 %.')
  }
  if (datos.activo === false && id && !db.mediosPago.some((m) => m.id !== id && m.activo)) {
    throw { mensaje: 'Debe quedar al menos un medio de pago activo.' }
  }
}

export const mediosPagoService = {
  ...repoMedios,

  async crear(datos: NuevoMedioPago): Promise<MedioPago> {
    validarMedio(datos)
    return repoMedios.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoMedioPago>): Promise<MedioPago> {
    validarMedio(datos, id)
    return repoMedios.actualizar(id, datos)
  },

  async eliminar(id: string): Promise<void> {
    validarMedio({ activo: false }, id)
    return repoMedios.eliminar(id)
  },
}

// ── Canales de venta ─────────────────────────────────────────────────────────

const repoCanales = crearRepositorio('canales', {
  prefijo: 'cv',
  entidad: 'Canal',
  camposBusqueda: ['nombre'],
})

function validarCanal(datos: Partial<NuevoCanalVenta>, id?: string) {
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    if (existeOtro(db.canales, (c) => c.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya existe un canal con ese nombre.', 'Nombre duplicado')
    }
  }
  if (datos.comisionPorcentaje !== undefined && !esPorcentaje(datos.comisionPorcentaje)) {
    throw errorCampo('comisionPorcentaje', 'La comisión debe estar entre 0 % y 100 %.')
  }
  if (datos.activo === false && id && !db.canales.some((c) => c.id !== id && c.activo)) {
    throw { mensaje: 'Debe quedar al menos un canal de venta activo.' }
  }
}

export const canalesService = {
  ...repoCanales,

  async crear(datos: NuevoCanalVenta): Promise<CanalVenta> {
    validarCanal(datos)
    // Solo una app de delivery cobra comisión.
    if (datos.tipo !== 'plataforma') datos = { ...datos, comisionPorcentaje: 0 }
    return repoCanales.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoCanalVenta>): Promise<CanalVenta> {
    validarCanal(datos, id)
    if (datos.tipo && datos.tipo !== 'plataforma') datos = { ...datos, comisionPorcentaje: 0 }
    return repoCanales.actualizar(id, datos)
  },

  async eliminar(id: string): Promise<void> {
    validarCanal({ activo: false }, id)
    await repoCanales.eliminar(id)
  },
}

// ── Motivos ──────────────────────────────────────────────────────────────────

const repoMotivos = crearRepositorio('motivos', {
  prefijo: 'mo',
  entidad: 'Motivo',
  camposBusqueda: ['descripcion'],
})

function validarMotivo(datos: Partial<NuevoMotivo>, id?: string) {
  if (datos.descripcion !== undefined) {
    if (!datos.descripcion.trim()) {
      throw errorCampo('descripcion', 'La descripción es obligatoria.')
    }
    const tipoId = datos.tipoId ?? db.motivos.find((m) => m.id === id)?.tipoId
    const mismosTipo = db.motivos.filter((m) => m.tipoId === tipoId)
    if (existeOtro(mismosTipo, (m) => m.descripcion, datos.descripcion, id)) {
      throw errorCampo('descripcion', 'Ya existe un motivo igual de este tipo.', 'Duplicado')
    }
  }
}

export const motivosService = {
  ...repoMotivos,

  async crear(datos: NuevoMotivo): Promise<Motivo> {
    validarMotivo(datos)
    return repoMotivos.crear({ ...datos, descripcion: datos.descripcion.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoMotivo>): Promise<Motivo> {
    validarMotivo(datos, id)
    return repoMotivos.actualizar(id, datos)
  },

  /** Los motivos que el sistema debe ofrecer en un punto del flujo (D-017). */
  async paraOperacion(operacion: OperacionMotivo): Promise<Motivo[]> {
    const tipos = db.tiposMotivo.filter((t) => t.activo && t.operaciones.includes(operacion))
    const ids = new Set(tipos.map((t) => t.id))
    return latencia(db.motivos.filter((m) => m.activo && ids.has(m.tipoId)))
  },
}

// ── Tipos de motivo ──────────────────────────────────────────────────────────

const repoTiposMotivo = crearRepositorio('tiposMotivo', {
  prefijo: 'tm',
  entidad: 'Tipo de motivo',
  camposBusqueda: ['nombre'],
})

function validarTipoMotivo(datos: Partial<NuevoTipoMotivo>, id?: string) {
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    if (existeOtro(db.tiposMotivo, (t) => t.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya existe un tipo con ese nombre.', 'Duplicado')
    }
  }
}

export const tiposMotivoService = {
  ...repoTiposMotivo,

  async crear(datos: NuevoTipoMotivo): Promise<TipoMotivo> {
    validarTipoMotivo(datos)
    return repoTiposMotivo.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoTipoMotivo>): Promise<TipoMotivo> {
    validarTipoMotivo(datos, id)
    return repoTiposMotivo.actualizar(id, datos)
  },

  /** Un tipo con motivos dentro no se borra: se desactiva. */
  async eliminar(id: string): Promise<void> {
    const conMotivos = db.motivos.filter((m) => m.tipoId === id).length
    if (conMotivos) {
      throw {
        mensaje: `«${db.tiposMotivo.find((t) => t.id === id)?.nombre}» tiene ${conMotivos} ${
          conMotivos === 1 ? 'motivo' : 'motivos'
        }. Muévelos o desactiva el tipo.`,
      } satisfies ApiError
    }
    await repoTiposMotivo.eliminar(id)
  },
}
