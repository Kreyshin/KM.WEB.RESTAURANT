import type { TipoComprobante } from '@/types'
import { db, latencia } from './mock/db'

/**
 * Qué se ve afectado al activar o desactivar un registro.
 *
 * Cada función devuelve frases listas para la pantalla de confirmación. Con
 * backend real será un endpoint del tipo `GET /locales/:id/dependencias`.
 */

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export type Consecuencias = (id: string, activar: boolean) => Promise<string[]>

const pluralComprobante: Record<TipoComprobante, string> = {
  boleta: 'boletas',
  factura: 'facturas',
  notaCredito: 'notas de crédito',
  notaVenta: 'notas de venta',
}

export const dependenciasService = {
  async local(id: string, activar: boolean) {
    const series = db.series.filter((s) => s.localId === id && s.activo).length
    const areas = db.areas.filter((a) => a.localId === id && a.activo).length
    const impresoras = db.impresoras.filter((i) => i.localId === id && i.activo).length
    if (activar) {
      return latencia(['Vuelve a aparecer en el selector de local de la cabecera.'])
    }
    const lineas = ['Deja de aparecer en el selector de local de la cabecera.']
    if (series)
      lineas.push(
        `${plural(series, 'serie activa', 'series activas')} no podrán emitir comprobantes.`,
      )
    if (areas) lineas.push(`${plural(areas, 'área', 'áreas')} dejarán de recibir comandas.`)
    if (impresoras)
      lineas.push(`${plural(impresoras, 'impresora', 'impresoras')} quedarán sin uso.`)
    return latencia(lineas)
  },

  async salon(id: string, activar: boolean) {
    const mesas = db.mesas.filter((m) => m.salonId === id).length
    if (activar) return latencia(['El salón y sus mesas vuelven a mostrarse en el plano.'])
    return latencia([
      'Deja de mostrarse en el plano de mesas y en la toma de pedidos.',
      mesas
        ? `Sus ${plural(mesas, 'mesa', 'mesas')} no se podrán asignar mientras esté inactivo.`
        : 'No tiene mesas asignadas.',
    ])
  },

  async categoria(id: string, activar: boolean) {
    const productos = db.productos.filter((p) => p.categoriaId === id).length
    const texto = plural(productos, 'producto', 'productos')
    return latencia(
      activar
        ? [`La categoría y sus ${texto} vuelven a mostrarse en la carta.`]
        : [`La categoría y sus ${texto} se ocultan de la carta y de la toma de pedidos.`],
    )
  },

  async medioPago(_id: string, activar: boolean) {
    return latencia([
      activar
        ? 'Vuelve a aparecer como forma de cobro en caja.'
        : 'Deja de aparecer como forma de cobro en caja. Los cobros ya registrados no cambian.',
    ])
  },

  async canal(id: string, activar: boolean) {
    if (activar) return latencia(['Se pueden volver a registrar pedidos por este canal.'])
    const lineas = ['No se podrán registrar pedidos nuevos por este canal.']
    if (db.canales.find((c) => c.id === id)?.aplicaRecargoConsumo) {
      lineas.push('Tiene configurado el recargo al consumo; se mantendrá por si lo reactivas.')
    }
    return latencia(lineas)
  },

  async area(_id: string, activar: boolean) {
    return latencia([
      activar
        ? 'Vuelve a recibir las comandas de sus productos.'
        : 'Sus productos dejarán de comandarse aquí: revisa que otra área los reciba.',
    ])
  },

  async impresora(id: string, activar: boolean) {
    const areas = db.areas.filter((a) => a.impresoraId === id).map((a) => a.nombre)
    if (activar) return latencia(['Vuelve a imprimir los documentos que tiene asignados.'])
    return latencia(
      areas.length
        ? [`Dejarán de imprimir las áreas: ${areas.join(', ')}.`]
        : ['No tiene áreas asignadas; no afecta a las comandas.'],
    )
  },

  async motivo(_id: string, activar: boolean) {
    return latencia([
      activar
        ? 'Vuelve a aparecer en la lista de motivos al anular o descontar.'
        : 'Deja de ofrecerse al anular o descontar. Los registros que ya lo usan lo conservan.',
    ])
  },

  async serie(id: string, activar: boolean) {
    const serie = db.series.find((s) => s.id === id)
    if (!serie) return latencia([])
    const tipo = pluralComprobante[serie.tipo]
    if (activar) return latencia([`Se pueden volver a emitir ${tipo} con la serie ${serie.serie}.`])
    const otras = db.series.filter(
      (s) => s.id !== id && s.activo && s.localId === serie.localId && s.tipo === serie.tipo,
    ).length
    return latencia([
      `No se podrán emitir más ${tipo} con la serie ${serie.serie}.`,
      otras
        ? `El local seguirá emitiendo con otras ${plural(otras, 'serie', 'series')} de ${tipo}.`
        : `El local se quedará sin series activas de ${tipo}.`,
    ])
  },
} satisfies Record<string, Consecuencias>
