import type {
  Alergeno,
  ClaseAbc,
  EfectoModificador,
  FichaTecnica,
  CostoLinea,
  CostoReceta,
  LineaReceta,
  RecetaEstandar,
  UnidadMedida,
  VersionReceta,
} from '@/types'
import { registrar } from './auditoria.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso, valorConfig } from './parametros.service'
import { precioVigente, vendibles } from './precios.service'

/**
 * Receta estandarizada (D-007). Vive en el producto vendible (producto sin
 * presentaciones o cada presentación), tiene versiones con vigencia y se
 * costea en valores netos contra el precio de la lista vigente (D-010).
 */

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const r4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000
const hoy = () => new Date().toISOString().slice(0, 10)

// ── Unidades ──

const dimension: Record<UnidadMedida, { grupo: string; factor: number }> = {
  kg: { grupo: 'masa', factor: 1 },
  g: { grupo: 'masa', factor: 0.001 },
  l: { grupo: 'volumen', factor: 1 },
  ml: { grupo: 'volumen', factor: 0.001 },
  unidad: { grupo: 'unidad', factor: 1 },
  paquete: { grupo: 'paquete', factor: 1 },
}

/** Unidades en las que se puede escribir una línea de un insumo con esta unidad. */
export function unidadesCompatibles(unidad: UnidadMedida): UnidadMedida[] {
  return (Object.keys(dimension) as UnidadMedida[]).filter(
    (u) => dimension[u].grupo === dimension[unidad].grupo,
  )
}

/** Convierte dentro de la misma dimensión; `null` si no son convertibles. */
export function convertir(cantidad: number, de: UnidadMedida, a: UnidadMedida): number | null {
  if (dimension[de].grupo !== dimension[a].grupo) return null
  return (cantidad * dimension[de].factor) / dimension[a].factor
}

// ── Consultas ──

/** Con aprobación activa, un borrador no rige aunque llegue su fecha. */
export function versionVigente(receta: RecetaEstandar | undefined, fecha = hoy()) {
  const conAprobacion = valorConfig<boolean>('recetas.aprobacion')
  return receta?.versiones
    .filter((v) => v.vigenteDesde <= fecha && (!conAprobacion || v.estado !== 'borrador'))
    .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde) || b.numero - a.numero)[0]
}

export const recetaDe = (vendibleId: string) =>
  db.recetasEstandar.find((r) => r.vendibleId === vendibleId)

export const insumoEnRecetas = (insumoId: string) =>
  db.recetasEstandar.some((r) =>
    r.versiones.some((v) => v.lineas.some((l) => l.insumoId === insumoId)),
  ) ||
  db.productos.some((p) =>
    p.gruposModificadores.some((g) =>
      g.modificadores.some((m) => m.efectos?.some((e) => e.insumoId === insumoId)),
    ),
  )

function modificador(id: string) {
  for (const p of db.productos)
    for (const g of p.gruposModificadores) {
      const m = g.modificadores.find((x) => x.id === id)
      if (m) return { producto: p, modificador: m }
    }
  return null
}

/** Alérgenos que aportan los insumos de unas líneas (o de la versión vigente). */
export function alergenosDe(vendibleId: string, lineas?: LineaReceta[]): Alergeno[] {
  const fuente = lineas ?? versionVigente(recetaDe(vendibleId))?.lineas ?? []
  const set = new Set<Alergeno>()
  for (const l of fuente)
    if (l.tipo === 'ingrediente')
      for (const a of db.insumos.find((i) => i.id === l.insumoId)?.alergenos ?? []) set.add(a)
  return [...set]
}

