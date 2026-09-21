import type {
  Articulo,
  EstadoRequerimiento,
  EstadoSolicitud,
  LineaRequerimiento,
  Marca,
  NuevaSolicitud,
  NuevoRequerimiento,
  RequerimientoCompra,
  SolicitudCompra,
  VinculoArticulo,
} from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso } from './parametros.service'

/**
 * Solicitudes y requerimientos de compra (F4.4, [D-004](../../docs/guia/decisiones.md)).
 *
 * 1. El **área** pide insumos en una solicitud.
 * 2. El **local** consolida solicitudes en un requerimiento, que traduce los
 *    insumos a artículos del ERP, sugiere proveedor y se envía.
 * 3. El **ERP** aprueba, convierte en orden de compra y despacha; la vertical
 *    lo refleja. En el mock lo simula `simuladorErp`.
 */

export const PERMISO_AJUSTAR_CANTIDADES = 'compras.ajustarCantidades'

export const etiquetaEstadoSolicitud: Record<EstadoSolicitud, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  atendida: 'Atendida',
  rechazada: 'Rechazada',
}

export const etiquetaEstadoRequerimiento: Record<EstadoRequerimiento, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  convertido: 'Convertido en OC',
  despachado: 'Despachado',
  recepcionado: 'Recepcionado',
  anulado: 'Anulado',
}

/** Recorrido normal, para dibujar el avance. `anulado` queda fuera. */
export const flujoRequerimiento: EstadoRequerimiento[] = [
  'borrador',
  'enviado',
  'aprobado',
  'convertido',
  'despachado',
  'recepcionado',
]

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000
const ahora = () => new Date().toISOString()
const nombreUsuario = (id: string) => db.usuarios.find((u) => u.id === id)?.nombre ?? 'Usuario'

function siguienteNumero(prefijo: string, numeros: string[]) {
  const max = numeros.reduce((m, n) => Math.max(m, Number(n.split('-')[1]) || 0), 0)
  return `${prefijo}-${String(max + 1).padStart(6, '0')}`
}

// ── Artículos de un insumo ───────────────────────────────────────────────────

export interface Alterno extends VinculoArticulo {
  articulo: Articulo
}

/** Artículos activos que abastecen un insumo, el de por defecto primero. */
export function alternosDe(insumoId: string): Alterno[] {
  const insumo = db.insumos.find((i) => i.id === insumoId)
  return (insumo?.articulos ?? [])
    .map((v) => ({ ...v, articulo: db.articulos.find((a) => a.id === v.articuloId)! }))
    .filter((v) => v.articulo?.activo)
    .sort((a, b) => Number(b.porDefecto) - Number(a.porDefecto))
}

/** Marcas que se pueden preferir para un insumo: las de sus artículos. */
export function marcasDe(insumoId: string): Marca[] {
  const ids = new Set(
    alternosDe(insumoId)
      .map((v) => v.articulo.marcaId)
      .filter(Boolean),
  )
  return db.marcas.filter((m) => ids.has(m.id))
}

/** Unidades de compra que cubren una cantidad de uso: siempre hacia arriba. */
export function unidadesDeCompra(cantidadInsumo: number, factor: number) {
  return Math.ceil(r3(cantidadInsumo / (factor || 1)))
}

// ── Solicitudes ──────────────────────────────────────────────────────────────

function validarSolicitud(datos: NuevaSolicitud) {
  const area = db.areas.find((a) => a.id === datos.areaId)
  if (!area || area.localId !== datos.localId) {
    throw errorCampo('areaId', 'Elige un área de este local.')
  }
  if (datos.lineas.length === 0) throw errorCampo('lineas', 'Añade al menos un insumo.')
  datos.lineas.forEach((l, i) => {
    if (!l.insumoId) throw errorCampo(`lineas.${i}`, `La línea ${i + 1} no tiene insumo.`)
    if (!(l.cantidad > 0)) {
      throw errorCampo(`lineas.${i}`, `La línea ${i + 1} necesita una cantidad mayor que cero.`)
    }
    if (alternosDe(l.insumoId).length === 0) {
      const nombre = db.insumos.find((x) => x.id === l.insumoId)?.nombre ?? 'El insumo'
      throw errorCampo(`lineas.${i}`, `${nombre} no tiene artículos del ERP: no se puede comprar.`)
    }
    if (l.marcaId && !marcasDe(l.insumoId).some((m) => m.id === l.marcaId)) {
      throw errorCampo(`lineas.${i}`, `La marca de la línea ${i + 1} no abastece ese insumo.`)
    }
  })
}

function solicitud(id: string) {
  const s = db.solicitudes.find((x) => x.id === id)
  if (!s) throw { mensaje: 'Solicitud no encontrada.' }
  return s
}

