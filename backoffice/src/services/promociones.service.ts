import type {
  ApiError,
  Cobertura,
  CuentaPromociones,
  DiaSemana,
  LineaCuenta,
  MotivoDescarte,
  NuevaPromocion,
  Promocion,
  PromocionAplicada,
  ProductoVendible,
  ReglasPuntos,
  ResultadoPromociones,
  TipoBeneficio,
  TipoCondicionPromocion,
} from '@/types'
import { registrar } from './auditoria.service'
import { cobertura } from './delivery.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso, valorConfig } from './parametros.service'
import { precioVigente, vendibles } from './precios.service'

/**
 * Promociones y cupones que consume el POS (F6.2, D-011).
 *
 * La promoción tiene una forma sola: a quién alcanza, cuándo rige, cómo se
 * activa, qué exige y qué da. El beneficio es lista cerrada porque cada uno es
 * una línea distinta del comprobante. Y toda evaluación se explica: qué entró,
 * qué no y por qué, porque el cajero tiene al cliente delante.
 */

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3))

export const etiquetaBeneficio: Record<TipoBeneficio, string> = {
  porcentaje: 'Porcentaje de descuento',
  monto: 'Monto de descuento',
  precioFijo: 'Precio fijo',
  nxm: 'N × M (2×1, 3×2…)',
  productoGratis: 'Producto de regalo',
  envioGratis: 'Envío gratis',
}

export const etiquetaCondicion: Record<TipoCondicionPromocion, string> = {
  ninguna: 'Sin condición',
  montoMinimo: 'Monto mínimo de cuenta',
  unidades: 'Unidades de ciertos productos',
}

export const etiquetaMotivo: Record<MotivoDescarte, string> = {
  inactiva: 'Desactivada',
  fueraDeVigencia: 'Fuera de vigencia',
  otroDia: 'No rige este día',
  fueraDeFranja: 'Fuera de su horario',
  otroLocal: 'No alcanza a este local',
  otroCanal: 'No alcanza a este canal',
  sinCupon: 'Falta el cupón',
  cuponAgotado: 'Cupón agotado',
  condicionNoCumplida: 'No se cumple la condición',
  noCombinable: 'No se acumula con otra',
  sinEfecto: 'Sin efecto en esta cuenta',
}

/** Día de la semana en el formato de la vertical: 0 = lunes … 6 = domingo. */
export function diaSemana(fecha: string): DiaSemana {
  const js = new Date(`${fecha}T12:00:00`).getDay()
  return ((js + 6) % 7) as DiaSemana
}

// ── Evaluación ───────────────────────────────────────────────────────────────

interface LineaResuelta extends LineaCuenta {
  vendible?: ProductoVendible
  precio: number
  importe: number
}

function resolver(cuenta: CuentaPromociones): LineaResuelta[] {
  const catalogo = vendibles()
  return cuenta.lineas.map((l) => {
    const vendible = catalogo.find((v) => v.id === l.vendibleId)
    const precio =
      l.precioUnitario ??
      precioVigente(l.vendibleId, cuenta.localId, cuenta.canalId, cuenta.fecha).precio
    return { ...l, vendible, precio, importe: redondear(precio * l.cantidad) }
  })
}

/** Líneas que entran en la condición de la promoción. */
function deLaCondicion(promo: Promocion, lineas: LineaResuelta[]): LineaResuelta[] {
  const { vendibleIds = [], categoriaIds = [] } = promo.condicion
  if (!vendibleIds.length && !categoriaIds.length) return lineas
  return lineas.filter(
    (l) =>
      vendibleIds.includes(l.vendibleId) ||
      (l.vendible?.categoriaId ? categoriaIds.includes(l.vendible.categoriaId) : false),
  )
}

/** Unidades del conjunto, ordenadas de la más barata a la más cara. */
function unidades(lineas: LineaResuelta[]): number[] {
  return lineas
    .flatMap((l) => Array.from({ length: Math.max(0, Math.floor(l.cantidad)) }, () => l.precio))
    .sort((a, b) => a - b)
}

interface Efecto {
  descuento: number
  descuentoEnvio: number
  regalo?: PromocionAplicada['regalo']
  explicacion: string
}