/** Qué falta para aprobar una versión. Vacío: se puede aprobar. */
export function faltantesAprobacion(version: Pick<VersionReceta, 'lineas' | 'ficha'>): string[] {
  const faltan: string[] = []
  if (!(version.ficha?.porciones && version.ficha.porciones > 0))
    faltan.push('Indica cuántas porciones rinde.')
  if (!version.ficha?.pasos.some((p) => p.descripcion.trim()))
    faltan.push('Escribe al menos un paso de preparación.')
  const sinCosto = version.lineas
    .filter((l) => l.tipo === 'ingrediente')
    .map((l) => db.insumos.find((i) => i.id === l.insumoId))
    .filter((i) => !i || i.costoUnitario <= 0)
  if (sinCosto.length)
    faltan.push(`Sin costo: ${sinCosto.map((i) => i?.nombre ?? 'insumo eliminado').join(', ')}.`)
  return faltan
}

function clasificar(lineas: CostoLinea[]) {
  const ingredientes = lineas
    .filter((l) => l.tipo === 'ingrediente')
    .sort((a, b) => b.costo - a.costo)
  const total = ingredientes.reduce((s, l) => s + l.costo, 0)
  let acumulado = 0
  for (const l of ingredientes) {
    l.participacion = total ? r2((l.costo / total) * 100) : 0
    const antes = acumulado
    acumulado += l.participacion
    // A: lo que explica el primer 80 % del costo; B: hasta el 95 %; C: el resto.
    const clase: ClaseAbc = antes < 80 ? 'A' : antes < 95 ? 'B' : 'C'
    l.clase = clase
  }
}

export interface OpcionesCosto {
  localId: string
  canalId: string
  fecha?: string
  /** Simulación: factor sobre el costo de ciertos insumos (1.1 = +10 %). */
  ajustesCosto?: Record<string, number>
  /** Simulación: líneas en edición en lugar de la versión vigente. */
  lineas?: LineaReceta[]
}

/** Costo, food cost y margen de contribución de un vendible en un local y canal. */
export function costoReceta(vendibleId: string, o: OpcionesCosto): CostoReceta {
  const fecha = o.fecha ?? hoy()
  const receta = recetaDe(vendibleId)
  const version = o.lineas ? undefined : versionVigente(receta, fecha)
  // Un adicional se costea con los insumos que suma su modificador.
  const delModificador = vendibleId.startsWith('m:')
    ? (modificador(vendibleId.slice(2))?.modificador.efectos ?? [])
        .filter((e) => e.efecto === 'suma')
        .map<LineaReceta>((e, i) => ({
          id: `${vendibleId}-${i}`,
          tipo: 'ingrediente',
          insumoId: e.insumoId,
          cantidad: e.cantidad,
          unidad: e.unidad,
        }))
    : []
  const lineasFuente = o.lineas ?? version?.lineas ?? delModificador
  const brutaNeta = valorConfig<boolean>('recetas.cantidadBrutaNeta', o.localId)
  const conRendimiento = valorConfig<boolean>('recetas.rendimientoInsumo', o.localId)
  const tolerancia = valorConfig<number>('recetas.toleranciaCosto')

  const lineas: CostoLinea[] = []
  for (const l of lineasFuente) {
    if (l.tipo === 'consumible' && l.canalIds?.length && !l.canalIds.includes(o.canalId)) continue
    const insumo = db.insumos.find((i) => i.id === l.insumoId)
    let cantidadInsumo = insumo ? (convertir(l.cantidad, l.unidad, insumo.unidad) ?? 0) : 0
    const rendimiento = insumo?.rendimientoPorcentaje
    // Costo útil: la cantidad neta se divide entre el rendimiento, nunca se suma la merma.
    if (brutaNeta && conRendimiento && l.cantidadTipo === 'neta' && rendimiento)
      cantidadInsumo = cantidadInsumo / (rendimiento / 100)
    const costoUnitario = (insumo?.costoUnitario ?? 0) * (o.ajustesCosto?.[l.insumoId] ?? 1)
    const guardado = version?.costosAlGuardar[l.insumoId]
    lineas.push({
      lineaId: l.id,
      insumoId: l.insumoId,
      nombre: insumo?.nombre ?? 'Insumo eliminado',
      tipo: l.tipo,
      cantidadInsumo: r4(cantidadInsumo),
      costo: r4(cantidadInsumo * costoUnitario),
      sinCosto: !insumo || costoUnitario <= 0,
      desactualizado:
        !!guardado && Math.abs(costoUnitario - guardado) / guardado > tolerancia / 100,
      participacion: 0,
    })
  }
  clasificar(lineas)

  const costoIngredientes = r2(
    lineas.filter((l) => l.tipo === 'ingrediente').reduce((s, l) => s + l.costo, 0),
  )
  const costoConsumibles = r2(
    lineas.filter((l) => l.tipo === 'consumible').reduce((s, l) => s + l.costo, 0),
  )
  const precio = precioVigente(vendibleId, o.localId, o.canalId, fecha)
  const precioNeto = precio.valorVenta
  const precioConIgv = r2(precio.valorVenta + precio.igv)
  const canal = db.canales.find((c) => c.id === o.canalId)
  // La comisión del canal se toma sobre el precio neto.
  const comision = r2(precioNeto * ((canal?.comisionPorcentaje ?? 0) / 100))

  const vendible = vendibles().find((v) => v.id === vendibleId)
  const categoria = db.categorias.find((c) => c.id === vendible?.categoriaId)
  const seccion = db.categorias.find((c) => c.id === categoria?.seccionId)
  const objetivoCategoria = categoria?.foodCostObjetivo ?? seccion?.foodCostObjetivo
  const [objetivo, origenObjetivo] =
    receta?.foodCostObjetivo !== undefined
      ? [receta.foodCostObjetivo, 'presentacion' as const]
      : objetivoCategoria !== undefined
        ? [objetivoCategoria, 'categoria' as const]
        : [valorConfig<number>('recetas.foodCostObjetivo', o.localId), 'configuracion' as const]

  const hayLineas = lineas.some((l) => l.tipo === 'ingrediente')
  return {
    vendibleId,
    estado: !hayLineas
      ? 'sinReceta'
      : lineas.some((l) => l.sinCosto)
        ? 'parcial'
        : lineas.some((l) => l.desactualizado)
          ? 'desactualizado'
          : 'completo',
    version: version?.numero,
    lineas,
    costoIngredientes,
    costoConsumibles,
    precioNeto,
    precioConIgv,
    comision,
    foodCost: hayLineas && precioNeto > 0 ? r2((costoIngredientes / precioNeto) * 100) : null,
    margenContribucion: r2(precioNeto - costoIngredientes - costoConsumibles - comision),
    objetivo,
    origenObjetivo,
  }
}

