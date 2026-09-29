import type { ApiError, Cobertura, NuevaZonaReparto, ZonaReparto } from '@/types'
import { registrar } from './auditoria.service'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'
import { tienePermiso, valorConfig } from './parametros.service'

/**
 * Zonas de reparto (F6.2, D-011).
 *
 * La zona es del local: la cobertura y el tiempo prometido dependen de dónde
 * está la cocina. Solo vale para el **reparto propio**; las apps de delivery
 * ponen su logística y cobran su comisión (D-001), así que no tienen zona.
 */

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

/** Distritos que ya aparecen en los datos: locales, clientes y otras zonas. */
export function distritosConocidos(): string[] {
  const vistos = new Map<string, string>()
  const anotar = (d?: string) => {
    if (d?.trim()) vistos.set(normalizar(d), d.trim())
  }
  for (const l of db.locales) anotar(l.distrito)
  for (const c of db.clientes) anotar(c.distrito)
  for (const z of db.zonasReparto) for (const d of z.distritos) anotar(d)
  return [...vistos.values()].sort((a, b) => a.localeCompare(b))
}

/** Zona activa del local que cubre ese distrito, si la hay. */
export function zonaDe(localId: string, distrito: string): ZonaReparto | undefined {
  const buscado = normalizar(distrito)
  return db.zonasReparto.find(
    (z) => z.activa && z.localId === localId && z.distritos.some((d) => normalizar(d) === buscado),
  )
}

/**
 * Qué se le puede decir al cliente sobre una dirección: si se llega, qué cuesta
 * el envío y en cuánto tiempo. Fuera de cobertura no es un error del programa:
 * cada local decide si bloquea el pedido o solo avisa (D-011, punto 3).
 */
export function cobertura(localId: string, distrito: string, subtotal = 0): Cobertura {
  const bloquea = valorConfig<string>('delivery.fueraDeCobertura', localId) === 'bloquear'
  const zona = distrito ? zonaDe(localId, distrito) : undefined

  if (!zona) {
    return {
      estado: 'fueraDeCobertura',
      costoEnvio: 0,
      envioGratis: false,
      bloquea,
      explicacion: distrito
        ? `Ninguna zona activa de este local reparte a ${distrito}.`
        : 'Falta el distrito de la dirección.',
    }
  }

  const cobra = valorConfig<boolean>('delivery.cobrarEnvio', localId)
  const gratisPorMonto = zona.envioGratisDesde !== undefined && subtotal >= zona.envioGratisDesde
  const envioGratis = !cobra || gratisPorMonto
  const costoEnvio = envioGratis ? 0 : zona.costoEnvio

  if (zona.pedidoMinimo > 0 && subtotal < zona.pedidoMinimo) {
    return {
      estado: 'bajoMinimo',
      zona,
      costoEnvio,
      envioGratis,
      tiempoEstimadoMin: zona.tiempoEstimadoMin,
      faltaParaMinimo: redondear(zona.pedidoMinimo - subtotal),
      bloquea: true,
      explicacion: `${zona.nombre}: el pedido mínimo es S/ ${zona.pedidoMinimo.toFixed(2)} y faltan S/ ${redondear(
        zona.pedidoMinimo - subtotal,
      ).toFixed(2)}.`,
    }
  }

  const porQue = !cobra
    ? 'este local no cobra envío'
    : gratisPorMonto
      ? `pasa de S/ ${zona.envioGratisDesde?.toFixed(2)}, el envío va gratis`
      : `envío S/ ${zona.costoEnvio.toFixed(2)}`
  return {
    estado: 'cubierto',
    zona,
    costoEnvio,
    envioGratis,
    tiempoEstimadoMin: zona.tiempoEstimadoMin,
    bloquea: false,
    explicacion: `${zona.nombre}: ${porQue}, ${zona.tiempoEstimadoMin} min estimados.`,
  }
}

