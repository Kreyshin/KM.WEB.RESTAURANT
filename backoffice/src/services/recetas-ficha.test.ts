import { beforeEach, describe, expect, it } from 'vitest'
import { inventarioService } from './inventario.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'
import {
  alergenosDe,
  costoReceta,
  recetaDe,
  recetasService,
  versionVigente,
} from './recetas.service'

/**
 * Reglas de F4.6.2 (D-007): aprobación opcional, ficha técnica, reventa 1:1,
 * alérgenos desde insumos y modificadores que suman o quitan insumos.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const hoy = new Date().toISOString().slice(0, 10)
const salon = { localId: 'l1', canalId: 'cv1' }
const lineas = [
  { id: '', tipo: 'ingrediente' as const, insumoId: 'i1', cantidad: 190, unidad: 'g' as const },
]

describe('aprobación', () => {
  it('sin aprobación activa la versión rige al guardarla', async () => {
    await recetasService.guardarVersion('p:p6', { lineas, vigenteDesde: hoy })
    expect(versionVigente(recetaDe('p:p6'))?.numero).toBe(3)
  })

  it('con aprobación, el borrador no rige hasta aprobarlo y exige porciones y pasos', async () => {
    await parametrosService.guardarValor('recetas.aprobacion', true)
    const r = await recetasService.guardarVersion('p:p6', { lineas, vigenteDesde: hoy })
    const borrador = r.versiones.find((v) => v.numero === 3)!
    expect(borrador.estado).toBe('borrador')
    expect(versionVigente(recetaDe('p:p6'))?.numero).toBe(2)

    await expect(recetasService.aprobarVersion('p:p6', borrador.id, 'u1')).rejects.toMatchObject({
      mensaje: expect.stringContaining('porciones'),
    })

    await recetasService.guardarVersion('p:p6', {
      lineas,
      vigenteDesde: hoy,
      ficha: { porciones: 1, pasos: [{ id: '', descripcion: 'Saltear' }] },
    })
    const nuevo = recetaDe('p:p6')!.versiones.find((v) => v.numero === 4)!
    await recetasService.aprobarVersion('p:p6', nuevo.id, 'u1')
    expect(versionVigente(recetaDe('p:p6'))?.numero).toBe(4)
  })

  it('solo aprueba quien tiene el permiso', async () => {
    await parametrosService.guardarValor('recetas.aprobacion', true)
    const r = await recetasService.guardarVersion('p:p6', {
      lineas,
      vigenteDesde: hoy,
      ficha: { porciones: 1, pasos: [{ id: '', descripcion: 'Saltear' }] },
    })
    const cajero = db.usuarios.find((u) => u.rol === 'cajero')!
    await expect(
      recetasService.aprobarVersion('p:p6', r.versiones.at(-1)!.id, cajero.id),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('permiso') })
  })
})

describe('ficha técnica', () => {
  it('descarta pasos vacíos y guarda la ficha en la versión', async () => {
    const r = await recetasService.guardarVersion('p:p6', {
      lineas,
      vigenteDesde: hoy,
      ficha: {
        porciones: 2,
        pasos: [
          { id: '', descripcion: 'Cortar', tiempoMin: 3 },
          { id: '', descripcion: '  ' },
        ],
      },
    })
    expect(r.versiones.at(-1)!.ficha?.pasos).toHaveLength(1)
  })

  it('suma los alérgenos de los insumos de la receta', () => {
    expect(alergenosDe('v:v1')).toEqual(expect.arrayContaining(['pescado', 'aji']))
    expect(alergenosDe('p:p6')).toEqual([])
  })
})

describe('reventa', () => {
  it('crea la receta 1:1 y no deja editarla como receta', async () => {
    const r = await recetasService.fijarReventa('p:p1', 'i11')
    expect(r!.reventaInsumoId).toBe('i11')
    expect(costoReceta('p:p1', salon).costoIngredientes).toBe(0.6)
    await expect(
      recetasService.guardarVersion('p:p1', { lineas, vigenteDesde: hoy }),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('reventa') })
    await recetasService.fijarReventa('p:p1')
    expect(recetaDe('p:p1')?.reventaInsumoId).toBeUndefined()
  })

  it('no se revende lo que solo se produce', async () => {
    const producido = db.insumos.find((i) => i.abastecimiento === 'transformacion')!
    await expect(recetasService.fijarReventa('p:p1', producido.id)).rejects.toBeTruthy()
  })

  it('la semilla tiene la Inca Kola como reventa', () => {
    expect(costoReceta('p:p15', salon)).toMatchObject({
      estado: 'completo',
      costoIngredientes: 2.4,
    })
  })
})

describe('modificadores', () => {
  it('el adicional se costea con los insumos que suma', () => {
    // Huevo frito: 1 huevo a 0,60.
    expect(costoReceta('m:mo7', salon).costoIngredientes).toBe(0.6)
  })

  it('guarda efectos y notas rápidas, y valida unidades', async () => {
    await recetasService.guardarModificadores(
      'p6',
      { mo20: [], mo7: [{ insumoId: 'i11', cantidad: 2, unidad: 'unidad', efecto: 'suma' }] },
      ['Poca sal', ' ', 'Poca sal', 'Sin ají'],
    )
    const p = db.productos.find((x) => x.id === 'p6')!
    expect(p.notasRapidas).toEqual(['Poca sal', 'Sin ají'])
    const mods = p.gruposModificadores.flatMap((g) => g.modificadores)
    expect(mods.find((m) => m.id === 'mo20')!.efectos).toBeUndefined()
    await expect(
      recetasService.guardarModificadores(
        'p6',
        { mo7: [{ insumoId: 'i11', cantidad: 1, unidad: 'g', efecto: 'suma' }] },
        [],
      ),
    ).rejects.toBeTruthy()
  })

  it('un insumo usado en un modificador no se elimina', async () => {
    await expect(inventarioService.eliminarInsumo('i11')).rejects.toBeTruthy()
  })
})
