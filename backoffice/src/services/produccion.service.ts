import type {
  Area,
  Producto,
  Impresora,
  NuevaArea,
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
    const usadas = db.areas.filter((a) => a.impresoraId === id).map((a) => a.nombre)
    if (usadas.length) {
      throw {
        mensaje: `No se puede eliminar: la usan las áreas ${usadas.join(', ')}.`,
      }
    }
    return repoImpresoras.eliminar(id)
  },
}

// ── Áreas ────────────────────────────────────────────────────────────────────

const repoAreas = crearRepositorio('areas', {
  prefijo: 'ae',
  entidad: 'Área',
  camposBusqueda: ['nombre', 'ubicacion'],
})

function validarArea(datos: Partial<NuevaArea>, id?: string) {
  const actual = db.areas.find((a) => a.id === id)
  const combinada = { ...actual, ...datos }
  if (datos.nombre !== undefined || datos.ubicacion !== undefined) {
    const nombre = (combinada.nombre ?? '').trim()
    if (!nombre) throw errorCampo('nombre', 'El nombre es obligatorio.')
    // Dos «Cocina» valen si están en distinto piso o sala.
    const clave = (a: { nombre: string; ubicacion?: string }) =>
      `${a.nombre.trim().toLowerCase()}|${(a.ubicacion ?? '').trim().toLowerCase()}`
    const repetida = db.areas.some(
      (a) =>
        a.id !== id &&
        a.localId === combinada.localId &&
        clave(a) === clave({ nombre, ubicacion: combinada.ubicacion }),
    )
    if (repetida) {
      throw errorCampo(
        'nombre',
        'Ya hay un área con ese nombre en la misma ubicación del local. Indica el piso o la sala.',
        'Duplicada',
      )
    }
  }
  if (combinada.impresoraId) {
    const impresora = db.impresoras.find((i) => i.id === combinada.impresoraId)
    if (!impresora || impresora.localId !== combinada.localId) {
      throw errorCampo(
        'impresoraId',
        'La impresora debe pertenecer al mismo local que el área.',
        'Elige una impresora de este local',
      )
    }
  }
  if (
    combinada.recibeComandas &&
    combinada.comanda?.modo === 'seleccionados' &&
    combinada.comanda.categoriaIds.length === 0 &&
    combinada.comanda.productoIds.length === 0
  ) {
    throw errorCampo(
      'comanda',
      'Elige al menos una categoría o un producto, o marca «Todos los productos».',
    )
  }
}

function limpiar<T extends Partial<NuevaArea>>(datos: T): T {
  return {
    ...datos,
    ...(datos.nombre !== undefined ? { nombre: datos.nombre.trim() } : {}),
    ...(datos.ubicacion !== undefined ? { ubicacion: datos.ubicacion.trim() || undefined } : {}),
    ...(datos.impresoraId !== undefined ? { impresoraId: datos.impresoraId || undefined } : {}),
  }
}

export const areasService = {
  ...repoAreas,

  async crear(datos: NuevaArea): Promise<Area> {
    validarArea(datos)
    return repoAreas.crear(limpiar(datos))
  },

  async actualizar(id: string, datos: Partial<NuevaArea>): Promise<Area> {
    validarArea(datos, id)
    return repoAreas.actualizar(id, limpiar(datos))
  },
}

/** ¿Se comanda este producto en esta área? */
export function recibeProducto(area: Area, producto: Pick<Producto, 'id' | 'categoriaId'>) {
  if (!area.activo || !area.recibeComandas) return false
  if (area.comanda.modo === 'todos') return true
  return (
    area.comanda.categoriaIds.includes(producto.categoriaId) ||
    area.comanda.productoIds.includes(producto.id)
  )
}

export interface CoberturaComanda {
  /** Productos que no llegan a ninguna área del local. */
  sinArea: Producto[]
  /** Productos que salen en más de un área a la vez. */
  enVarias: { producto: Producto; areas: Area[] }[]
}

/** Revisa a dónde va cada producto en un local, para avisar de huecos y duplicados. */
export function coberturaComanda(areas: Area[], productos: Producto[], localId: string) {
  const delLocal = areas.filter((a) => a.localId === localId)
  const resultado: CoberturaComanda = { sinArea: [], enVarias: [] }
  for (const producto of productos) {
    const destino = delLocal.filter((a) => recibeProducto(a, producto))
    if (destino.length === 0) resultado.sinArea.push(producto)
    else if (destino.length > 1) resultado.enVarias.push({ producto, areas: destino })
  }
  return resultado
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
