import type {
  CanalVenta,
  MedioPago,
  Motivo,
  NuevoCanalVenta,
  NuevoMedioPago,
  NuevoMotivo,
} from '@/types'
import { db } from './mock/db'
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
    const tipo = datos.tipo ?? db.motivos.find((m) => m.id === id)?.tipo
    const mismosTipo = db.motivos.filter((m) => m.tipo === tipo)
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
}