function efecto(
  promo: Promocion,
  lineas: LineaResuelta[],
  subtotal: number,
  costoEnvio: number,
  cuenta: CuentaPromociones,
): Efecto {
  const b = promo.beneficio
  const delConjunto = deLaCondicion(promo, lineas)
  const base =
    b.alcance === 'cuenta' ? subtotal : redondear(delConjunto.reduce((s, l) => s + l.importe, 0))

  switch (b.tipo) {
    case 'porcentaje': {
      const descuento = redondear((base * (b.valor ?? 0)) / 100)
      return {
        descuento,
        descuentoEnvio: 0,
        explicacion: `${b.valor} % de S/ ${base.toFixed(2)} (${
          b.alcance === 'cuenta' ? 'toda la cuenta' : 'los productos de la promoción'
        }).`,
      }
    }
    case 'monto': {
      const descuento = redondear(Math.min(b.valor ?? 0, base))
      return {
        descuento,
        descuentoEnvio: 0,
        explicacion: `S/ ${descuento.toFixed(2)} de descuento directo.`,
      }
    }
    case 'precioFijo': {
      const fijo = b.valor ?? 0
      let descuento = 0
      let piezas = 0
      for (const l of delConjunto) {
        if (l.precio > fijo) {
          descuento += (l.precio - fijo) * l.cantidad
          piezas += l.cantidad
        }
      }
      return {
        descuento: redondear(descuento),
        descuentoEnvio: 0,
        explicacion: `${piezas} unidad(es) a S/ ${fijo.toFixed(2)} en vez de su precio de lista.`,
      }
    }
    case 'nxm': {
      const llevan = b.llevan ?? 0
      const pagan = b.pagan ?? 0
      const precios = unidades(delConjunto)
      const grupos = llevan > 0 ? Math.floor(precios.length / llevan) : 0
      const gratis = grupos * Math.max(0, llevan - pagan)
      // Se regalan las unidades más baratas del conjunto.
      const descuento = redondear(precios.slice(0, gratis).reduce((s, p) => s + p, 0))
      return {
        descuento,
        descuentoEnvio: 0,
        explicacion: gratis
          ? `${precios.length} unidad(es) en el conjunto: ${gratis} no se cobra(n), la(s) más barata(s).`
          : `Hacen falta ${llevan} unidades y hay ${precios.length}.`,
      }
    }
    case 'productoGratis': {
      const vendible = vendibles().find((v) => v.id === b.vendibleId)
      const cantidad = b.cantidad ?? 1
      return {
        descuento: 0,
        descuentoEnvio: 0,
        regalo: vendible
          ? { vendibleId: vendible.id, nombre: vendible.nombre, cantidad }
          : undefined,
        explicacion: vendible
          ? `${cantidad} × ${vendible.nombre} de regalo: el POS lo agrega a la cuenta sin cobrarlo.`
          : 'El producto de regalo ya no existe en la carta.',
      }
    }
    case 'envioGratis': {
      const esDelivery = db.canales.find((c) => c.id === cuenta.canalId)?.tipo === 'delivery'
      if (!esDelivery)
        return {
          descuento: 0,
          descuentoEnvio: 0,
          explicacion: 'Este canal no cobra envío propio: no hay nada que perdonar.',
        }
      return {
        descuento: 0,
        descuentoEnvio: redondear(costoEnvio),
        explicacion: costoEnvio
          ? `Se perdona el envío: S/ ${costoEnvio.toFixed(2)}.`
          : 'El envío ya salía gratis por la zona.',
      }
    }
  }
}

/** Recorta el descuento con el tope de la promoción, si lo tiene. */
function aplicarTope(promo: Promocion, descuento: number, subtotal: number) {
  const topes = [
    promo.topeMonto > 0 ? promo.topeMonto : Infinity,
    promo.topePorcentaje > 0 ? (subtotal * promo.topePorcentaje) / 100 : Infinity,
  ]
  const tope = Math.min(...topes)
  if (!Number.isFinite(tope) || descuento <= tope) return { descuento, topado: false, tope }
  return { descuento: redondear(tope), topado: true, tope: redondear(tope) }
}

