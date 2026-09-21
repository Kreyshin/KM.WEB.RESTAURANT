import type {
  ListaPrecios,
  NuevaListaPrecios,
  PrecioVigente,
  ProductoVendible,
  RepartoCombo,
} from '@/types'
import { registrar } from './auditoria.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'

/**
 * Productos vendibles y listas de precios (D-010). La vertical registra sus
 * listas; con «precios» sincronizado se envían al ERP y se guarda el vínculo.
 */

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
/** Precio derivado: se redondea a 10 céntimos, como se publica en carta. */
const redondearCarta = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10

export const etiquetaTipoVendible: Record<ProductoVendible['tipo'], string> = {
  producto: 'Producto',
  presentacion: 'Presentación',
  adicional: 'Adicional',
  combo: 'Combo',
}

/** Todo lo que se puede cobrar, con su código y el precio de la carta. */
export function vendibles(): ProductoVendible[] {
  const lista: ProductoVendible[] = []
  for (const p of db.productos) {
    const codigo = p.codigo ?? `PR-${p.id.toUpperCase()}`
    const presentaciones = p.variantes.filter((v) => v.activa)
    if (presentaciones.length) {
      for (const v of p.variantes)
        lista.push({
          id: `v:${v.id}`,
          codigo: v.codigo ?? `${codigo}-${v.id.toUpperCase()}`,
          nombre: `${p.nombre} · ${v.nombre}`,
          tipo: 'presentacion',
          productoId: p.id,
          categoriaId: p.categoriaId,
          precioReferencia: v.precio,
          activo: p.disponible && v.activa,
        })
    } else {
      lista.push({
        id: `p:${p.id}`,
        codigo,
        nombre: p.nombre,
        tipo: 'producto',
        productoId: p.id,
        categoriaId: p.categoriaId,
        precioReferencia: p.precio,
        activo: p.disponible,
      })
    }
    for (const g of p.gruposModificadores)
      for (const m of g.modificadores)
        if (m.recargo > 0)
          lista.push({
            id: `m:${m.id}`,
            codigo: m.codigo ?? `AD-${m.id.toUpperCase()}`,
            nombre: `${m.nombre} (adicional de ${p.nombre})`,
            tipo: 'adicional',
            productoId: p.id,
            categoriaId: p.categoriaId,
            precioReferencia: m.recargo,
            activo: m.activo,
          })
  }
  for (const c of db.combos)
    lista.push({
      id: `c:${c.id}`,
      codigo: c.codigo ?? `CB-${c.id.toUpperCase()}`,
      nombre: c.nombre,
      tipo: 'combo',
      precioReferencia: c.precio,
      activo: c.activo,
    })
  return lista
}

const enVigencia = (fecha: string, desde?: string, hasta?: string) =>
  (!desde || desde <= fecha) && (!hasta || fecha <= hasta)

const cruzan = (a: ListaPrecios, b: Pick<ListaPrecios, 'desde' | 'hasta'>) =>
  (a.desde ?? '') <= (b.hasta ?? '9999') && (b.desde ?? '') <= (a.hasta ?? '9999')

/** Precio de lista de un vendible en una lista, siguiendo derivaciones. */
function precioEnLista(
  lista: ListaPrecios,
  vendibleId: string,
  visitadas = new Set<string>(),
): { precio: number; origen: PrecioVigente['origen'] } | null {
  if (visitadas.has(lista.id)) return null
  visitadas.add(lista.id)
  const propio = lista.precios.find((p) => p.vendibleId === vendibleId)?.precio
  if (propio !== undefined) return { precio: propio, origen: 'lista' }
  if (lista.derivadaDe) {
    const madre = db.listasPrecios.find((l) => l.id === lista.derivadaDe)
    const deMadre = madre ? precioEnLista(madre, vendibleId, visitadas) : null
    const referencia = vendibles().find((v) => v.id === vendibleId)?.precioReferencia
    const baseMadre = deMadre?.precio ?? referencia
    if (baseMadre === undefined) return null
    return {
      precio: redondearCarta(baseMadre * (1 + (lista.ajustePorcentaje ?? 0) / 100)),
      origen: 'derivada',
    }
  }
  return null
}

