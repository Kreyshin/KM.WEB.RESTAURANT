import type {
  EstacionProduccion,
  Impresora,
  NuevaEstacion,
  NuevaImpresora,
  NuevaSerie,
  SerieComprobante,
} from '@/types'
import { validarIpv4, validarSerie, ejemploSerie } from '@/utils/validaciones'
import { db } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

// ── Impresoras ───────────────────────────────────────────────────────────────

const repoImpresoras = crearRepositorio('impresoras', {
  prefijo: 'im',
  entidad: 'Impresora',
  camposBusqueda: ['nombre', 'direccionIp'],
})

function validarImpresora(datos: Partial<NuevaImpresora>, id?: string) {
  const actual = db.impresoras.find((i) => i.id === id)
  const combinada = { ...actual, ...datos }
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    const mismoLocal = db.impresoras.filter((i) => i.localId === combinada.localId)
    if (existeOtro(mismoLocal, (i) => i.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya hay una impresora con ese nombre en el local.', 'Duplicado')
    }
  }
  if (combinada.conexion === 'red' && !validarIpv4(combinada.direccionIp ?? '')) {
    throw errorCampo(
      'direccionIp',
      'Una impresora de red necesita una dirección IP válida.',
      'Ej. 192.168.1.50',
    )
  }
}

export const impresorasService = {
  ...repoImpresoras,

  async crear(datos: NuevaImpresora): Promise<Impresora> {
    validarImpresora(datos)
    const limpio = datos.conexion === 'usb' ? { ...datos, direccionIp: undefined } : datos
    return repoImpresoras.crear({ ...limpio, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevaImpresora>): Promise<Impresora> {
    validarImpresora(datos, id)
    const limpio = datos.conexion === 'usb' ? { ...datos, direccionIp: undefined } : datos
    return repoImpresoras.actualizar(id, limpio)
  },

  async eliminar(id: string): Promise<void> {
    const usadas = db.estaciones.filter((e) => e.impresoraId === id).map((e) => e.nombre)
    if (usadas.length) {
      throw {
        mensaje: `No se puede eliminar: la usan las estaciones ${usadas.join(', ')}.`,
      }
    }
    return repoImpresoras.eliminar(id)
  },
}

// ── Estaciones de producción ─────────────────────────────────────────────────

const repoEstaciones = crearRepositorio('estaciones', {
  prefijo: 'es',
  entidad: 'Estación',
  camposBusqueda: ['nombre'],
})

function validarEstacion(datos: Partial<NuevaEstacion>, id?: string) {
  const actual = db.estaciones.find((e) => e.id === id)
  const combinada = { ...actual, ...datos }
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    const mismoLocal = db.estaciones.filter((e) => e.localId === combinada.localId)
    if (existeOtro(mismoLocal, (e) => e.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya hay una estación con ese nombre en el local.', 'Duplicado')
    }
  }
  if (combinada.impresoraId) {
    const impresora = db.impresoras.find((i) => i.id === combinada.impresoraId)
    if (!impresora || impresora.localId !== combinada.localId) {
      throw errorCampo(
        'impresoraId',
        'La impresora debe pertenecer al mismo local que la estación.',
        'Elige una impresora de este local',
      )
    }
  }
}

export const estacionesService = {
  ...repoEstaciones,

  async crear(datos: NuevaEstacion): Promise<EstacionProduccion> {
    validarEstacion(datos)
    return repoEstaciones.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevaEstacion>): Promise<EstacionProduccion> {
    validarEstacion(datos, id)
    return repoEstaciones.actualizar(id, datos)
  },
}

// ── Series de comprobantes ───────────────────────────────────────────────────

const repoSeries = crearRepositorio('series', {
  prefijo: 'sr',
  entidad: 'Serie',
  camposBusqueda: ['serie'],
})

function validarSerieComprobante(datos: Partial<NuevaSerie>, id?: string) {
  const actual = db.series.find((s) => s.id === id)
  const combinada = { ...actual, ...datos }

  if (datos.serie !== undefined || datos.tipo !== undefined) {
    const serie = (combinada.serie ?? '').toUpperCase()
    const tipo = combinada.tipo!
    if (!validarSerie(tipo, serie)) {
      throw errorCampo(
        'serie',
        `La serie no tiene el formato correcto. Ejemplo: ${ejemploSerie[tipo]}.`,
        `Ej. ${ejemploSerie[tipo]}`,
      )
    }
    // SUNAT exige que una serie sea única por tipo de comprobante en todo el RUC.
    const mismoTipo = db.series.filter((s) => s.tipo === tipo)
    if (existeOtro(mismoTipo, (s) => s.serie, serie, id)) {
      throw errorCampo('serie', `La serie ${serie} ya existe para este comprobante.`, 'Duplicada')
    }
  }

  if (datos.correlativo !== undefined) {
    if (!Number.isInteger(datos.correlativo) || datos.correlativo < 0) {
      throw errorCampo('correlativo', 'El correlativo es un número entero desde 0.')
    }
    if (actual && datos.correlativo < actual.correlativo) {
      throw errorCampo(
        'correlativo',
        `El correlativo no puede retroceder: ya se emitió hasta el ${actual.correlativo}.`,
        'No puede retroceder',
      )
    }
  }
}

export const seriesService = {
  ...repoSeries,

  async crear(datos: NuevaSerie): Promise<SerieComprobante> {
    validarSerieComprobante(datos)
    return repoSeries.crear({ ...datos, serie: datos.serie.toUpperCase() })
  },

  async actualizar(id: string, datos: Partial<NuevaSerie>): Promise<SerieComprobante> {
    validarSerieComprobante(datos, id)
    return repoSeries.actualizar(
      id,
      datos.serie ? { ...datos, serie: datos.serie.toUpperCase() } : datos,
    )
  },

  async eliminar(id: string): Promise<void> {
    const serie = db.series.find((s) => s.id === id)
    if (serie && serie.correlativo > 0) {
      throw {
        mensaje: `No se puede eliminar: la serie ${serie.serie} ya emitió comprobantes. Desactívala en su lugar.`,
      }
    }
    return repoSeries.eliminar(id)
  },
}
