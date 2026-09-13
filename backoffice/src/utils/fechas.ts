/** Formato de fecha que viaja entre servicios y vistas (date-fns). */
export const FORMATO_FECHA_MODELO = 'yyyy-MM-dd'
/** Formato que ve y escribe el usuario en Perú (date-fns). */
export const FORMATO_FECHA_VISIBLE = 'dd/MM/yyyy'

import type { RangoFechas } from '@/types/ui'

/** `YYYY-MM-DD` en hora local (no UTC: a las 21:00 en Lima ya sería mañana). */
export function aFechaIso(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function sumarDias(fecha: Date, dias: number) {
  const copia = new Date(fecha)
  copia.setDate(copia.getDate() + dias)
  return copia
}

export type AtajoRango = 'hoy' | 'ayer' | 'ultimos7' | 'ultimos30' | 'esteMes' | 'mesAnterior'

export const etiquetaAtajo: Record<AtajoRango, string> = {
  hoy: 'Hoy',
  ayer: 'Ayer',
  ultimos7: 'Últimos 7 días',
  ultimos30: 'Últimos 30 días',
  esteMes: 'Este mes',
  mesAnterior: 'Mes anterior',
}

export function rangoDeAtajo(atajo: AtajoRango, hoy = new Date()): RangoFechas {
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  switch (atajo) {
    case 'hoy':
      return { desde: aFechaIso(hoy), hasta: aFechaIso(hoy) }
    case 'ayer': {
      const ayer = aFechaIso(sumarDias(hoy, -1))
      return { desde: ayer, hasta: ayer }
    }
    case 'ultimos7':
      return { desde: aFechaIso(sumarDias(hoy, -6)), hasta: aFechaIso(hoy) }
    case 'ultimos30':
      return { desde: aFechaIso(sumarDias(hoy, -29)), hasta: aFechaIso(hoy) }
    case 'esteMes':
      return { desde: aFechaIso(new Date(y, m, 1)), hasta: aFechaIso(hoy) }
    case 'mesAnterior':
      return { desde: aFechaIso(new Date(y, m - 1, 1)), hasta: aFechaIso(new Date(y, m, 0)) }
  }
}

/** Atajo que produce exactamente este rango, para resaltarlo en el selector. */
export function atajoDeRango(rango: RangoFechas, hoy = new Date()): AtajoRango | null {
  const atajos = Object.keys(etiquetaAtajo) as AtajoRango[]
  return (
    atajos.find((a) => {
      const r = rangoDeAtajo(a, hoy)
      return r.desde === rango.desde && r.hasta === rango.hasta
    }) ?? null
  )
}

/** Etiquetas accesibles del selector de fechas, en español. */
export const etiquetasCalendario = {
  toggleOverlay: 'Cambiar vista',
  menu: 'Calendario',
  input: 'Fecha',
  openYearsOverlay: 'Elegir año',
  openMonthsOverlay: 'Elegir mes',
  nextMonth: 'Mes siguiente',
  prevMonth: 'Mes anterior',
  nextYear: 'Año siguiente',
  prevYear: 'Año anterior',
  clearInput: 'Borrar fecha',
  calendarIcon: 'Abrir calendario',
}
