import type {
  AjusteParametros,
  CategoriaInsumo,
  Consulta,
  Insumo,
  Lote,
  NivelParametros,
  NuevaTransformacion,
  NuevaUbicacion,
  NuevoLote,
  Paginado,
  ParametrosAbastecimiento,
  ParametrosResueltos,
  StockDetalle,
  Transformacion,
  Ubicacion,
} from '@/types'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

/**
 * Reglas de abastecimiento de la vertical (F4.3, [D-004](../../docs/guia/decisiones.md)).
 *
 * Traduce lo que compra el ERP (artículo) en lo que usa la cocina (insumo):
 * conversión directa o transformación, con qué parámetros se controla cada
 * insumo, dónde se guarda y en qué lote.
 */

const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// ── Parámetros heredados ─────────────────────────────────────────────────────

/** Nivel más general: siempre tiene valor para todos los parámetros. */
export const parametrosPorDefecto: ParametrosAbastecimiento = {
  controlaLote: false,
  controlaVencimiento: false,
  fefo: false,
  diasAlerta: 7,
  bloquearVencidos: true,
  controlaUbicacion: false,
  tipoRecepcion: 'total',
}

/** Orden de herencia: el último que fije un valor manda. */
export const nivelesParametros: NivelParametros[] = [
  'cadena',
  'local',
  'almacen',
  'categoria',
  'insumo',
]

export const etiquetaNivel: Record<NivelParametros, string> = {
  cadena: 'Cadena',
  local: 'Local',
  almacen: 'Almacén',
  categoria: 'Categoría',
  insumo: 'Insumo',
}

export const etiquetaParametro: Record<keyof ParametrosAbastecimiento, string> = {
  controlaLote: 'Controla lote',
  controlaVencimiento: 'Controla vencimiento',
  fefo: 'Salida por FEFO',
  diasAlerta: 'Días de alerta antes de vencer',
  bloquearVencidos: 'Bloquear lotes vencidos',
  controlaUbicacion: 'Controla ubicación',
  tipoRecepcion: 'Tipo de recepción',
}

/** A qué apunta la `referencia` del ajuste en cada nivel. */
export interface Contexto {
  insumoId?: string
  almacenId?: string
  localId?: string
  categoria?: CategoriaInsumo
}

/** Completa el contexto con lo que se deduce: el local del almacén, la categoría del insumo. */
function contextoCompleto(ctx: Contexto): Contexto {
  const insumo = ctx.insumoId ? db.insumos.find((i) => i.id === ctx.insumoId) : undefined
  const almacen = ctx.almacenId ? db.almacenes.find((a) => a.id === ctx.almacenId) : undefined
  return {
    insumoId: ctx.insumoId,
    almacenId: ctx.almacenId,
    localId: ctx.localId ?? almacen?.localId,
    categoria: ctx.categoria ?? insumo?.categoria,
  }
}

function referenciaDe(nivel: NivelParametros, ctx: Contexto): string | undefined {
  if (nivel === 'cadena') return undefined
  if (nivel === 'local') return ctx.localId
  if (nivel === 'almacen') return ctx.almacenId
  if (nivel === 'categoria') return ctx.categoria
  return ctx.insumoId
}

function ajusteDe(nivel: NivelParametros, referencia?: string) {
  return db.ajustesParametros.find(
    (a) => a.nivel === nivel && (a.referencia ?? undefined) === (referencia ?? undefined),
  )
}

/**
 * Resuelve los parámetros que aplican a un insumo en un almacén, diciendo de
 * qué nivel salió cada uno. Los niveles que el contexto no alcanza (por
 * ejemplo el almacén, cuando se consulta solo el insumo) se saltan.
 */
