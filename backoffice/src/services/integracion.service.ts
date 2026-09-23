import type { CapacidadIntegracion, ConfigIntegracion, ModoIntegracion, VinculoErp } from '@/types'
import { registrar } from './auditoria.service'
import { db, latencia, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo } from './mock/reglas'

/**
 * Integración con el ERP por capacidad (D-009). El modo se fija por empresa
 * con excepción por local, y lo configura Karma desde su consola. El código de
 * la vertical pregunta el modo de la capacidad, nunca «¿está el ERP?».
 */

export const capacidades: CapacidadIntegracion[] = [
  'inventario',
  'compras',
  'precios',
  'ventas',
  'contabilidad',
  'asistencia',
]

export const etiquetaCapacidad: Record<CapacidadIntegracion, string> = {
  inventario: 'Inventario',
  compras: 'Compras',
  precios: 'Lista de precios',
  ventas: 'Ventas',
  contabilidad: 'Contabilidad',
  asistencia: 'Asistencia',
}

export const etiquetaModo: Record<ModoIntegracion, string> = {
  autonomo: 'Autónomo',
  sincronizado: 'Sincronizado',
  delegado: 'Delegado',
}

export const descripcionModo: Record<ModoIntegracion, string> = {
  autonomo: 'La vertical registra y decide sola.',
  sincronizado: 'La vertical registra y homologa con el ERP, que decide en conflicto.',
  delegado: 'Opera el ERP; la vertical consulta y propone.',
}

/** Modo efectivo de una capacidad en un local: el del local si lo tiene, si no el de la empresa. */
export function modoIntegracion(
  capacidad: CapacidadIntegracion,
  localId?: string,
): ModoIntegracion {
  return (
    (localId ? db.integracion.locales[localId]?.[capacidad] : undefined) ??
    db.integracion.empresa[capacidad] ??
    'autonomo'
  )
}

export function vinculoDe(entidad: VinculoErp['entidad'], idVertical: string) {
  return db.vinculosErp.find((v) => v.entidad === entidad && v.idVertical === idVertical)
}

export const integracionService = {
  async configuracion(): Promise<ConfigIntegracion> {
    return latencia(clonar(db.integracion))
  },

  async vinculos(): Promise<VinculoErp[]> {
    return latencia([...db.vinculosErp])
  },

  /**
   * Cambia el modo de una capacidad (consola de Karma). `localId` fija una
   * excepción de ese local; `modo` undefined la quita y el local vuelve a la empresa.
   */
  async cambiarModo(
    capacidad: CapacidadIntegracion,
    modo: ModoIntegracion | undefined,
    motivo: string,
    localId?: string,
  ) {
    if (!motivo.trim()) throw errorCampo('motivo', 'Registra por qué cambia el modo.')
    if (!localId && !modo) throw { mensaje: 'La empresa siempre tiene un modo.' }
    const anterior = modoIntegracion(capacidad, localId)
    if (localId) {
      const locales = (db.integracion.locales[localId] ??= {})
      if (modo) locales[capacidad] = modo
      else delete locales[capacidad]
    } else {
      db.integracion.empresa[capacidad] = modo
    }
    const nuevo = modoIntegracion(capacidad, localId)
    db.integracion.historial.unshift({
      capacidad,
      localId,
      anterior,
      nuevo,
      motivo: motivo.trim(),
      autor: 'Consola Karma',
      fecha: new Date().toISOString(),
    })
    registrar({
      autor: 'Consola Karma',
      localId,
      modulo: 'Integración',
      accion: 'Cambio de modo',
      detalle: `${etiquetaCapacidad[capacidad]}${
        localId
          ? ` en ${db.locales.find((l) => l.id === localId)?.nombre ?? localId}`
          : ' en la empresa'
      }: ${etiquetaModo[anterior]} → ${etiquetaModo[nuevo]} · ${motivo.trim()}`,
    })
    persistir()
    await latencia(null)
  },
}
