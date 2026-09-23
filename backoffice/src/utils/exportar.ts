/**
 * Exportación de tablas a CSV y a Excel, sin dependencias.
 *
 * El Excel se genera como SpreadsheetML (XML de Office 2003): lo abre Excel,
 * LibreOffice y Google Sheets, conserva números como números y no requiere
 * librería. Cuando haga falta formato avanzado se sustituye esta función.
 */

export interface ColumnaExportable<T> {
  etiqueta: string
  valor: (fila: T) => string | number | boolean | null | undefined
}

type Celda = string | number | boolean | null | undefined

function matriz<T>(filas: readonly T[], columnas: ColumnaExportable<T>[]): Celda[][] {
  return [columnas.map((c) => c.etiqueta), ...filas.map((f) => columnas.map((c) => c.valor(f)))]
}

function celdaCsv(valor: Celda, separador: string) {
  if (valor === null || valor === undefined) return ''
  const texto = typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor)
  return /["\n\r]/.test(texto) || texto.includes(separador)
    ? `"${texto.replace(/"/g, '""')}"`
    : texto
}

/**
 * CSV con separador `;` —el que espera Excel con configuración regional
 * es-PE— y BOM para que respete tildes y eñes.
 */
export function aCsv<T>(filas: readonly T[], columnas: ColumnaExportable<T>[], separador = ';') {
  const lineas = matriz(filas, columnas).map((fila) =>
    fila.map((c) => celdaCsv(c, separador)).join(separador),
  )
  return '﻿' + lineas.join('\r\n')
}

function escaparXml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function celdaXml(valor: Celda) {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<Cell><Data ss:Type="Number">${valor}</Data></Cell>`
  }
  if (valor === null || valor === undefined) return '<Cell/>'
  const texto = typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor)
  return `<Cell><Data ss:Type="String">${escaparXml(texto)}</Data></Cell>`
}

export function aExcel<T>(filas: readonly T[], columnas: ColumnaExportable<T>[], hoja = 'Datos') {
  const [cabecera = [], ...cuerpo] = matriz(filas, columnas)
  const filaXml = (celdas: Celda[], estilo?: string) =>
    `<Row${estilo ? ` ss:StyleID="${estilo}"` : ''}>${celdas.map(celdaXml).join('')}</Row>`

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Styles><Style ss:ID="cab"><Font ss:Bold="1"/></Style></Styles>',
    `<Worksheet ss:Name="${escaparXml(hoja.slice(0, 31))}"><Table>`,
    filaXml(cabecera, 'cab'),
    ...cuerpo.map((f) => filaXml(f)),
    '</Table></Worksheet></Workbook>',
  ].join('')
}

/** Fecha para el nombre del archivo: `salones-2026-09-12`. */
export function nombreArchivo(base: string, extension: string, fecha = new Date()) {
  const dia = fecha.toLocaleDateString('sv-SE')
  return `${base}-${dia}.${extension}`
}

export function descargar(contenido: string, nombre: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

export function exportarCsv<T>(
  base: string,
  filas: readonly T[],
  columnas: ColumnaExportable<T>[],
) {
  descargar(aCsv(filas, columnas), nombreArchivo(base, 'csv'), 'text/csv;charset=utf-8')
}

export function exportarExcel<T>(
  base: string,
  filas: readonly T[],
  columnas: ColumnaExportable<T>[],
) {
  descargar(
    aExcel(filas, columnas, base),
    nombreArchivo(base, 'xls'),
    'application/vnd.ms-excel;charset=utf-8',
  )
}