export function resolverParametros(contexto: Contexto): ParametrosResueltos {
  const ctx = contextoCompleto(contexto)
  const resuelto = {} as ParametrosResueltos
  for (const clave of Object.keys(parametrosPorDefecto) as (keyof ParametrosAbastecimiento)[]) {
    resuelto[clave] = { valor: parametrosPorDefecto[clave], nivel: 'cadena' } as never
  }

  for (const nivel of nivelesParametros) {
    const referencia = referenciaDe(nivel, ctx)
    if (nivel !== 'cadena' && !referencia) continue
    const valores = { ...ajusteDe(nivel, referencia)?.valores }
    // El insumo puede llevar sus propios valores en la ficha, sin ajuste aparte.
    if (nivel === 'insumo' && ctx.insumoId) {
      Object.assign(valores, db.insumos.find((i) => i.id === ctx.insumoId)?.parametros ?? {})
    }
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor === undefined) continue
      resuelto[clave as keyof ParametrosAbastecimiento] = { valor, nivel } as never
    }
  }
  return resuelto
}

/** Solo los valores, sin el nivel del que vienen. */
export function valoresParametros(contexto: Contexto): ParametrosAbastecimiento {
  const resuelto = resolverParametros(contexto)
  return Object.fromEntries(
    Object.entries(resuelto).map(([clave, { valor }]) => [clave, valor]),
  ) as unknown as ParametrosAbastecimiento
}

export const parametrosAbastecimientoService = {
  async ajustes(nivel?: NivelParametros): Promise<AjusteParametros[]> {
    const lista = nivel
      ? db.ajustesParametros.filter((a) => a.nivel === nivel)
      : db.ajustesParametros
    return latencia([...lista])
  },

  async resolver(contexto: Contexto): Promise<ParametrosResueltos> {
    return latencia(resolverParametros(contexto))
  },

  /**
   * Fija (o quita) valores en un nivel. Un valor `undefined` se borra del
   * ajuste y ese parámetro vuelve a heredarse.
   */
  async guardarAjuste(
    nivel: NivelParametros,
    referencia: string | undefined,
    valores: Partial<ParametrosAbastecimiento>,
  ): Promise<AjusteParametros> {
    if (nivel !== 'cadena' && !referencia) {
      throw errorCampo('referencia', `Elige a qué ${etiquetaNivel[nivel].toLowerCase()} aplica.`)
    }
    const limpios = Object.fromEntries(
      Object.entries(valores).filter(([, v]) => v !== undefined),
    ) as Partial<ParametrosAbastecimiento>

    if (nivel === 'cadena') {
      // El nivel más general no hereda de nadie: no admite huecos.
      for (const clave of Object.keys(parametrosPorDefecto) as (keyof ParametrosAbastecimiento)[]) {
        if (limpios[clave] === undefined) {
          ;(limpios[clave] as unknown) = parametrosPorDefecto[clave]
        }
      }
    }

    const existente = ajusteDe(nivel, referencia)
    if (existente) {
      existente.valores = limpios
      if (nivel !== 'cadena' && Object.keys(limpios).length === 0) {
        // Un ajuste sin valores no ajusta nada: se retira.
        db.ajustesParametros = db.ajustesParametros.filter((a) => a !== existente)
      }
      persistir()
      return latencia(existente)
    }

    const ajuste: AjusteParametros = {
      id: nuevoId('pa'),
      nivel,
      referencia: nivel === 'cadena' ? undefined : referencia,
      valores: limpios,
    }
    if (Object.keys(limpios).length > 0) db.ajustesParametros.push(ajuste)
    persistir()
    return latencia(ajuste)
  },

  async eliminarAjuste(id: string): Promise<void> {
    const ajuste = db.ajustesParametros.find((a) => a.id === id)
    if (ajuste?.nivel === 'cadena') {
      throw { mensaje: 'El nivel de cadena es el que da los valores por defecto: no se elimina.' }
    }
    db.ajustesParametros = db.ajustesParametros.filter((a) => a.id !== id)
    persistir()
    await latencia(null)
  },
}

// ── Ubicaciones ──────────────────────────────────────────────────────────────

/** Código legible de una ubicación: `P1-E2-F3-C4`. */
export function codigoUbicacion(u: Pick<Ubicacion, 'pasillo' | 'estante' | 'fila' | 'columna'>) {
  return [u.pasillo, u.estante, u.fila, u.columna]
    .map((p) => p.trim())
    .filter(Boolean)
    .join('-')
}