export interface CostoCombo {
  comboId: string
  costo: number
  precioNeto: number
  foodCost: number | null
  completo: boolean
  grupos: { nombre: string; costo: number; opcion: string }[]
}

/**
 * Costo de un combo desde sus componentes. Cuando un grupo deja elegir, se
 * toma la opción más cara: el combo nunca se costea por debajo de lo real.
 */
export function costoCombo(comboId: string, o: OpcionesCosto): CostoCombo | null {
  const combo = db.combos.find((c) => c.id === comboId)
  if (!combo) return null
  const todos = vendibles()
  let completo = true
  const grupos = combo.grupos.map((g) => {
    const opciones = g.opciones.map((productoId) => {
      const v = todos.find(
        (x) => x.productoId === productoId && (x.tipo === 'producto' || x.tipo === 'presentacion'),
      )
      const c = v ? costoReceta(v.id, o) : null
      if (!c || c.estado === 'sinReceta' || c.estado === 'parcial') completo = false
      return { opcion: v?.nombre ?? productoId, costo: c?.costoIngredientes ?? 0 }
    })
    const mayor = opciones.sort((a, b) => b.costo - a.costo)[0] ?? { opcion: '—', costo: 0 }
    return { nombre: g.nombre, ...mayor }
  })
  const costo = r2(grupos.reduce((s, g) => s + g.costo, 0))
  const precioNeto = precioVigente(
    `c:${comboId}`,
    o.localId,
    o.canalId,
    o.fecha ?? hoy(),
  ).valorVenta
  return {
    comboId,
    costo,
    precioNeto,
    foodCost: precioNeto > 0 ? r2((costo / precioNeto) * 100) : null,
    completo,
    grupos,
  }
}