function validar(datos: NuevaZonaReparto, id?: string) {
  if (!datos.nombre?.trim()) throw errorCampo('nombre', 'Ponle un nombre a la zona.', 'Requerido')
  if (!db.locales.some((l) => l.id === datos.localId))
    throw errorCampo('localId', 'Elige el local de la zona.', 'Requerido')

  const delLocal = db.zonasReparto.filter((z) => z.localId === datos.localId && z.id !== id)
  if (delLocal.some((z) => normalizar(z.nombre) === normalizar(datos.nombre)))
    throw errorCampo('nombre', 'Este local ya tiene una zona con ese nombre.', 'Nombre duplicado')

  const distritos = datos.distritos.map((d) => d.trim()).filter(Boolean)
  if (!distritos.length)
    throw errorCampo('distritos', 'Indica al menos un distrito.', 'Sin cobertura')

  const repetido = distritos.find(
    (d, i) => distritos.findIndex((x) => normalizar(x) === normalizar(d)) !== i,
  )
  if (repetido) throw errorCampo('distritos', `${repetido} está dos veces.`, 'Repetido')

  // Un distrito no puede estar en dos zonas del mismo local: el POS no sabría
  // cuál costo cobrar ni qué tiempo prometer.
  for (const d of distritos) {
    const otra = delLocal.find((z) => z.distritos.some((x) => normalizar(x) === normalizar(d)))
    if (otra)
      throw errorCampo(
        'distritos',
        `${d} ya está en la zona «${otra.nombre}».`,
        'Distrito repetido',
      )
  }

  if (!(datos.costoEnvio >= 0)) throw errorCampo('costoEnvio', 'El envío no puede ser negativo.')
  if (!(datos.pedidoMinimo >= 0))
    throw errorCampo('pedidoMinimo', 'El pedido mínimo no puede ser negativo.')
  if (!(datos.tiempoEstimadoMin > 0))
    throw errorCampo('tiempoEstimadoMin', 'Indica cuántos minutos se prometen.')
  if (datos.envioGratisDesde !== undefined) {
    if (!(datos.envioGratisDesde > 0))
      throw errorCampo('envioGratisDesde', 'El monto de envío gratis debe ser mayor a 0.')
    if (datos.envioGratisDesde < datos.pedidoMinimo)
      throw errorCampo(
        'envioGratisDesde',
        'El envío gratis quedaría siempre activo: está por debajo del pedido mínimo.',
        'Revisa el monto',
      )
  }
}

function limpiar(datos: NuevaZonaReparto): NuevaZonaReparto {
  return {
    ...datos,
    nombre: datos.nombre.trim(),
    distritos: datos.distritos.map((d) => d.trim()).filter(Boolean),
    nota: datos.nota?.trim() || undefined,
  }
}

function exigirPermiso(usuarioId?: string) {
  if (!tienePermiso(usuarioId, 'delivery.zonas'))
    throw { mensaje: 'No tienes permiso para editar las zonas de reparto.' } satisfies ApiError
}

export const zonasRepartoService = {
  async listar(localId?: string): Promise<ZonaReparto[]> {
    return latencia(
      clonar(
        db.zonasReparto
          .filter((z) => !localId || z.localId === localId)
          .sort((a, b) => a.costoEnvio - b.costoEnvio || a.nombre.localeCompare(b.nombre)),
      ),
    )
  },

  async crear(datos: NuevaZonaReparto, usuarioId?: string): Promise<ZonaReparto> {
    exigirPermiso(usuarioId)
    const n = limpiar(clonar(datos))
    validar(n)
    const zona: ZonaReparto = { ...n, id: nuevoId('zr') }
    db.zonasReparto.push(zona)
    registrar({
      usuarioId,
      localId: zona.localId,
      modulo: 'Delivery',
      accion: 'Zona de reparto creada',
      detalle: `${zona.nombre} · ${zona.distritos.join(', ')} · envío S/ ${zona.costoEnvio.toFixed(2)}`,
    })
    persistir()
    return latencia(clonar(zona))
  },

  async actualizar(id: string, datos: NuevaZonaReparto, usuarioId?: string): Promise<ZonaReparto> {
    exigirPermiso(usuarioId)
    const zona = db.zonasReparto.find((z) => z.id === id)
    if (!zona) throw { mensaje: 'Zona de reparto no encontrada.' } satisfies ApiError
    const n = limpiar(clonar(datos))
    validar(n, id)
    const antes = `${zona.distritos.join(', ')} · envío S/ ${zona.costoEnvio.toFixed(2)}`
    Object.assign(zona, n)
    registrar({
      usuarioId,
      localId: zona.localId,
      modulo: 'Delivery',
      accion: 'Zona de reparto editada',
      detalle: `${zona.nombre}: ${antes} → ${zona.distritos.join(', ')} · envío S/ ${zona.costoEnvio.toFixed(2)}`,
    })
    persistir()
    return latencia(clonar(zona))
  },

  async eliminar(id: string, usuarioId?: string): Promise<void> {
    exigirPermiso(usuarioId)
    const zona = db.zonasReparto.find((z) => z.id === id)
    if (!zona) throw { mensaje: 'Zona de reparto no encontrada.' } satisfies ApiError
    db.zonasReparto = db.zonasReparto.filter((z) => z.id !== id)
    registrar({
      usuarioId,
      localId: zona.localId,
      modulo: 'Delivery',
      accion: 'Zona de reparto eliminada',
      detalle: `${zona.nombre} · ${zona.distritos.join(', ')}`,
    })
    persistir()
    await latencia(null)
  },

  cobertura,
  zonaDe,
  distritosConocidos,
}