function descartada(
  promo: Promocion,
  motivo: MotivoDescarte,
  explicacion: string,
): PromocionAplicada {
  return {
    promocionId: promo.id,
    codigo: promo.codigo,
    nombre: promo.nombre,
    aplica: false,
    descuento: 0,
    descuentoEnvio: 0,
    explicacion,
    motivo,
  }
}

/** Por qué una promoción no entra en esta cuenta, antes de mirar el beneficio. */
function descarte(promo: Promocion, cuenta: CuentaPromociones): PromocionAplicada | null {
  if (!promo.activa) return descartada(promo, 'inactiva', 'La promoción está desactivada.')
  if (promo.desde && cuenta.fecha < promo.desde)
    return descartada(promo, 'fueraDeVigencia', `Empieza el ${promo.desde}.`)
  if (promo.hasta && cuenta.fecha > promo.hasta)
    return descartada(promo, 'fueraDeVigencia', `Terminó el ${promo.hasta}.`)
  if (promo.localIds.length && !promo.localIds.includes(cuenta.localId))
    return descartada(promo, 'otroLocal', 'No alcanza a este local.')
  if (promo.canalIds.length && !promo.canalIds.includes(cuenta.canalId))
    return descartada(promo, 'otroCanal', 'No alcanza a este canal.')
  if (promo.dias.length && !promo.dias.includes(diaSemana(cuenta.fecha)))
    return descartada(promo, 'otroDia', 'No rige este día de la semana.')
  if (promo.horaDesde && promo.horaHasta) {
    const ahora = minutos(cuenta.hora)
    const desde = minutos(promo.horaDesde)
    const hasta = minutos(promo.horaHasta)
    const dentro =
      desde <= hasta ? ahora >= desde && ahora <= hasta : ahora >= desde || ahora <= hasta
    if (!dentro)
      return descartada(promo, 'fueraDeFranja', `Solo de ${promo.horaDesde} a ${promo.horaHasta}.`)
  }
  if (promo.activacion === 'cupon') {
    const tecleado = cuenta.cupon?.trim().toUpperCase()
    if (!promo.cupon || !tecleado || tecleado !== promo.cupon.codigo.toUpperCase())
      return descartada(promo, 'sinCupon', 'Necesita que se teclee su cupón.')
    if (promo.cupon.usosMaximos > 0 && promo.cupon.usados >= promo.cupon.usosMaximos)
      return descartada(
        promo,
        'cuponAgotado',
        `Se usó ${promo.cupon.usados} de ${promo.cupon.usosMaximos} veces.`,
      )
  }
  return null
}

/** ¿Cumple la cuenta lo que la promoción exige? */
function cumpleCondicion(promo: Promocion, lineas: LineaResuelta[], subtotal: number) {
  const c = promo.condicion
  if (c.tipo === 'ninguna') return { cumple: true, explicacion: 'Sin condición.' }
  if (c.tipo === 'montoMinimo') {
    const minimo = c.monto ?? 0
    return {
      cumple: subtotal >= minimo,
      explicacion:
        subtotal >= minimo
          ? `La cuenta llega a S/ ${subtotal.toFixed(2)} y pide S/ ${minimo.toFixed(2)}.`
          : `Pide S/ ${minimo.toFixed(2)} y la cuenta va en S/ ${subtotal.toFixed(2)}.`,
    }
  }
  const pedidas = c.cantidad ?? 0
  const hay = deLaCondicion(promo, lineas).reduce((s, l) => s + l.cantidad, 0)
  return {
    cumple: hay >= pedidas,
    explicacion:
      hay >= pedidas
        ? `Hay ${hay} unidad(es) del conjunto y pide ${pedidas}.`
        : `Pide ${pedidas} unidad(es) del conjunto y hay ${hay}.`,
  }
}

/**
 * Qué se aplica a esta cuenta. Devuelve siempre las dos listas —lo que entró y
 * lo que no— porque en caja la pregunta es «¿por qué no entró la del martes?».
 */