/** Precio sugerido para llegar a un food cost objetivo. No cambia nada. */
export function precioParaObjetivo(costo: number, objetivo: number) {
  const tasa = db.impuestos.igvPorcentaje
  const neto = objetivo > 0 ? r2(costo / (objetivo / 100)) : 0
  return { neto, conIgv: r2(neto * (1 + tasa / 100)) }
}

/** Food cost y margen si se aceptara un precio con IGV. No cambia nada. */
export function simularPrecioAceptado(
  precioConIgv: number,
  costo: { costoIngredientes: number; costoConsumibles: number },
  canalId: string,
) {
  const neto = precioConIgv / (1 + db.impuestos.igvPorcentaje / 100)
  const comision =
    neto * ((db.canales.find((c) => c.id === canalId)?.comisionPorcentaje ?? 0) / 100)
  return {
    neto: r2(neto),
    foodCost: neto > 0 ? r2((costo.costoIngredientes / neto) * 100) : null,
    margen: r2(neto - costo.costoIngredientes - costo.costoConsumibles - comision),
  }
}

export interface ImpactoInsumo {
  vendibleId: string
  nombre: string
  costoAntes: number
  costoDespues: number
  foodCostAntes: number | null
  foodCostDespues: number | null
  objetivo: number
}

/** Recetas vigentes que usan un insumo y cómo cambian con un aumento de su costo. */
export function impactoInsumo(insumoId: string, porcentaje: number, o: OpcionesCosto) {
  const todos = vendibles()
  return db.recetasEstandar
    .filter((r) => versionVigente(r, o.fecha)?.lineas.some((l) => l.insumoId === insumoId))
    .map<ImpactoInsumo>((r) => {
      const antes = costoReceta(r.vendibleId, o)
      const despues = costoReceta(r.vendibleId, {
        ...o,
        ajustesCosto: { [insumoId]: 1 + porcentaje / 100 },
      })
      return {
        vendibleId: r.vendibleId,
        nombre: todos.find((v) => v.id === r.vendibleId)?.nombre ?? r.vendibleId,
        costoAntes: antes.costoIngredientes,
        costoDespues: despues.costoIngredientes,
        foodCostAntes: antes.foodCost,
        foodCostDespues: despues.foodCost,
        objetivo: antes.objetivo,
      }
    })
    .sort((a, b) => (b.foodCostDespues ?? 0) - (a.foodCostDespues ?? 0))
}

// ── Escritura ──

export interface NuevaVersion {
  lineas: LineaReceta[]
  vigenteDesde: string
  nota?: string
  ficha?: FichaTecnica
}

function limpiarFicha(ficha?: FichaTecnica): FichaTecnica | undefined {
  if (!ficha) return undefined
  const pasos = ficha.pasos
    .filter((p) => p.descripcion.trim())
    .map((p) => ({ ...p, id: p.id || nuevoId('pf'), descripcion: p.descripcion.trim() }))
  const limpia: FichaTecnica = { ...clonar(ficha), pasos }
  if (!limpia.conservacion?.trim()) delete limpia.conservacion
  const vacia =
    !pasos.length &&
    limpia.porciones === undefined &&
    !limpia.conservacion &&
    !limpia.fotoEmplatado &&
    limpia.toleranciaPesoPorcentaje === undefined
  return vacia ? undefined : limpia
}