const repoUbicaciones = crearRepositorio('ubicaciones', {
  prefijo: 'ub',
  entidad: 'Ubicación',
  camposBusqueda: ['pasillo', 'estante', 'fila', 'columna'],
})

function validarUbicacion(datos: NuevaUbicacion, id?: string) {
  if (!datos.almacenId) throw errorCampo('almacenId', 'Elige el almacén.')
  if (!db.almacenes.some((a) => a.id === datos.almacenId)) {
    throw errorCampo('almacenId', 'Almacén no encontrado.')
  }
  const codigo = codigoUbicacion(datos)
  if (!codigo) {
    throw errorCampo('pasillo', 'Indica al menos pasillo o estante.', 'Ubicación vacía')
  }
  const mismas = db.ubicaciones.filter((u) => u.almacenId === datos.almacenId)
  if (existeOtro(mismas, codigoUbicacion, codigo, id)) {
    throw errorCampo('pasillo', `Ya existe la ubicación ${codigo} en ese almacén.`, 'Duplicada')
  }
}

/** Como mucho una ubicación por defecto por almacén: al marcar una, se desmarca la anterior. */
function unicaPorDefecto(almacenId: string, id: string) {
  for (const u of db.ubicaciones) {
    if (u.almacenId === almacenId && u.id !== id) u.porDefecto = false
  }
}

export const ubicacionesService = {
  consultar: repoUbicaciones.consultar,
  todos: repoUbicaciones.todos,
  obtener: repoUbicaciones.obtener,

  async crear(datos: NuevaUbicacion): Promise<Ubicacion> {
    validarUbicacion(datos)
    const ubicacion = await repoUbicaciones.crear(datos)
    if (ubicacion.porDefecto) unicaPorDefecto(ubicacion.almacenId, ubicacion.id)
    persistir()
    return ubicacion
  },

  async actualizar(id: string, cambios: Partial<NuevaUbicacion>): Promise<Ubicacion> {
    const actual = db.ubicaciones.find((u) => u.id === id)
    if (!actual) throw { mensaje: 'Ubicación no encontrada.' }
    validarUbicacion({ ...actual, ...cambios }, id)
    const ubicacion = await repoUbicaciones.actualizar(id, cambios)
    if (ubicacion.porDefecto) unicaPorDefecto(ubicacion.almacenId, id)
    persistir()
    return ubicacion
  },

  async eliminar(id: string): Promise<void> {
    if (db.stockDetalle.some((s) => s.ubicacionId === id && s.cantidad > 0)) {
      throw { mensaje: 'No se puede eliminar: la ubicación todavía guarda stock.' }
    }
    await repoUbicaciones.eliminar(id)
  },

  /** Ubicación que propone la recepción en un almacén. */
  porDefectoDe(almacenId: string): Ubicacion | undefined {
    return db.ubicaciones.find((u) => u.almacenId === almacenId && u.porDefecto && u.activo)
  },
}

// ── Transformaciones ─────────────────────────────────────────────────────────

const repoTransformaciones = crearRepositorio('transformaciones', {
  prefijo: 'tf',
  entidad: 'Transformación',
  camposBusqueda: ['nombre'],
})