/** Precio de lista de un vendible en una lista guardada, o el de la carta si no lo tiene. */
export function precioDeLista(listaId: string, vendibleId: string) {
  const lista = db.listasPrecios.find((l) => l.id === listaId)
  const r = lista ? precioEnLista(lista, vendibleId) : null
  return (
    r ?? {
      precio: vendibles().find((v) => v.id === vendibleId)?.precioReferencia ?? 0,
      origen: 'referencia' as const,
    }
  )
}

/** Lista que manda para un local y canal en una fecha: temporada vigente o base. */
export function listaAplicable(localId: string, canalId: string, fecha: string) {
  const delCanal = db.listasPrecios.filter(
    (l) => l.activa && l.localId === localId && l.canalIds.includes(canalId),
  )
  return {
    temporada: delCanal.find((l) => l.tipo === 'temporada' && enVigencia(fecha, l.desde, l.hasta)),
    base: delCanal.find((l) => l.tipo === 'base'),
  }
}

/** Precio que se cobra hoy (o en `fecha`) por un vendible en un local y canal. */
export function precioVigente(
  vendibleId: string,
  localId: string,
  canalId: string,
  fecha: string,
): PrecioVigente {
  const { temporada, base } = listaAplicable(localId, canalId, fecha)
  let lista: ListaPrecios | undefined
  let resultado: { precio: number; origen: PrecioVigente['origen'] } | null = null
  if (temporada) {
    resultado = precioEnLista(temporada, vendibleId)
    if (resultado) lista = temporada
  }
  if (!resultado && base) {
    resultado = precioEnLista(base, vendibleId)
    if (resultado) {
      lista = base
      if (temporada) resultado.origen = 'base'
    }
  }
  if (!resultado) {
    resultado = {
      precio: vendibles().find((v) => v.id === vendibleId)?.precioReferencia ?? 0,
      origen: 'referencia',
    }
    lista = temporada ?? base
  }
  const linea = lista?.precios.find((p) => p.vendibleId === vendibleId)
  const descuentoPorcentaje =
    linea?.descuento && enVigencia(fecha, linea.descuento.desde, linea.descuento.hasta)
      ? linea.descuento.porcentaje
      : 0
  const precio = redondear(resultado.precio * (1 - descuentoPorcentaje / 100))
  const igvIncluido = lista?.igvIncluido ?? db.impuestos.preciosIncluyenIgv
  const tasaIgv = db.impuestos.igvPorcentaje
  const valorVenta = redondear(igvIncluido ? precio / (1 + tasaIgv / 100) : precio)
  return {
    vendibleId,
    listaId: lista?.id,
    listaNombre: lista?.nombre,
    origen: resultado.origen,
    precioLista: resultado.precio,
    descuentoPorcentaje,
    precio,
    igvIncluido,
    tasaIgv,
    valorVenta,
    igv: redondear(igvIncluido ? precio - valorVenta : precio * (tasaIgv / 100)),
  }
}

/**
 * Reparto analítico del precio del combo entre sus componentes, en proporción
 * a su precio vigente. El comprobante lleva una sola línea; esto es para costos
 * y análisis de ventas por producto.
 */