export function evaluar(cuenta: CuentaPromociones): ResultadoPromociones {
  const lineas = resolver(cuenta)
  const subtotal = redondear(lineas.reduce((s, l) => s + l.importe, 0))

  const canal = db.canales.find((c) => c.id === cuenta.canalId)
  let cobertura_: Cobertura | undefined
  if (canal?.tipo === 'delivery') {
    cobertura_ = cobertura(cuenta.localId, cuenta.distrito ?? '', subtotal)
  }
  const costoEnvio = cobertura_?.costoEnvio ?? 0

  const candidatas: { promo: Promocion; resultado: PromocionAplicada }[] = []
  const descartadas: PromocionAplicada[] = []

  for (const promo of db.promociones) {
    const fuera = descarte(promo, cuenta)
    if (fuera) {
      descartadas.push(fuera)
      continue
    }
    const condicion = cumpleCondicion(promo, lineas, subtotal)
    if (!condicion.cumple) {
      descartadas.push(descartada(promo, 'condicionNoCumplida', condicion.explicacion))
      continue
    }
    const e = efecto(promo, lineas, subtotal, costoEnvio, cuenta)
    if (!e.descuento && !e.descuentoEnvio && !e.regalo) {
      descartadas.push(descartada(promo, 'sinEfecto', e.explicacion))
      continue
    }
    const tope = aplicarTope(promo, e.descuento, subtotal)
    candidatas.push({
      promo,
      resultado: {
        promocionId: promo.id,
        codigo: promo.codigo,
        nombre: promo.nombre,
        aplica: true,
        descuento: tope.descuento,
        descuentoEnvio: e.descuentoEnvio,
        regalo: e.regalo,
        explicacion: tope.topado
          ? `${e.explicacion} El tope la recorta a S/ ${tope.descuento.toFixed(2)}.`
          : `${condicion.explicacion} ${e.explicacion}`,
        descuentoSinTope: tope.topado ? redondear(e.descuento) : undefined,
      },
    })
  }

  // Quién manda: mayor prioridad y, a igual prioridad, la que más beneficia al
  // cliente. Solo se suman las combinables, y solo si está permitido acumular.
  const acumular = valorConfig<boolean>('promociones.acumular')
  candidatas.sort(
    (a, b) =>
      b.promo.prioridad - a.promo.prioridad ||
      b.resultado.descuento +
        b.resultado.descuentoEnvio -
        (a.resultado.descuento + a.resultado.descuentoEnvio),
  )

  const aplicadas: PromocionAplicada[] = []
  let todasCombinables = true
  for (const c of candidatas) {
    const puede = !aplicadas.length || (acumular && todasCombinables && c.promo.combinable)
    if (puede) {
      aplicadas.push(c.resultado)
      todasCombinables = todasCombinables && c.promo.combinable
    } else
      descartadas.push(
        descartada(
          c.promo,
          'noCombinable',
          acumular
            ? `Ya entró «${aplicadas[0].nombre}» y esta no es combinable.`
            : `Solo entra una promoción por cuenta y ganó «${aplicadas[0].nombre}», de mayor prioridad.`,
        ),
      )
  }

  let descuento = redondear(aplicadas.reduce((s, a) => s + a.descuento, 0))
  const descuentoEnvio = redondear(aplicadas.reduce((s, a) => s + a.descuentoEnvio, 0))

  // Freno del local: lo que todas juntas pueden rebajar de la cuenta.
  const topeCuenta = valorConfig<number>('promociones.topeCuentaPorcentaje', cuenta.localId)
  if (topeCuenta > 0) {
    const maximo = redondear((subtotal * topeCuenta) / 100)
    if (descuento > maximo) {
      let sobra = redondear(descuento - maximo)
      // Se recorta desde la de menor prioridad: la principal se respeta.
      for (const a of [...aplicadas].reverse()) {
        if (sobra <= 0) break
        const quita = Math.min(a.descuento, sobra)
        a.descuentoSinTope ??= a.descuento
        a.descuento = redondear(a.descuento - quita)
        a.explicacion += ` El tope del local (${topeCuenta} % de la cuenta) le quita S/ ${quita.toFixed(2)}.`
        sobra = redondear(sobra - quita)
      }
      descuento = maximo
    }
  }

  return {
    subtotal,
    costoEnvio,
    descuento,
    descuentoEnvio,
    total: redondear(subtotal + costoEnvio - descuento - descuentoEnvio),
    aplicadas,
    descartadas,
    cobertura: cobertura_,
  }
}