function validarTransformacion(datos: NuevaTransformacion, id?: string) {
  const nombre = datos.nombre.trim()
  if (!nombre) throw errorCampo('nombre', 'El nombre es obligatorio.')
  if (existeOtro(db.transformaciones, (t) => t.nombre, nombre, id)) {
    throw errorCampo('nombre', 'Ya existe una transformación con ese nombre.', 'Nombre duplicado')
  }

  const entradas = datos.entradas.filter((e) => e.insumoId && e.cantidad > 0)
  if (entradas.length === 0) throw errorCampo('entradas', 'Añade al menos un insumo de entrada.')

  const salidas = datos.salidas.filter((s) => s.cantidad > 0)
  if (salidas.length === 0) throw errorCampo('salidas', 'Añade al menos una salida.')
  if (salidas.some((s) => s.tipo === 'insumo' && !s.insumoId)) {
    throw errorCampo('salidas', 'Elige el insumo de cada salida que no sea merma.')
  }

  const productos = salidas.filter((s) => s.tipo === 'insumo')
  if (productos.length === 0) {
    throw errorCampo('salidas', 'Una transformación que solo produce merma no tiene sentido.')
  }
  const repetido = productos.find(
    (s, i) => productos.findIndex((o) => o.insumoId === s.insumoId) !== i,
  )
  if (repetido) throw errorCampo('salidas', 'Un mismo insumo no puede salir dos veces.')
  if (productos.some((s) => entradas.some((e) => e.insumoId === s.insumoId))) {
    throw errorCampo('salidas', 'Un insumo no puede entrar y salir de la misma transformación.')
  }

  const reparto = productos.reduce((t, s) => t + Number(s.reparto || 0), 0)
  if (Math.abs(reparto - 100) > 0.01) {
    throw errorCampo(
      'salidas',
      `El reparto del costo entre las salidas debe sumar 100 %; ahora suma ${r2(reparto)} %.`,
      'El reparto no suma 100 %',
    )
  }
  return { ...datos, nombre, entradas, salidas }
}

/** Reparto por defecto: proporcional a la cantidad de cada salida que no es merma. */
export function repartoProporcional(salidas: { tipo: string; cantidad: number }[]) {
  const total = salidas
    .filter((s) => s.tipo === 'insumo')
    .reduce((t, s) => t + Number(s.cantidad || 0), 0)
  return salidas.map((s) =>
    s.tipo === 'merma' || total <= 0 ? 0 : r2((Number(s.cantidad) / total) * 100),
  )
}

/** Transformación activa que produce un insumo, si la hay. */
export function transformacionQueProduce(insumoId: string): Transformacion | undefined {
  return db.transformaciones.find(
    (t) => t.activo && t.salidas.some((s) => s.tipo === 'insumo' && s.insumoId === insumoId),
  )
}

function costoEntradas(entradas: { insumoId: string; cantidad: number }[]) {
  return entradas.reduce((total, e) => {
    const insumo = db.insumos.find((i) => i.id === e.insumoId)
    return total + (insumo ? insumo.costoUnitario * e.cantidad : 0)
  }, 0)
}

/**
 * Costo unitario que hereda cada salida: el costo de las entradas se reparte
 * según su porcentaje y se divide entre la cantidad que sale. La merma no
 * absorbe costo, así que encarece el resto.
 */
export function costosDeSalida(transformacion: Transformacion): Record<string, number> {
  const total = costoEntradas(transformacion.entradas)
  const costos: Record<string, number> = {}
  for (const salida of transformacion.salidas) {
    if (salida.tipo !== 'insumo' || !salida.insumoId || salida.cantidad <= 0) continue
    costos[salida.insumoId] = r2((total * (salida.reparto / 100)) / salida.cantidad)
  }
  return costos
}

/**
 * Recalcula el costo de todos los insumos que salen de una transformación.
 * Se repite hasta que deja de cambiar (una transformación puede alimentar a
 * otra) con un tope, para no colgarse si alguien encadena un ciclo.
 */
export function recalcularCostosTransformados() {
  for (let pasada = 0; pasada < 10; pasada++) {
    let cambio = false
    for (const transformacion of db.transformaciones) {
      if (!transformacion.activo) continue
      for (const [insumoId, costo] of Object.entries(costosDeSalida(transformacion))) {
        const insumo = db.insumos.find((i) => i.id === insumoId)
        if (insumo && insumo.costoUnitario !== costo) {
          insumo.costoUnitario = costo
          cambio = true
        }
      }
    }
    if (!cambio) return
  }
}

