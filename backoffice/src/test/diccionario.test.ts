import { describe, expect, it } from 'vitest'
// Se leen como texto (Vite `?raw`): el modelo y su diccionario, tal cual están.
import tipos from '@/types/index.ts?raw'
import diccionario from '../../docs/guia/entidades.md?raw'

/**
 * F10 · Diccionario de entidades.
 *
 * El diccionario sirve mientras esté al día; en cuanto se queda atrás, engaña.
 * Esta prueba lo vigila: toda entidad del modelo tiene que estar documentada en
 * `docs/guia/entidades.md`, y lo que ya no existe no puede seguir ahí.
 *
 * Si falla tras añadir un tipo: documéntalo, o apúntalo abajo con el porqué.
 */

/**
 * Lo que no necesita entrada propia: formas auxiliares de la interfaz, de la
 * red o de los reportes, que se explican donde se usan.
 */
const SIN_ENTRADA = new Set([
  // Envoltorios de consulta y respuesta.
  'Paginado',
  'Consulta',
  'Orden',
  'DireccionOrden',
  'ApiError',
  // Derivados de otra entidad ya documentada.
  'SalonConMesas',
  'ParametrosResueltos',
  'PrecioVigente',
  'RepartoCombo',
  'OrigenPrecio',
  'EstadoStock',
  'CostoLinea',
  'CostoReceta',
  'EstadoCosto',
  'ClaseAbc',
  'Cobertura',
  'EstadoCobertura',
  'TotalesPedido',
  'TotalesComprobante',
  'PromocionAplicada',
  'ResultadoPromociones',
  'MotivoDescarte',
  'CuentaPromociones',
  'LineaCuenta',
  'ConsumoLinea',
  'ResumenCaja',
  'ConteoMedio',
  'RespuestaSunat',
  'ReceptorComprobante',
  'Pago',
  // Formas de los reportes: se describen en su propia sección, no una a una.
  'FiltroReporte',
  'VentasPorDia',
  'VentasPorCanal',
  'VentasPorHora',
  'ResumenVentas',
  'RentabilidadPlato',
  'ResumenPlatos',
  'ConsumoInsumo',
  'ResumenConsumo',
])

/** Entidades del modelo: interfaces exportadas que no son `Nueva*` ni auxiliares. */
function entidadesDelModelo() {
  const nombres = [...tipos.matchAll(/^export interface (\w+)/gm)].map((m) => m[1]!)
  return nombres.filter(
    (n) => !n.startsWith('Nuevo') && !n.startsWith('Nueva') && !SIN_ENTRADA.has(n),
  )
}

describe('diccionario de entidades', () => {
  it('documenta cada entidad del modelo', () => {
    const faltan = entidadesDelModelo().filter((nombre) => !diccionario.includes(nombre))
    expect(faltan, `Sin documentar en entidades.md: ${faltan.join(', ')}`).toEqual([])
  })

  it('no habla de entidades que ya no existen', () => {
    // Encabezados de tercer nivel del diccionario: «### Insumo», «### Venta»…
    // Solo los encabezados de una palabra nombran una entidad; «Consumo por
    // venta» o «Configuración de la vertical» son prosa, no tipos.
    const documentadas = [
      ...diccionario.matchAll(/^### (\w+)[ \t]*(?:\(D-\d+\))?[ \t]*\r?$/gm),
    ].map((m) => m[1]!)
    const enCodigo = new Set([
      ...[...tipos.matchAll(/^export interface (\w+)/gm)].map((m) => m[1]!),
      ...[...tipos.matchAll(/^export type (\w+)/gm)].map((m) => m[1]!),
    ])
    // La sección «Retiradas» explica a propósito lo que ya no existe.
    const retiradas = diccionario.slice(diccionario.indexOf('## Retiradas'))
    const fantasmas = documentadas.filter((n) => !enCodigo.has(n) && !retiradas.includes(n))
    expect(fantasmas, `Documentadas pero fuera del modelo: ${fantasmas.join(', ')}`).toEqual([])
  })

  it('cada fase tiene su sección en el diccionario', () => {
    for (const fase of ['F4', 'F5', 'F6.1', 'F6.2', 'F7', 'F8', 'F9'])
      expect(diccionario).toContain(fase)
  })
})
