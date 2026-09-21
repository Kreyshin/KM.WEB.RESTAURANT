import { beforeEach, describe, expect, it } from 'vitest'
import { inventarioService } from './inventario.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'
import {
  convertir,
  costoCombo,
  costoReceta,
  impactoInsumo,
  precioParaObjetivo,
  recetaDe,
  recetasService,
  versionVigente,
} from './recetas.service'

/**
 * Reglas de F4.6 (D-007): la receta costea en valores netos, por versión
 * vigente, y el costo útil divide entre el rendimiento sin sumar la merma.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const salon = { localId: 'l1', canalId: 'cv1' }
const hoy = new Date().toISOString().slice(0, 10)
const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

describe('unidades', () => {
  it('convierte solo dentro de la misma dimensión', () => {
    expect(convertir(250, 'g', 'kg')).toBeCloseTo(0.25)
    expect(convertir(50, 'ml', 'l')).toBeCloseTo(0.05)
    expect(convertir(1, 'g', 'l')).toBeNull()
  })

  it('no deja cambiar la unidad de un insumo que ya se usa', async () => {
    await expect(inventarioService.actualizarInsumo('i1', { unidad: 'g' })).rejects.toMatchObject({
      campos: { unidad: 'Unidad en uso' },
    })
  })
})

describe('costo de receta', () => {
  it('costea la versión vigente convirtiendo unidades, en valores netos', () => {
    const c = costoReceta('p:p6', salon)
    expect(c.version).toBe(2)
    expect(c.costoIngredientes).toBe(12.56)
    expect(c.costoConsumibles).toBe(0.13)
    expect(c.foodCost).toBeCloseTo((12.56 / c.precioNeto) * 100, 1)
    expect(c.precioNeto).toBeLessThan(c.precioConIgv)
    expect(c.margenContribucion).toBe(Math.round((c.precioNeto - 12.56 - 0.13) * 100) / 100)
  })

  it('la versión anterior sigue costeando las fechas en que regía', () => {
    const antes = new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10)
    expect(costoReceta('p:p6', { ...salon, fecha: antes }).version).toBe(1)
  })

  it('descuenta la comisión del canal en el margen de contribución', () => {
    const rappi = costoReceta('p:p6', { localId: 'l1', canalId: 'cv4' })
    expect(rappi.comision).toBe(Math.round(rappi.precioNeto * 0.25 * 100) / 100)
  })

  it('marca desactualizado cuando el insumo cambió más que la tolerancia', () => {
    expect(costoReceta('v:v1', salon).estado).toBe('desactualizado')
    expect(costoReceta('v:v2', salon).estado).toBe('completo')
    expect(costoReceta('p:p1', salon).estado).toBe('sinReceta')
  })

  it('con rendimiento activo, la cantidad neta se divide entre el rendimiento', async () => {
    const simple = costoReceta('v:v1', salon).costoIngredientes
    expect(simple).toBe(10.31)
    await parametrosService.guardarValor('recetas.cantidadBrutaNeta', true)
    await parametrosService.guardarValor('recetas.rendimientoInsumo', true)
    // 0,2 kg netos de lenguado ÷ 55 % = 0,3636 kg a 45.
    expect(costoReceta('v:v1', salon).costoIngredientes).toBe(17.67)
  })

  it('clasifica los ingredientes por su peso en el costo', () => {
    const c = costoReceta('v:v1', salon)
    const pescado = c.lineas.find((l) => l.insumoId === 'i2')!
    expect(pescado.clase).toBe('A')
    expect(c.lineas.reduce((s, l) => s + l.participacion, 0)).toBeCloseTo(100, 0)
  })

  it('el objetivo se hereda de presentación, categoría o configuración', () => {
    expect(costoReceta('v:v2', salon)).toMatchObject({
      objetivo: 34,
      origenObjetivo: 'presentacion',
    })
    expect(costoReceta('v:v1', salon)).toMatchObject({ objetivo: 32, origenObjetivo: 'categoria' })
    expect(costoReceta('p:p6', salon).origenObjetivo).not.toBe('presentacion')
  })

  it('el simulador propone el precio para el objetivo', () => {
    expect(precioParaObjetivo(9, 30)).toEqual({ neto: 30, conIgv: 35.4 })
  })

  it('el combo se costea con la opción más cara de cada grupo y avisa si falta costo', () => {
    const c = costoCombo('cb2', salon)!
    expect(c.grupos[0]!.costo).toBe(10.31)
    expect(c.completo).toBe(false)
  })

  it('un aumento de insumo muestra las recetas afectadas sin cambiar nada', () => {
    const impacto = impactoInsumo('i2', 10, salon)
    expect(impacto.map((i) => i.vendibleId).sort()).toEqual(['v:v1', 'v:v2'])
    expect(impacto[0]!.costoDespues).toBeGreaterThan(impacto[0]!.costoAntes)
    expect(db.insumos.find((i) => i.id === 'i2')!.costoUnitario).toBe(45)
  })
})

describe('versiones', () => {
  const lineas = [
    { id: '', tipo: 'ingrediente' as const, insumoId: 'i1', cantidad: 180, unidad: 'g' as const },
  ]

  it('una versión nueva no puede empezar antes que la última', async () => {
    await expect(
      recetasService.guardarVersion('p:p6', { lineas, vigenteDesde: '2020-01-01' }),
    ).rejects.toMatchObject({ campos: { vigenteDesde: 'Antes de la última versión' } })
  })

  it('una versión programada se puede eliminar; una que ya rigió, no', async () => {
    const r = await recetasService.guardarVersion('p:p6', { lineas, vigenteDesde: manana })
    const programada = r.versiones.find((v) => v.vigenteDesde === manana)!
    expect(versionVigente(recetaDe('p:p6'))?.numero).toBe(2)
    await recetasService.eliminarVersion('p:p6', programada.id)
    await expect(recetasService.eliminarVersion('p:p6', 'vr2')).rejects.toBeTruthy()
  })

  it('rechaza unidades de otra dimensión y recetas sin ingredientes', async () => {
    await expect(
      recetasService.guardarVersion('p:p4', {
        vigenteDesde: hoy,
        lineas: [{ ...lineas[0]!, insumoId: 'i10', unidad: 'g' }],
      }),
    ).rejects.toMatchObject({ campos: { lineas: expect.stringContaining('unidad') } })
    await expect(
      recetasService.guardarVersion('p:p4', { vigenteDesde: hoy, lineas: [] }),
    ).rejects.toBeTruthy()
  })

  it('copia la receta de otra presentación escalando las cantidades', async () => {
    const r = await recetasService.copiarDe('v:v1', 'p:p4', 1.5)
    expect(r.versiones[0]!.lineas.find((l) => l.insumoId === 'i2')?.cantidad).toBe(300)
  })

  it('no deja eliminar un insumo usado en una receta', async () => {
    await expect(inventarioService.eliminarInsumo('i1')).rejects.toBeTruthy()
  })
})