export const transformacionesService = {
  consultar: repoTransformaciones.consultar,
  todos: repoTransformaciones.todos,
  obtener: repoTransformaciones.obtener,
  costosDeSalida,
  repartoProporcional,
  transformacionQueProduce,

  async crear(datos: NuevaTransformacion): Promise<Transformacion> {
    const limpia = validarTransformacion(datos)
    const transformacion = await repoTransformaciones.crear(limpia)
    recalcularCostosTransformados()
    persistir()
    return transformacion
  },

  async actualizar(id: string, cambios: Partial<NuevaTransformacion>): Promise<Transformacion> {
    const actual = db.transformaciones.find((t) => t.id === id)
    if (!actual) throw { mensaje: 'Transformación no encontrada.' }
    const limpia = validarTransformacion({ ...actual, ...cambios }, id)
    const transformacion = await repoTransformaciones.actualizar(id, limpia)
    recalcularCostosTransformados()
    persistir()
    return transformacion
  },

  async eliminar(id: string): Promise<void> {
    await repoTransformaciones.eliminar(id)
    recalcularCostosTransformados()
    persistir()
  },

  /** Costo de las entradas de una transformación, para mostrarlo en pantalla. */
  costoEntradas(transformacion: Pick<Transformacion, 'entradas'>) {
    return r2(costoEntradas(transformacion.entradas))
  },
}

// ── Lotes y stock detallado ──────────────────────────────────────────────────

export const lotesService = {
  async porInsumo(insumoId: string): Promise<Lote[]> {
    const lotes = db.lotes.filter((l) => l.insumoId === insumoId)
    // Primero el que vence antes: es el orden en el que se consume con FEFO.
    return latencia([...lotes].sort(ordenFefo))
  },

  async crear(datos: NuevoLote): Promise<Lote> {
    const insumo = db.insumos.find((i) => i.id === datos.insumoId)
    if (!insumo) throw errorCampo('insumoId', 'Insumo no encontrado.')
    const codigo = datos.codigo.trim()
    if (!codigo) throw errorCampo('codigo', 'El código del lote es obligatorio.')
    const suyos = db.lotes.filter((l) => l.insumoId === datos.insumoId)
    if (existeOtro(suyos, (l) => l.codigo, codigo)) {
      throw errorCampo('codigo', 'Ese insumo ya tiene un lote con ese código.', 'Lote duplicado')
    }
    const { controlaVencimiento } = valoresParametros({ insumoId: datos.insumoId })
    if (controlaVencimiento && !datos.vencimiento) {
      throw errorCampo('vencimiento', `${insumo.nombre} controla vencimiento: indícalo.`)
    }
    const lote: Lote = {
      id: nuevoId('lt'),
      insumoId: datos.insumoId,
      codigo,
      vencimiento: datos.vencimiento,
      recepcion: datos.recepcion ?? new Date().toISOString(),
    }
    db.lotes.push(lote)
    persistir()
    return latencia(lote)
  },
}

/** Sin vencimiento va al final: no compite con los que caducan. */
function ordenFefo(a: Lote, b: Lote) {
  if (a.vencimiento && b.vencimiento) return a.vencimiento.localeCompare(b.vencimiento)
  if (a.vencimiento) return -1
  if (b.vencimiento) return 1
  return a.recepcion.localeCompare(b.recepcion)
}

export interface FilaStockDetalle extends StockDetalle {
  lote?: Lote
  ubicacion?: Ubicacion
  /** Días que faltan para vencer; negativo si ya venció. */
  diasParaVencer?: number
  vencido: boolean
  /** Dentro de los días de alerta del insumo. */
  porVencer: boolean
}

function diasHasta(fecha: string) {
  const hoy = new Date().toLocaleDateString('sv-SE')
  const ms = new Date(`${fecha}T00:00:00`).getTime() - new Date(`${hoy}T00:00:00`).getTime()
  return Math.round(ms / 86_400_000)
}

