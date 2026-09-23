import type { ModoRecepcion } from '@/types'

/**
 * Hoja de recepción para imprimir: lo pendiente de una OC con espacio para
 * anotar a mano lo que se revisa en la puerta (conteo, lote, vencimiento,
 * ubicación, series). Vale para los dos modos.
 */

export interface LineaHoja {
  articulo: string
  codigo?: string
  insumo: string
  unidadCompra: string
  pendiente: number
  factor: number
  unidadInsumo: string
  lote: boolean
  vencimiento: boolean
  ubicacion: boolean
  serie: boolean
}

export interface DatosHoja {
  ordenCompra: string
  requerimiento: string
  proveedores: string
  local: string
  zona: string
  modo: ModoRecepcion
  lineas: LineaHoja[]
}

const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 }).format(Math.round(n * 1000) / 1000)

export function htmlHojaRecepcion(d: DatosHoja): string {
  const total = d.modo === 'total'
  const hayLote = d.lineas.some((l) => l.lote)
  const hayVence = d.lineas.some((l) => l.vencimiento)
  const hayUbic = d.lineas.some((l) => l.ubicacion)
  const filas = d.lineas
    .map((l, i) => {
      const unidades = Math.round(l.pendiente * l.factor)
      const series = l.serie
        ? `<tr class="series"><td></td><td colspan="99"><b>Series (${unidades})</b><div class="casillas">${Array.from(
            { length: unidades },
            (_, n) => `<span>${n + 1}.</span>`,
          ).join('')}</div></td></tr>`
        : ''
      return `<tr>
  <td class="n">${i + 1}</td>
  <td><b>${esc(l.articulo)}</b>${l.codigo ? `<br><small>${esc(l.codigo)}</small>` : ''}<br><small>Entra como ${esc(l.insumo)}</small></td>
  <td class="num"><b>${fmt(l.pendiente)}</b> ${esc(l.unidadCompra)}<br><small>1 = ${fmt(l.factor)} ${esc(l.unidadInsumo)} → ${fmt(l.pendiente * l.factor)} ${esc(l.unidadInsumo)}</small></td>
  <td class="caja">${total ? '☐ Conforme' : ''}</td>
  ${hayLote ? `<td class="caja">${l.lote ? '' : '—'}</td>` : ''}
  ${hayVence ? `<td class="caja">${l.vencimiento ? '' : '—'}</td>` : ''}
  ${hayUbic ? `<td class="caja">${l.ubicacion ? '' : '—'}</td>` : ''}
  <td class="caja"></td>
</tr>${series}`
    })
    .join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Hoja de recepción ${esc(d.ordenCompra)}</title>
<style>
  @page { size: A4; margin: 14mm }
  body { font: 12px/1.35 system-ui, sans-serif; color: #111; margin: 0 }
  h1 { font-size: 18px; margin: 0 }
  .cab { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px }
  .meta { display: grid; grid-template-columns: auto auto; gap: 2px 12px; font-size: 11px }
  .modo { border: 1.5px solid #111; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; font-size: 11px }
  table { width: 100%; border-collapse: collapse }
  th, td { border: 1px solid #999; padding: 6px; vertical-align: top; text-align: left }
  th { background: #eee; font-size: 10px; text-transform: uppercase; letter-spacing: .03em }
  td.n { width: 18px; text-align: center }
  td.num { white-space: nowrap }
  td.caja { min-width: 70px; height: 34px }
  small { color: #555 }
  .series td { border-top: 0 }
  .casillas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 12px; margin-top: 4px }
  .casillas span { border-bottom: 1px solid #999; height: 20px; font-size: 10px; color: #555 }
  .firmas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 40px }
  .firmas div { border-top: 1px solid #111; padding-top: 4px; text-align: center; font-size: 11px }
  .obs { margin-top: 14px; border: 1px solid #999; height: 60px; padding: 6px; font-size: 11px; color: #555 }
</style></head><body>
<div class="cab">
  <div><h1>Hoja de recepción · ${esc(d.ordenCompra)}</h1><small>${esc(d.requerimiento)} · ${esc(d.proveedores)}</small></div>
  <div class="meta"><span>Local</span><b>${esc(d.local)}</b><span>Zona</span><b>${esc(d.zona)}</b><span>Impresa</span><b>${new Date().toLocaleString('es-PE')}</b></div>
</div>
<div class="modo">${
    total
      ? '<b>Recepción TOTAL (a ciegas).</b> Se recibe todo lo pendiente tal cual o no se recibe nada. Si una línea no está conforme, se rechaza la entrega completa.'
      : '<b>Recepción A DETALLE.</b> Cuenta cada línea y anota lo que llegó realmente. Lo que falte queda pendiente en la OC.'
  }</div>
<table>
  <thead><tr><th>#</th><th>Artículo</th><th>Pendiente</th><th>${total ? 'Revisión' : 'Llegó (contado)'}</th>${hayLote ? '<th>Lote</th>' : ''}${hayVence ? '<th>Vence</th>' : ''}${hayUbic ? '<th>Ubicación</th>' : ''}<th>Observación</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
<div class="obs">Observaciones generales:</div>
<div class="firmas"><div>Recibió</div><div>Transportista / proveedor</div><div>V.° B.° administración</div></div>
</body></html>`
}

/** Abre la hoja en una ventana aparte y lanza la impresión. */
export function imprimirHojaRecepcion(d: DatosHoja) {
  const ventana = window.open('', '_blank', 'width=900,height=1000')
  if (!ventana) return false
  ventana.document.write(htmlHojaRecepcion(d))
  ventana.document.close()
  ventana.focus()
  let impresa = false
  const imprimir = () => {
    if (impresa) return
    impresa = true
    ventana.print()
  }
  ventana.addEventListener('load', imprimir)
  setTimeout(imprimir, 400)
  return true
}