export function repartoCombo(
  comboId: string,
  localId: string,
  canalId: string,
  fecha: string,
): RepartoCombo[] {
  const combo = db.combos.find((c) => c.id === comboId)
  if (!combo) return []
  const total = precioVigente(`c:${comboId}`, localId, canalId, fecha).precio
  const todos = vendibles()
  const partes = combo.grupos.flatMap((g) => {
    const productoId = g.opciones[0]
    const v = todos.find(
      (x) => x.productoId === productoId && (x.tipo === 'producto' || x.tipo === 'presentacion'),
    )
    return v
      ? [
          {
            vendibleId: v.id,
            nombre: v.nombre,
            precioVigente: precioVigente(v.id, localId, canalId, fecha).precio,
          },
        ]
      : []
  })
  const suma = partes.reduce((s, p) => s + p.precioVigente, 0)
  let asignado = 0
  return partes.map((p, i) => {
    const monto =
      i === partes.length - 1
        ? redondear(total - asignado)
        : redondear(suma ? (total * p.precioVigente) / suma : total / partes.length)
    asignado = redondear(asignado + monto)
    return { ...p, asignado: monto }
  })
}

function validar(datos: NuevaListaPrecios, id?: string) {
  if (!datos.nombre?.trim()) throw errorCampo('nombre', 'Ponle un nombre a la lista.', 'Requerido')
  if (!db.locales.some((l) => l.id === datos.localId))
    throw errorCampo('localId', 'Elige el local de la lista.', 'Requerido')
  if (!datos.canalIds.length) throw errorCampo('canalIds', 'Elige al menos un canal.', 'Requerido')
  const codigo = datos.codigo?.trim()
  if (!codigo) throw errorCampo('codigo', 'Indica el código de la lista.', 'Requerido')
  if (db.listasPrecios.some((l) => l.id !== id && l.codigo.toLowerCase() === codigo.toLowerCase()))
    throw errorCampo('codigo', 'Ya hay una lista con ese código.', 'Código duplicado')

  const nombreCanal = (c: string) => db.canales.find((x) => x.id === c)?.nombre ?? c
  const otras = db.listasPrecios.filter(
    (l) => l.id !== id && l.activa && l.localId === datos.localId && l.tipo === datos.tipo,
  )
  if (datos.tipo === 'base') {
    for (const o of otras) {
      const comun = o.canalIds.find((c) => datos.canalIds.includes(c))
      if (comun && datos.activa)
        throw errorCampo(
          'canalIds',
          `${nombreCanal(comun)} ya tiene la lista base «${o.nombre}» en este local.`,
          'Canal con otra lista base',
        )
    }
  } else {
    if (!datos.desde || !datos.hasta)
      throw errorCampo('vigencia', 'Una lista de temporada necesita inicio y fin.', 'Requerido')
    if (datos.desde > datos.hasta)
      throw errorCampo('vigencia', 'El inicio no puede ser posterior al fin.', 'Fechas invertidas')
    for (const o of otras) {
      const comun = o.canalIds.find((c) => datos.canalIds.includes(c))
      if (comun && datos.activa && cruzan(o, datos))
        throw errorCampo(
          'vigencia',
          `Se cruza con «${o.nombre}» en ${nombreCanal(comun)}. Las temporadas no se solapan.`,
          'Vigencia solapada',
        )
    }
  }

  if (datos.derivadaDe) {
    if (datos.derivadaDe === id)
      throw errorCampo('derivadaDe', 'Una lista no puede derivar de sí misma.')
    let actual = db.listasPrecios.find((l) => l.id === datos.derivadaDe)
    if (!actual) throw errorCampo('derivadaDe', 'La lista de origen ya no existe.')
    const vistas = new Set<string>()
    while (actual) {
      if (actual.id === id || vistas.has(actual.id))
        throw errorCampo('derivadaDe', 'Esa derivación forma un círculo entre listas.')
      vistas.add(actual.id)
      actual = actual.derivadaDe
        ? db.listasPrecios.find((l) => l.id === actual!.derivadaDe)
        : undefined
    }
    const aj = Number(datos.ajustePorcentaje ?? 0)
    if (!(aj >= -90 && aj <= 300))
      throw errorCampo('ajustePorcentaje', 'El ajuste debe estar entre -90 % y 300 %.')
  }

  const existentes = new Set(vendibles().map((v) => v.id))
  for (const p of datos.precios) {
    if (!existentes.has(p.vendibleId))
      throw errorCampo('precios', 'Hay un precio para un producto que ya no existe.')
    if (p.precio !== undefined && !(Number(p.precio) >= 0))
      throw errorCampo('precios', 'Los precios no pueden ser negativos.')
    const d = p.descuento
    if (d) {
      if (!(d.porcentaje > 0 && d.porcentaje <= 100))
        throw errorCampo('precios', 'El descuento debe ser mayor a 0 % y hasta 100 %.')
      if (!d.desde || !d.hasta || d.desde > d.hasta)
        throw errorCampo('precios', 'El descuento necesita una vigencia válida.')
    }
  }
  if (new Set(datos.precios.map((p) => p.vendibleId)).size !== datos.precios.length)
    throw errorCampo('precios', 'Un producto tiene dos precios en la lista.')
}