export const stockDetalleService = {
  /** Stock detallado de un insumo, en orden FEFO. */
  async porInsumo(insumoId: string, almacenId?: string): Promise<FilaStockDetalle[]> {
    const filas = db.stockDetalle
      .filter((s) => s.insumoId === insumoId && (!almacenId || s.almacenId === almacenId))
      .map((s) => decorar(s))
    filas.sort((a, b) => {
      if (a.lote && b.lote) return ordenFefo(a.lote, b.lote)
      return a.lote ? -1 : b.lote ? 1 : 0
    })
    return latencia(filas)
  },

  async consultar(consulta: Consulta = {}): Promise<Paginado<FilaStockDetalle>> {
    const filas = db.stockDetalle.map((s) => decorar(s))
    return latencia(aplicarConsulta(filas, consulta, []))
  },

  /**
   * ¿Cuadra el stock detallado con el principal? Devuelve las diferencias por
   * insumo y almacén. Solo se comprueban los insumos que controlan lote o
   * ubicación: los demás no llevan detalle.
   */
  async descuadres(): Promise<
    { insumo: Insumo; almacenId: string; principal: number; detallado: number }[]
  > {
    const filas: { insumo: Insumo; almacenId: string; principal: number; detallado: number }[] = []
    for (const insumo of db.insumos) {
      for (const existencia of insumo.existencias) {
        const { controlaLote, controlaUbicacion } = valoresParametros({
          insumoId: insumo.id,
          almacenId: existencia.almacenId,
        })
        if (!controlaLote && !controlaUbicacion) continue
        const detallado = r3(
          db.stockDetalle
            .filter((s) => s.insumoId === insumo.id && s.almacenId === existencia.almacenId)
            .reduce((t, s) => t + s.cantidad, 0),
        )
        if (Math.abs(detallado - existencia.cantidad) > 0.001) {
          filas.push({
            insumo,
            almacenId: existencia.almacenId,
            principal: existencia.cantidad,
            detallado,
          })
        }
      }
    }
    return latencia(filas)
  },

  /**
   * Suma (o resta, con cantidad negativa) stock detallado en un lote y una
   * ubicación. Lo usará la recepción de F4.5; aquí sirve para cuadrar y para
   * que la semilla tenga detalle.
   */
  ajustar(datos: Omit<StockDetalle, 'id'>): StockDetalle {
    const { controlaUbicacion } = valoresParametros({
      insumoId: datos.insumoId,
      almacenId: datos.almacenId,
    })
    if (controlaUbicacion && !datos.ubicacionId) {
      const porDefecto = ubicacionesService.porDefectoDe(datos.almacenId)
      if (!porDefecto) {
        throw errorCampo(
          'ubicacionId',
          'El insumo controla ubicación y el almacén no tiene una por defecto.',
          'Falta ubicación',
        )
      }
      datos = { ...datos, ubicacionId: porDefecto.id }
    }
    const existente = db.stockDetalle.find(
      (s) =>
        s.insumoId === datos.insumoId &&
        s.almacenId === datos.almacenId &&
        (s.loteId ?? undefined) === (datos.loteId ?? undefined) &&
        (s.ubicacionId ?? undefined) === (datos.ubicacionId ?? undefined),
    )
    if (existente) {
      const resultante = r3(existente.cantidad + datos.cantidad)
      if (resultante < 0) {
        throw errorCampo('cantidad', 'El stock detallado no puede quedar negativo.')
      }
      existente.cantidad = resultante
      persistir()
      return existente
    }
    if (datos.cantidad < 0) {
      throw errorCampo('cantidad', 'No hay stock detallado del que descontar.')
    }
    const fila: StockDetalle = { ...clonar(datos), id: nuevoId('sd') }
    db.stockDetalle.push(fila)
    persistir()
    return fila
  },
}

function decorar(s: StockDetalle): FilaStockDetalle {
  const lote = s.loteId ? db.lotes.find((l) => l.id === s.loteId) : undefined
  const ubicacion = s.ubicacionId ? db.ubicaciones.find((u) => u.id === s.ubicacionId) : undefined
  const dias = lote?.vencimiento ? diasHasta(lote.vencimiento) : undefined
  const { diasAlerta } = valoresParametros({ insumoId: s.insumoId, almacenId: s.almacenId })
  return {
    ...s,
    lote,
    ubicacion,
    diasParaVencer: dias,
    vencido: dias !== undefined && dias < 0,
    porVencer: dias !== undefined && dias >= 0 && dias <= diasAlerta,
  }
}