// ── Mantenimiento ────────────────────────────────────────────────────────────

function exigirPermiso(usuarioId?: string) {
  if (!tienePermiso(usuarioId, 'promociones.editar'))
    throw { mensaje: 'No tienes permiso para editar promociones.' } satisfies ApiError
}

function validar(datos: NuevaPromocion, id?: string) {
  if (!datos.nombre?.trim()) throw errorCampo('nombre', 'Ponle un nombre.', 'Requerido')
  const codigo = datos.codigo?.trim()
  if (!codigo) throw errorCampo('codigo', 'Indica el código de la promoción.', 'Requerido')
  if (db.promociones.some((p) => p.id !== id && p.codigo.toLowerCase() === codigo.toLowerCase()))
    throw errorCampo('codigo', 'Ya hay una promoción con ese código.', 'Código duplicado')

  for (const [campo, valor] of [
    ['desde', datos.desde],
    ['hasta', datos.hasta],
  ] as const)
    if (valor && !FECHA.test(valor))
      throw errorCampo(campo, 'La fecha no tiene el formato correcto.')
  if (datos.desde && datos.hasta && datos.desde > datos.hasta)
    throw errorCampo('hasta', 'La vigencia termina antes de empezar.', 'Revisa las fechas')

  const horas = [datos.horaDesde, datos.horaHasta].filter(Boolean) as string[]
  if (horas.length === 1)
    throw errorCampo(
      'horaHasta',
      'Indica las dos horas de la franja, o ninguna.',
      'Franja a medias',
    )
  for (const h of horas) if (!HORA.test(h)) throw errorCampo('horaDesde', 'La hora debe ser HH:mm.')

  if (datos.activacion === 'cupon') {
    const cupon = datos.cupon
    if (!cupon?.codigo?.trim())
      throw errorCampo('cupon', 'Indica el código del cupón.', 'Requerido')
    if (
      db.promociones.some(
        (p) =>
          p.id !== id &&
          p.cupon &&
          p.cupon.codigo.trim().toUpperCase() === cupon.codigo.trim().toUpperCase(),
      )
    )
      throw errorCampo('cupon', 'Otra promoción ya usa ese cupón.', 'Cupón duplicado')
    if (cupon.usosMaximos < 0 || cupon.usosPorCliente < 0)
      throw errorCampo('cupon', 'Los usos no pueden ser negativos.')
  }

  const c = datos.condicion
  if (c.tipo === 'montoMinimo' && !(c.monto && c.monto > 0))
    throw errorCampo('condicion', 'Indica el monto mínimo de la cuenta.', 'Requerido')
  if (c.tipo === 'unidades') {
    if (!(c.cantidad && c.cantidad > 0))
      throw errorCampo('condicion', 'Indica cuántas unidades se piden.', 'Requerido')
    if (!c.vendibleIds?.length && !c.categoriaIds?.length)
      throw errorCampo(
        'condicion',
        'Elige los productos o las categorías que cuentan.',
        'Requerido',
      )
  }

  const b = datos.beneficio
  if (b.tipo === 'porcentaje' && !(b.valor && b.valor > 0 && b.valor <= 100))
    throw errorCampo('beneficio', 'El porcentaje debe estar entre 0 y 100.')
  if ((b.tipo === 'monto' || b.tipo === 'precioFijo') && !(b.valor !== undefined && b.valor >= 0))
    throw errorCampo('beneficio', 'Indica el monto.', 'Requerido')
  if (b.tipo === 'nxm') {
    if (!(b.llevan && b.pagan !== undefined && b.llevan > b.pagan && b.pagan >= 0))
      throw errorCampo('beneficio', 'En un N×M se lleva más de lo que se paga.', 'Revisa N y M')
    if (datos.condicion.tipo !== 'unidades')
      throw errorCampo(
        'beneficio',
        'Un N×M necesita saber sobre qué productos cuenta: usa la condición por unidades.',
        'Falta el conjunto',
      )
  }
  if (b.tipo === 'productoGratis') {
    if (!b.vendibleId) throw errorCampo('beneficio', 'Elige el producto de regalo.', 'Requerido')
    if (!vendibles().some((v) => v.id === b.vendibleId))
      throw errorCampo('beneficio', 'Ese producto ya no está en la carta.')
  }
  if (b.tipo === 'envioGratis') {
    const canales = datos.canalIds.length
      ? db.canales.filter((x) => datos.canalIds.includes(x.id))
      : db.canales
    if (!canales.some((x) => x.tipo === 'delivery'))
      throw errorCampo(
        'canalIds',
        'El envío gratis solo tiene sentido en un canal de reparto propio.',
        'Canal equivocado',
      )
  }

  if (datos.topeMonto < 0 || datos.topePorcentaje < 0 || datos.topePorcentaje > 100)
    throw errorCampo('topeMonto', 'Los topes deben ser positivos y el % no pasa de 100.')
}