export const solicitudesService = {
  async listar(localId: string): Promise<SolicitudCompra[]> {
    return latencia(
      db.solicitudes
        .filter((s) => s.localId === localId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    )
  },

  async crear(datos: NuevaSolicitud, usuarioId: string): Promise<SolicitudCompra> {
    validarSolicitud(datos)
    const nueva: SolicitudCompra = {
      ...clonar(datos),
      id: nuevoId('so'),
      numero: siguienteNumero(
        'SOL',
        db.solicitudes.map((s) => s.numero),
      ),
      estado: 'borrador',
      fecha: ahora(),
      usuarioId,
      lineas: datos.lineas.map((l) => ({ ...l, id: l.id || nuevoId('sl') })),
    }
    db.solicitudes.push(nueva)
    persistir()
    return latencia(clonar(nueva))
  },

  async actualizar(id: string, datos: NuevaSolicitud): Promise<SolicitudCompra> {
    const s = solicitud(id)
    if (s.estado !== 'borrador') throw { mensaje: 'Solo se edita una solicitud en borrador.' }
    validarSolicitud(datos)
    Object.assign(s, clonar(datos), {
      lineas: datos.lineas.map((l) => ({ ...l, id: l.id || nuevoId('sl') })),
    })
    persistir()
    return latencia(clonar(s))
  },

  async enviar(id: string): Promise<SolicitudCompra> {
    const s = solicitud(id)
    if (s.estado !== 'borrador') throw { mensaje: 'La solicitud ya fue enviada.' }
    validarSolicitud(s)
    s.estado = 'enviada'
    s.fecha = ahora()
    persistir()
    return latencia(clonar(s))
  },

  async eliminar(id: string): Promise<void> {
    const s = solicitud(id)
    if (s.estado !== 'borrador') {
      throw { mensaje: 'Solo se elimina un borrador. Una solicitud enviada se rechaza.' }
    }
    db.solicitudes = db.solicitudes.filter((x) => x.id !== id)
    persistir()
    await latencia(null)
  },

  async rechazar(id: string, motivo: string): Promise<SolicitudCompra> {
    const s = solicitud(id)
    if (s.estado !== 'enviada') throw { mensaje: 'Solo se rechaza una solicitud enviada.' }
    if (s.requerimientoId) {
      throw { mensaje: 'La solicitud ya está en un requerimiento: quítala de allí primero.' }
    }
    if (!motivo.trim()) throw errorCampo('motivo', 'Escribe por qué se rechaza.')
    s.estado = 'rechazada'
    s.motivoRechazo = motivo.trim()
    persistir()
    return latencia(clonar(s))
  },
}

// ── Requerimientos ───────────────────────────────────────────────────────────

/**
 * Traduce solicitudes a líneas de requerimiento. Se agrupa por insumo y
 * artículo: la marca preferida elige el artículo de esa marca; sin marca, el
 * artículo por defecto. La cantidad se redondea a unidades de compra enteras.
 */
export function consolidar(solicitudIds: string[]): LineaRequerimiento[] {
  const grupos = new Map<string, LineaRequerimiento>()
  for (const s of db.solicitudes.filter((x) => solicitudIds.includes(x.id))) {
    for (const l of s.lineas) {
      const alternos = alternosDe(l.insumoId)
      const vinculo =
        (l.marcaId && alternos.find((v) => v.articulo.marcaId === l.marcaId)) || alternos[0]
      if (!vinculo) continue
      const clave = `${l.insumoId}-${vinculo.articuloId}`
      const linea = grupos.get(clave) ?? {
        id: nuevoId('rl'),
        insumoId: l.insumoId,
        articuloId: vinculo.articuloId,
        cantidad: 0,
        cantidadInsumo: 0,
        proveedorId: vinculo.articulo.proveedorId,
        origen: [],
      }
      linea.cantidadInsumo = r3(linea.cantidadInsumo + l.cantidad)
      linea.cantidad = unidadesDeCompra(linea.cantidadInsumo, vinculo.factor)
      linea.origen.push({ solicitudId: s.id, lineaId: l.id })
      grupos.set(clave, linea)
    }
  }
  return [...grupos.values()]
}

function requerimiento(id: string) {
  const r = db.requerimientos.find((x) => x.id === id)
  if (!r) throw { mensaje: 'Requerimiento no encontrado.' }
  return r
}

function validarRequerimiento(datos: NuevoRequerimiento, usuarioId: string, propioId?: string) {
  if (datos.lineas.length === 0) throw errorCampo('lineas', 'Añade al menos una línea.')
  const puedeAjustar = tienePermiso(usuarioId, PERMISO_AJUSTAR_CANTIDADES)

  datos.lineas.forEach((l, i) => {
    const vinculo = alternosDe(l.insumoId).find((v) => v.articuloId === l.articuloId)
    if (!vinculo) {
      throw errorCampo(
        `lineas.${i}`,
        `La línea ${i + 1} usa un artículo que no abastece el insumo.`,
      )
    }
    if (!(l.cantidad > 0)) {
      throw errorCampo(`lineas.${i}`, `La línea ${i + 1} necesita una cantidad mayor que cero.`)
    }
    const consolidada = l.origen.length > 0
    const calculada = unidadesDeCompra(l.cantidadInsumo, vinculo.factor)
    if (consolidada && l.cantidad !== calculada && !puedeAjustar) {
      throw errorCampo(
        `lineas.${i}`,
        'Cambiar la cantidad pedida por las áreas requiere el permiso «Ajustar cantidades al consolidar».',
      )
    }
  })

  // Una solicitud no puede estar en dos requerimientos a la vez.
  const solicitudIds = new Set(datos.lineas.flatMap((l) => l.origen.map((o) => o.solicitudId)))
  for (const id of solicitudIds) {
    const s = db.solicitudes.find((x) => x.id === id)
    if (!s || s.localId !== datos.localId) throw { mensaje: 'Una solicitud no es de este local.' }
    if (s.estado !== 'enviada' || (s.requerimientoId && s.requerimientoId !== propioId)) {
      throw { mensaje: `${s.numero} ya no está disponible para consolidar.` }
    }
  }
  return solicitudIds
}

/** Reserva las solicitudes del requerimiento y libera las que dejó de usar. */
function reservarSolicitudes(requerimientoId: string, usadas: Set<string>) {
  for (const s of db.solicitudes) {
    if (usadas.has(s.id)) s.requerimientoId = requerimientoId
    else if (s.requerimientoId === requerimientoId && s.estado === 'enviada') {
      s.requerimientoId = undefined
    }
  }
}

function registrar(
  r: RequerimientoCompra,
  estado: EstadoRequerimiento,
  autor: string,
  nota?: string,
) {
  r.estado = estado
  r.historial.push({ estado, fecha: ahora(), autor, nota })
}

export const requerimientosService = {
  async listar(localId: string): Promise<RequerimientoCompra[]> {
    return latencia(
      db.requerimientos
        .filter((r) => r.localId === localId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    )
  },

  /** Solicitudes enviadas del local que todavía no están en ningún requerimiento. */
  async pendientes(localId: string): Promise<SolicitudCompra[]> {
    return latencia(
      db.solicitudes
        .filter((s) => s.localId === localId && s.estado === 'enviada' && !s.requerimientoId)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    )
  },

  consolidar,
  alternosDe,

  async crear(datos: NuevoRequerimiento, usuarioId: string): Promise<RequerimientoCompra> {
    const usadas = validarRequerimiento(datos, usuarioId)
    const nuevo: RequerimientoCompra = {
      ...clonar(datos),
      id: nuevoId('rq'),
      numero: siguienteNumero(
        'REQ',
        db.requerimientos.map((r) => r.numero),
      ),
      estado: 'borrador',
      fecha: ahora(),
      usuarioId,
      historial: [{ estado: 'borrador', fecha: ahora(), autor: nombreUsuario(usuarioId) }],
    }
    db.requerimientos.push(nuevo)
    reservarSolicitudes(nuevo.id, usadas)
    persistir()
    return latencia(clonar(nuevo))
  },

  async actualizar(
    id: string,
    datos: NuevoRequerimiento,
    usuarioId: string,
  ): Promise<RequerimientoCompra> {
    const r = requerimiento(id)
    if (r.estado !== 'borrador') throw { mensaje: 'Solo se edita un requerimiento en borrador.' }
    const usadas = validarRequerimiento(datos, usuarioId, id)
    Object.assign(r, clonar(datos))
    reservarSolicitudes(id, usadas)
    persistir()
    return latencia(clonar(r))
  },

  async enviar(id: string, usuarioId: string): Promise<RequerimientoCompra> {
    const r = requerimiento(id)
    if (r.estado !== 'borrador') throw { mensaje: 'El requerimiento ya fue enviado.' }
    if (r.lineas.some((l) => !l.proveedorId)) {
      throw errorCampo('lineas', 'Todas las líneas necesitan proveedor antes de enviar.')
    }
    registrar(r, 'enviado', nombreUsuario(usuarioId))
    for (const s of db.solicitudes.filter((x) => x.requerimientoId === id)) s.estado = 'atendida'
    persistir()
    return latencia(clonar(r))
  },

  /** Solo mientras el ERP no lo haya tomado: en borrador o enviado. */
  async anular(id: string, usuarioId: string, motivo: string): Promise<RequerimientoCompra> {
    const r = requerimiento(id)
    if (r.estado !== 'borrador' && r.estado !== 'enviado') {
      throw { mensaje: 'El ERP ya tomó este requerimiento: se anula desde allí.' }
    }
    if (!motivo.trim()) throw errorCampo('motivo', 'Escribe por qué se anula.')
    registrar(r, 'anulado', nombreUsuario(usuarioId), motivo.trim())
    // Sus solicitudes vuelven a estar disponibles para otro requerimiento.
    for (const s of db.solicitudes.filter((x) => x.requerimientoId === id)) {
      s.estado = 'enviada'
      s.requerimientoId = undefined
    }
    persistir()
    return latencia(clonar(r))
  },

  /** Reemplaza el artículo de una línea no disponible por un alterno del mismo insumo. */
  async reemplazar(
    id: string,
    lineaId: string,
    articuloId: string,
    usuarioId: string,
  ): Promise<RequerimientoCompra> {
    const r = requerimiento(id)
    const linea = r.lineas.find((l) => l.id === lineaId)
    if (!linea) throw { mensaje: 'Línea no encontrada.' }
    if (!linea.noDisponible) throw { mensaje: 'Solo se reemplaza una línea no disponible.' }
    if (r.estado !== 'enviado' && r.estado !== 'aprobado') {
      throw { mensaje: 'Ya no se puede reemplazar: el requerimiento avanzó.' }
    }
    const vinculo = alternosDe(linea.insumoId).find(
      (v) => v.articuloId === articuloId && v.articuloId !== linea.articuloId,
    )
    if (!vinculo) throw errorCampo('articuloId', 'Elige un artículo alterno del mismo insumo.')

    const anterior = db.articulos.find((a) => a.id === linea.articuloId)
    linea.reemplazoDe = linea.reemplazoDe ?? linea.articuloId
    linea.articuloId = articuloId
    linea.cantidad = unidadesDeCompra(linea.cantidadInsumo, vinculo.factor)
    linea.proveedorId = vinculo.articulo.proveedorId ?? linea.proveedorId
    linea.noDisponible = false
    r.historial.push({
      estado: r.estado,
      fecha: ahora(),
      autor: nombreUsuario(usuarioId),
      nota: `${anterior?.nombre ?? 'Artículo'} reemplazado por ${vinculo.articulo.nombre}`,
    })
    persistir()
    return latencia(clonar(r))
  },
}

/**
 * Lo que hará el ERP con integración real. Solo existe en el mock para poder
 * recorrer el circuito completo desde la pantalla.
 */
export const simuladorErp = {
  async aprobar(id: string) {
    const r = requerimiento(id)
    if (r.estado !== 'enviado') throw { mensaje: 'El ERP solo aprueba requerimientos enviados.' }
    registrar(r, 'aprobado', 'ERP')
    persistir()
    return latencia(clonar(r))
  },

  async marcarNoDisponible(id: string, lineaId: string) {
    const r = requerimiento(id)
    const linea = r.lineas.find((l) => l.id === lineaId)
    if (!linea || (r.estado !== 'enviado' && r.estado !== 'aprobado')) {
      throw { mensaje: 'No se puede marcar esa línea.' }
    }
    linea.noDisponible = true
    const articulo = db.articulos.find((a) => a.id === linea.articuloId)
    r.historial.push({
      estado: r.estado,
      fecha: ahora(),
      autor: 'ERP',
      nota: `${articulo?.nombre ?? 'Artículo'} no disponible`,
    })
    persistir()
    return latencia(clonar(r))
  },

  /** Convierte en OC. La última línea con más de una unidad se convierte parcial. */
  async convertir(id: string) {
    const r = requerimiento(id)
    if (r.estado !== 'aprobado') throw { mensaje: 'Solo se convierte un requerimiento aprobado.' }
    if (r.lineas.some((l) => l.noDisponible)) {
      throw { mensaje: 'Hay líneas no disponibles: reemplázalas antes de convertir.' }
    }
    const parcial = [...r.lineas].reverse().find((l) => l.cantidad > 1)
    for (const l of r.lineas) {
      l.cantidadConvertida = l === parcial ? l.cantidad - 1 : l.cantidad
      // Precio neto de la OC: el costo actual del insumo por unidad de compra, con un 3 % de alza.
      const insumo = db.insumos.find((i) => i.id === l.insumoId)
      const factor = alternosDe(l.insumoId).find((v) => v.articuloId === l.articuloId)?.factor ?? 1
      l.precioNeto = Math.round((insumo?.costoUnitario ?? 0) * factor * 1.03 * 100) / 100
    }
    r.ordenCompra = `OC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`
    registrar(r, 'convertido', 'ERP', r.ordenCompra)
    persistir()
    return latencia(clonar(r))
  },

  async despachar(id: string) {
    const r = requerimiento(id)
    if (r.estado !== 'convertido') throw { mensaje: 'Solo se despacha lo convertido en OC.' }
    registrar(r, 'despachado', 'ERP')
    persistir()
    return latencia(clonar(r))
  },
}