function validarVersion(vendibleId: string, datos: NuevaVersion) {
  const v = vendibles().find((x) => x.id === vendibleId)
  if (!v || (v.tipo !== 'producto' && v.tipo !== 'presentacion'))
    throw { mensaje: 'La receta es de un producto o de una de sus presentaciones.' }
  if (recetaDe(vendibleId)?.reventaInsumoId)
    throw { mensaje: 'Es reventa: su receta es 1:1. Quita la reventa para escribir una receta.' }
  const ficha = datos.ficha
  if (ficha) {
    if (ficha.porciones !== undefined && !(ficha.porciones > 0))
      throw errorCampo('ficha', 'Las porciones deben ser mayores a 0.')
    if (
      ficha.toleranciaPesoPorcentaje !== undefined &&
      !(ficha.toleranciaPesoPorcentaje >= 0 && ficha.toleranciaPesoPorcentaje <= 50)
    )
      throw errorCampo('ficha', 'La tolerancia de peso debe estar entre 0 % y 50 %.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.vigenteDesde ?? ''))
    throw errorCampo('vigenteDesde', 'Indica desde cuándo rige la versión.', 'Requerido')
  const ingredientes = datos.lineas.filter((l) => l.tipo === 'ingrediente')
  if (!ingredientes.length)
    throw errorCampo('lineas', 'La receta necesita al menos un ingrediente.', 'Sin ingredientes')
  const vistos = new Set<string>()
  for (const l of datos.lineas) {
    const insumo = db.insumos.find((i) => i.id === l.insumoId)
    if (!insumo) throw errorCampo('lineas', 'Elige el insumo de cada línea.')
    if (!(Number(l.cantidad) > 0))
      throw errorCampo('lineas', `Indica la cantidad de ${insumo.nombre}.`)
    if (convertir(1, l.unidad, insumo.unidad) === null)
      throw errorCampo(
        'lineas',
        `${insumo.nombre} se mide en ${insumo.unidad}: la línea no puede ir en ${l.unidad}.`,
      )
    const clave = `${l.tipo}:${l.insumoId}:${l.cantidadTipo ?? ''}`
    if (vistos.has(clave)) throw errorCampo('lineas', `${insumo.nombre} está dos veces.`)
    vistos.add(clave)
  }
  const receta = recetaDe(vendibleId)
  const ultima = receta?.versiones.reduce<VersionReceta | undefined>(
    (m, x) => (!m || x.vigenteDesde > m.vigenteDesde ? x : m),
    undefined,
  )
  if (ultima && datos.vigenteDesde < ultima.vigenteDesde)
    throw errorCampo(
      'vigenteDesde',
      `Ya hay una versión desde ${ultima.vigenteDesde}: la nueva debe empezar ese día o después.`,
      'Antes de la última versión',
    )
}

const nombreVendible = (id: string) => vendibles().find((v) => v.id === id)?.nombre ?? id

export const recetasService = {
  async listar(): Promise<RecetaEstandar[]> {
    return latencia(clonar(db.recetasEstandar))
  },

  /**
   * Guarda una versión nueva. Si ya hay una que empieza el mismo día y aún no
   * rige, la reemplaza; las que ya rigieron no se tocan (historia de costos).
   */
  async guardarVersion(
    vendibleId: string,
    datos: NuevaVersion,
    autor = 'Administrador',
  ): Promise<RecetaEstandar> {
    const limpias = datos.lineas.map((l) => ({
      ...clonar(l),
      id: l.id || nuevoId('lr'),
      cantidad: Number(l.cantidad),
    }))
    validarVersion(vendibleId, { ...datos, lineas: limpias })
    let receta = recetaDe(vendibleId)
    if (!receta) {
      receta = { id: nuevoId('re'), vendibleId, versiones: [] }
      db.recetasEstandar.push(receta)
    }
    const mismoDia = receta.versiones.find(
      (v) => v.vigenteDesde === datos.vigenteDesde && v.vigenteDesde > hoy(),
    )
    const costos = Object.fromEntries(
      limpias.map((l) => [l.insumoId, db.insumos.find((i) => i.id === l.insumoId)!.costoUnitario]),
    )
    const version: VersionReceta = {
      id: mismoDia?.id ?? nuevoId('vr'),
      numero: mismoDia?.numero ?? Math.max(0, ...receta.versiones.map((v) => v.numero)) + 1,
      estado: valorConfig<boolean>('recetas.aprobacion') ? 'borrador' : 'aprobada',
      ficha: limpiarFicha(datos.ficha),
      vigenteDesde: datos.vigenteDesde,
      lineas: limpias,
      nota: datos.nota?.trim() || undefined,
      autor,
      creada: new Date().toISOString(),
      costosAlGuardar: costos,
    }
    receta.versiones = [...receta.versiones.filter((v) => v.id !== version.id), version]
    registrar({
      autor,
      modulo: 'Recetas',
      accion: 'Versión guardada',
      detalle: `${nombreVendible(vendibleId)} · versión ${version.numero} desde ${version.vigenteDesde}${
        version.nota ? ` · ${version.nota}` : ''
      }`,
    })
    persistir()
    return latencia(clonar(receta))
  },

  /** Pone en vigencia un borrador. Exige porciones, pasos y costo en cada ingrediente. */
  async aprobarVersion(vendibleId: string, versionId: string, usuarioId: string) {
    const receta = recetaDe(vendibleId)
    const version = receta?.versiones.find((v) => v.id === versionId)
    if (!receta || !version) throw { mensaje: 'Versión no encontrada.' }
    if (!tienePermiso(usuarioId, 'recetas.aprobar'))
      throw { mensaje: 'No tienes permiso para aprobar recetas.' }
    if (version.estado !== 'borrador') throw { mensaje: 'Esta versión ya está aprobada.' }
    const faltan = faltantesAprobacion(version)
    if (faltan.length) throw { mensaje: `No se puede aprobar. ${faltan.join(' ')}` }
    version.estado = 'aprobada'
    version.aprobadaPor = db.usuarios.find((u) => u.id === usuarioId)?.nombre ?? usuarioId
    version.aprobada = new Date().toISOString()
    registrar({
      usuarioId,
      modulo: 'Recetas',
      accion: 'Versión aprobada',
      detalle: `${nombreVendible(vendibleId)} · versión ${version.numero}`,
    })
    persistir()
    return latencia(clonar(receta))
  },

  /**
   * Marca un vendible como reventa de un insumo que se compra: crea sola la
   * receta 1:1 desde hoy. Sin insumo, deja de ser reventa y conserva su historia.
   */
  async fijarReventa(vendibleId: string, insumoId?: string, autor = 'Sistema') {
    const v = vendibles().find((x) => x.id === vendibleId)
    if (!v || (v.tipo !== 'producto' && v.tipo !== 'presentacion'))
      throw { mensaje: 'Solo un producto o una presentación se revende.' }
    let receta = recetaDe(vendibleId)
    if (!insumoId) {
      if (receta) delete receta.reventaInsumoId
      persistir()
      return latencia(receta ? clonar(receta) : null)
    }
    const insumo = db.insumos.find((i) => i.id === insumoId)
    if (!insumo) throw errorCampo('reventaInsumoId', 'Elige el insumo que se revende.')
    if (insumo.abastecimiento === 'transformacion')
      throw errorCampo(
        'reventaInsumoId',
        'Se revende lo que se compra: este insumo solo se produce.',
      )
    if (!receta) {
      receta = { id: nuevoId('re'), vendibleId, versiones: [] }
      db.recetasEstandar.push(receta)
    }
    delete receta.reventaInsumoId
    const ultima = receta.versiones.reduce((m, x) => (x.vigenteDesde > m ? x.vigenteDesde : m), '')
    await recetasService.guardarVersion(
      vendibleId,
      {
        vigenteDesde: ultima > hoy() ? ultima : hoy(),
        nota: 'Reventa 1:1',
        lineas: [{ id: '', tipo: 'ingrediente', insumoId, cantidad: 1, unidad: insumo.unidad }],
      },
      autor,
    )
    receta = recetaDe(vendibleId)!
    // La reventa no pasa por aprobación: no hay nada que estandarizar.
    for (const x of receta.versiones) if (x.nota === 'Reventa 1:1') x.estado = 'aprobada'
    receta.reventaInsumoId = insumoId
    persistir()
    return latencia(clonar(receta))
  },

  /** Insumos que suma o quita cada modificador y notas rápidas del producto. */
  async guardarModificadores(
    productoId: string,
    efectos: Record<string, EfectoModificador[]>,
    notasRapidas: string[],
  ) {
    const producto = db.productos.find((p) => p.id === productoId)
    if (!producto) throw { mensaje: 'Producto no encontrado.' }
    const todos = producto.gruposModificadores.flatMap((g) => g.modificadores)
    for (const [modId, lista] of Object.entries(efectos)) {
      const m = todos.find((x) => x.id === modId)
      if (!m) throw { mensaje: 'Un modificador ya no existe.' }
      for (const e of lista) {
        const insumo = db.insumos.find((i) => i.id === e.insumoId)
        if (!insumo) throw errorCampo('efectos', `Elige el insumo en «${m.nombre}».`)
        if (!(Number(e.cantidad) > 0))
          throw errorCampo('efectos', `Indica la cantidad de ${insumo.nombre} en «${m.nombre}».`)
        if (convertir(1, e.unidad, insumo.unidad) === null)
          throw errorCampo('efectos', `${insumo.nombre} no se mide en ${e.unidad}.`)
      }
    }
    for (const m of todos) {
      const lista = efectos[m.id]
      if (lista === undefined) continue
      if (lista.length) m.efectos = lista.map((e) => ({ ...e, cantidad: Number(e.cantidad) }))
      else delete m.efectos
    }
    const notas = [...new Set(notasRapidas.map((n) => n.trim()).filter(Boolean))]
    if (notas.length) producto.notasRapidas = notas
    else delete producto.notasRapidas
    persistir()
    return latencia(clonar(producto))
  },

  /** Solo se elimina una versión que todavía no rige. */
  async eliminarVersion(vendibleId: string, versionId: string): Promise<void> {
    const receta = recetaDe(vendibleId)
    const version = receta?.versiones.find((v) => v.id === versionId)
    if (!receta || !version) throw { mensaje: 'Versión no encontrada.' }
    if (version.vigenteDesde <= hoy() && version.estado !== 'borrador')
      throw { mensaje: 'Esta versión ya rigió: se conserva para la historia de costos.' }
    receta.versiones = receta.versiones.filter((v) => v.id !== versionId)
    if (!receta.versiones.length)
      db.recetasEstandar = db.recetasEstandar.filter((r) => r.id !== receta.id)
    persistir()
    await latencia(null)
  },

  async fijarObjetivo(vendibleId: string, porcentaje?: number): Promise<void> {
    if (porcentaje !== undefined && !(porcentaje > 0 && porcentaje < 100))
      throw errorCampo('foodCostObjetivo', 'El objetivo debe estar entre 0 % y 100 %.')
    const receta = recetaDe(vendibleId)
    if (!receta) throw { mensaje: 'Primero guarda la receta.' }
    if (porcentaje === undefined) delete receta.foodCostObjetivo
    else receta.foodCostObjetivo = porcentaje
    persistir()
    await latencia(null)
  },

  /**
   * Copia la versión vigente de otra presentación escalando cantidades
   * (Personal → Fuente × 1,8). Queda como versión nueva desde hoy.
   */
  async copiarDe(origenId: string, destinoId: string, factor: number, autor?: string) {
    if (origenId === destinoId) throw { mensaje: 'Elige otra presentación como origen.' }
    if (!(factor > 0)) throw errorCampo('factor', 'El factor debe ser mayor a 0.')
    const vigente = versionVigente(recetaDe(origenId))
    if (!vigente) throw { mensaje: 'La presentación de origen no tiene receta vigente.' }
    const ultima = recetaDe(destinoId)?.versiones.reduce(
      (m, v) => (v.vigenteDesde > m ? v.vigenteDesde : m),
      '',
    )
    return recetasService.guardarVersion(
      destinoId,
      {
        vigenteDesde: ultima && ultima > hoy() ? ultima : hoy(),
        nota: `Copiada de otra presentación × ${factor}`,
        lineas: vigente.lineas.map((l) => ({
          ...l,
          id: '',
          cantidad: l.tipo === 'ingrediente' ? r4(l.cantidad * factor) : l.cantidad,
        })),
      },
      autor,
    )
  },
}