function limpiar(datos: NuevaPromocion): NuevaPromocion {
  return {
    ...datos,
    codigo: datos.codigo.trim().toUpperCase(),
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion?.trim() || undefined,
    cupon:
      datos.activacion === 'cupon' && datos.cupon
        ? { ...datos.cupon, codigo: datos.cupon.codigo.trim().toUpperCase() }
        : undefined,
  }
}

/** Resumen legible de la regla, para la tabla y la bitácora. */
export function resumen(promo: Promocion): string {
  const b = promo.beneficio
  const que =
    b.tipo === 'porcentaje'
      ? `${b.valor} % de descuento`
      : b.tipo === 'monto'
        ? `S/ ${b.valor?.toFixed(2)} de descuento`
        : b.tipo === 'precioFijo'
          ? `precio fijo de S/ ${b.valor?.toFixed(2)}`
          : b.tipo === 'nxm'
            ? `${b.llevan}×${b.pagan}`
            : b.tipo === 'envioGratis'
              ? 'envío gratis'
              : `${b.cantidad ?? 1} × ${
                  vendibles().find((v) => v.id === b.vendibleId)?.nombre ?? 'producto'
                } de regalo`
  const cuando =
    promo.condicion.tipo === 'montoMinimo'
      ? ` desde S/ ${promo.condicion.monto?.toFixed(2)}`
      : promo.condicion.tipo === 'unidades'
        ? ` con ${promo.condicion.cantidad} unidad(es)`
        : ''
  const como = promo.activacion === 'cupon' ? ` · cupón ${promo.cupon?.codigo}` : ''
  return `${que}${cuando}${como}`
}