function normalizar(datos: NuevaListaPrecios): NuevaListaPrecios {
  const n = clonar(datos)
  n.nombre = n.nombre.trim()
  n.codigo = n.codigo.trim().toUpperCase()
  if (n.tipo === 'base') {
    delete n.desde
    delete n.hasta
  }
  if (!n.derivadaDe) delete n.ajustePorcentaje
  // Una línea sin precio ni descuento no aporta nada.
  n.precios = n.precios.filter((p) => p.precio !== undefined || p.descuento)
  return n
}

export const preciosService = {
  async vendibles(): Promise<ProductoVendible[]> {
    return latencia(vendibles())
  },

  async listas(): Promise<ListaPrecios[]> {
    return latencia(clonar(db.listasPrecios))
  },

  async crear(datos: NuevaListaPrecios): Promise<ListaPrecios> {
    const n = normalizar(datos)
    validar(n)
    const lista: ListaPrecios = { ...n, id: nuevoId('lp') }
    db.listasPrecios.push(lista)
    registrar({
      localId: lista.localId,
      modulo: 'Precios',
      accion: 'Lista creada',
      detalle: `${lista.nombre} (${lista.codigo})`,
    })
    persistir()
    return latencia(clonar(lista))
  },

  async actualizar(id: string, datos: NuevaListaPrecios): Promise<ListaPrecios> {
    const i = db.listasPrecios.findIndex((l) => l.id === id)
    if (i < 0) throw { mensaje: 'Lista de precios no encontrada.' }
    const n = normalizar(datos)
    validar(n, id)
    const antes = db.listasPrecios[i]!
    const cambiados = n.precios.filter(
      (p) =>
        JSON.stringify(p) !==
        JSON.stringify(antes.precios.find((x) => x.vendibleId === p.vendibleId)),
    ).length
    db.listasPrecios[i] = { ...n, id }
    registrar({
      localId: n.localId,
      modulo: 'Precios',
      accion: 'Lista actualizada',
      detalle: `${n.nombre}${cambiados ? ` · ${cambiados} precio(s) cambiado(s)` : ''}`,
    })
    persistir()
    return latencia(clonar(db.listasPrecios[i]!))
  },

  async eliminar(id: string): Promise<void> {
    const hijas = db.listasPrecios.filter((l) => l.derivadaDe === id)
    if (hijas.length)
      throw {
        mensaje: `No se puede eliminar: ${hijas.map((h) => `«${h.nombre}»`).join(', ')} deriva de esta lista.`,
      }
    const eliminada = db.listasPrecios.find((l) => l.id === id)
    db.listasPrecios = db.listasPrecios.filter((l) => l.id !== id)
    if (eliminada)
      registrar({
        localId: eliminada.localId,
        modulo: 'Precios',
        accion: 'Lista eliminada',
        detalle: `${eliminada.nombre} (${eliminada.codigo})`,
      })
    persistir()
    await latencia(null)
  },
}