export const promocionesService = {
  async listar(filtro: { localId?: string; canalId?: string; activa?: boolean } = {}) {
    return latencia(
      clonar(
        db.promociones
          .filter(
            (p) =>
              (!filtro.localId || !p.localIds.length || p.localIds.includes(filtro.localId)) &&
              (!filtro.canalId || !p.canalIds.length || p.canalIds.includes(filtro.canalId)) &&
              (filtro.activa === undefined || p.activa === filtro.activa),
          )
          .sort((a, b) => b.prioridad - a.prioridad || a.nombre.localeCompare(b.nombre)),
      ),
    )
  },

  async crear(datos: NuevaPromocion, usuarioId?: string): Promise<Promocion> {
    exigirPermiso(usuarioId)
    const n = limpiar(clonar(datos))
    validar(n)
    const promo: Promocion = { ...n, id: nuevoId('pm') }
    db.promociones.push(promo)
    registrar({
      usuarioId,
      modulo: 'Promociones',
      accion: 'Promoción creada',
      detalle: `${promo.codigo} · ${promo.nombre} · ${resumen(promo)}`,
    })
    persistir()
    return latencia(clonar(promo))
  },

  async actualizar(id: string, datos: NuevaPromocion, usuarioId?: string): Promise<Promocion> {
    exigirPermiso(usuarioId)
    const promo = db.promociones.find((p) => p.id === id)
    if (!promo) throw { mensaje: 'Promoción no encontrada.' } satisfies ApiError
    const n = limpiar(clonar(datos))
    validar(n, id)
    const antes = resumen(promo)
    // Los usos del cupón son un hecho: no se reescriben al editar la regla.
    Object.assign(promo, n, {
      cupon: n.cupon ? { ...n.cupon, usados: promo.cupon?.usados ?? 0 } : undefined,
    })
    registrar({
      usuarioId,
      modulo: 'Promociones',
      accion: 'Promoción editada',
      detalle: `${promo.codigo}: ${antes} → ${resumen(promo)}`,
    })
    persistir()
    return latencia(clonar(promo))
  },

  /** Encender o apagar: es lo que más se usa, y queda en la bitácora. */
  async cambiarEstado(id: string, activa: boolean, usuarioId?: string): Promise<Promocion> {
    exigirPermiso(usuarioId)
    const promo = db.promociones.find((p) => p.id === id)
    if (!promo) throw { mensaje: 'Promoción no encontrada.' } satisfies ApiError
    promo.activa = activa
    registrar({
      usuarioId,
      modulo: 'Promociones',
      accion: activa ? 'Promoción activada' : 'Promoción desactivada',
      detalle: `${promo.codigo} · ${promo.nombre}`,
    })
    persistir()
    return latencia(clonar(promo))
  },

  async eliminar(id: string, usuarioId?: string): Promise<void> {
    exigirPermiso(usuarioId)
    const promo = db.promociones.find((p) => p.id === id)
    if (!promo) throw { mensaje: 'Promoción no encontrada.' } satisfies ApiError
    if (promo.cupon && promo.cupon.usados > 0)
      throw {
        mensaje: `«${promo.nombre}» tiene ${promo.cupon.usados} cupones canjeados: desactívala en lugar de borrarla.`,
      } satisfies ApiError
    db.promociones = db.promociones.filter((p) => p.id !== id)
    registrar({
      usuarioId,
      modulo: 'Promociones',
      accion: 'Promoción eliminada',
      detalle: `${promo.codigo} · ${promo.nombre}`,
    })
    persistir()
    await latencia(null)
  },

  evaluar: async (cuenta: CuentaPromociones) => latencia(evaluar(cuenta)),
}

// ── Puntos ───────────────────────────────────────────────────────────────────

export const puntosService = {
  async reglas(): Promise<ReglasPuntos> {
    return latencia(clonar(db.reglasPuntos))
  },

  /**
   * Aquí solo viven las reglas: cuánto suma un sol y cuánto vale un punto. El
   * saldo del cliente es de fidelización, que es otro sistema (D-011, punto 10).
   */
  async guardar(datos: ReglasPuntos, usuarioId?: string): Promise<ReglasPuntos> {
    exigirPermiso(usuarioId)
    if (!(datos.solesPorPunto > 0))
      throw errorCampo('solesPorPunto', 'Indica cuántos soles valen un punto.')
    if (!(datos.valorPunto > 0))
      throw errorCampo('valorPunto', 'Indica cuánto descuenta un punto al canjear.')
    if (datos.canjeMinimo < 0) throw errorCampo('canjeMinimo', 'El canje mínimo no es negativo.')
    if (datos.caducidadMeses < 0) throw errorCampo('caducidadMeses', 'La caducidad no es negativa.')
    const antes = db.reglasPuntos
    db.reglasPuntos = clonar(datos)
    registrar({
      usuarioId,
      modulo: 'Promociones',
      accion: 'Reglas de puntos guardadas',
      detalle: `${datos.activo ? 'Activas' : 'Inactivas'} · 1 punto por S/ ${datos.solesPorPunto} (antes S/ ${antes.solesPorPunto}) · punto = S/ ${datos.valorPunto}`,
    })
    persistir()
    return latencia(clonar(db.reglasPuntos))
  },

  /** Puntos que daría una cuenta, para que el POS los muestre al cobrar. */
  puntosPor(importe: number, canalId?: string): number {
    const r = db.reglasPuntos
    if (!r.activo || r.solesPorPunto <= 0) return 0
    if (canalId && r.canalIds.length && !r.canalIds.includes(canalId)) return 0
    return Math.floor(importe / r.solesPorPunto)
  },
}
