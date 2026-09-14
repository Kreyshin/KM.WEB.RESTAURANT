import { beforeEach, describe, expect, it } from 'vitest'
import { transformacionesService } from './abastecimiento.service'
import { combosService, precioSueltos } from './combos.service'
import { inventarioService } from './inventario.service'
import { mesasService } from './mesas.service'
import { db, reiniciarMock } from './mock/db'

/**
 * Reglas de F3 y F4 donde un error cuesta dinero o descuadra el stock:
 * existencias por almacén, costo promedio, traslados, transformaciones y combos.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const insumo = (id: string) => db.insumos.find((i) => i.id === id)!
const enAlmacen = (id: string, almacenId: string) =>
  insumo(id).existencias.find((e) => e.almacenId === almacenId)?.cantidad ?? 0

describe('existencias por almacén', () => {
  it('el stock total es la suma de los almacenes', async () => {
    await inventarioService.registrarMovimiento({
      insumoId: 'i8',
      almacenId: 'al4',
      tipo: 'entrada',
      cantidad: 10,
      usuarioId: 'u1',
    })
    const i = insumo('i8')
    expect(i.stock).toBeCloseTo(i.existencias.reduce((t, e) => t + e.cantidad, 0))
  })

  it('no deja salir más de lo que hay en ese almacén aunque el total alcance', async () => {
    const enSanIsidro = enAlmacen('i8', 'al4')
    await expect(
      inventarioService.registrarMovimiento({
        insumoId: 'i8',
        almacenId: 'al4',
        tipo: 'salida',
        cantidad: enSanIsidro + 1,
        usuarioId: 'u1',
      }),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('Almacén San Isidro') })
  })

  it('una entrada con costo recalcula el costo promedio ponderado', async () => {
    const antes = insumo('i1')
    const [stock, costo] = [antes.stock, antes.costoUnitario]
    await inventarioService.registrarMovimiento({
      insumoId: 'i1',
      almacenId: 'al2',
      tipo: 'entrada',
      cantidad: 10,
      costoUnitario: 60,
      usuarioId: 'u1',
    })
    const esperado = Math.round(((stock * costo + 10 * 60) / (stock + 10)) * 100) / 100
    expect(insumo('i1').costoUnitario).toBe(esperado)
  })
})

describe('traslados', () => {
  it('mueve stock entre almacenes sin cambiar el total', async () => {
    const total = insumo('i8').stock
    const [origen, destino] = [enAlmacen('i8', 'al4'), enAlmacen('i8', 'al1')]
    await inventarioService.trasladar({
      insumoId: 'i8',
      origenId: 'al4',
      destinoId: 'al1',
      cantidad: 5,
      usuarioId: 'u1',
    })
    expect(insumo('i8').stock).toBe(total)
    expect(enAlmacen('i8', 'al4')).toBeCloseTo(origen - 5)
    expect(enAlmacen('i8', 'al1')).toBeCloseTo(destino + 5)
  })

  it('si falla no deja nada a medias', async () => {
    const movimientos = db.movimientos.length
    await expect(
      inventarioService.trasladar({
        insumoId: 'i8',
        origenId: 'al4',
        destinoId: 'al1',
        cantidad: 9999,
        usuarioId: 'u1',
      }),
    ).rejects.toBeTruthy()
    expect(db.movimientos).toHaveLength(movimientos)
  })

  it('rechaza el mismo almacén como origen y destino', async () => {
    await expect(
      inventarioService.trasladar({
        insumoId: 'i8',
        origenId: 'al1',
        destinoId: 'al1',
        cantidad: 1,
        usuarioId: 'u1',
      }),
    ).rejects.toMatchObject({ campos: { destinoId: expect.any(String) } })
  })
})

describe('transformaciones y recetas', () => {
  it('el costo de una salida sale de las entradas, su reparto y su cantidad', async () => {
    await transformacionesService.actualizar('tf2', {
      entradas: [{ insumoId: 'i6', cantidad: 1 }],
      salidas: [{ id: 'tf2-s1', tipo: 'insumo', insumoId: 'i16', cantidad: 2, reparto: 100 }],
    })
    expect(insumo('i16').costoUnitario).toBe(
      Math.round((insumo('i6').costoUnitario / 2) * 100) / 100,
    )
  })

  it('un insumo no puede entrar y salir de la misma transformación', async () => {
    await expect(
      transformacionesService.actualizar('tf2', {
        entradas: [{ insumoId: 'i16', cantidad: 1 }],
      }),
    ).rejects.toBeTruthy()
  })

  it('el reparto del costo entre las salidas debe sumar 100 %', async () => {
    await expect(
      transformacionesService.actualizar('tf1', {
        salidas: [
          { id: 'tf1-s1', tipo: 'insumo', insumoId: 'i17', cantidad: 6, reparto: 50 },
          { id: 'tf1-s2', tipo: 'insumo', insumoId: 'i18', cantidad: 1.5, reparto: 20 },
        ],
      }),
    ).rejects.toMatchObject({ campos: { salidas: expect.any(String) } })
  })

  it('producir descuenta las entradas y suma lo producido en el mismo almacén', async () => {
    await transformacionesService.actualizar('tf2', {
      entradas: [{ insumoId: 'i2', cantidad: 0.5 }],
      salidas: [{ id: 'tf2-s1', tipo: 'insumo', insumoId: 'i16', cantidad: 1, reparto: 100 }],
    })
    const [pescado, leche] = [enAlmacen('i2', 'al2'), enAlmacen('i16', 'al2')]
    await inventarioService.producir({
      insumoId: 'i16',
      almacenId: 'al2',
      cantidad: 2,
      usuarioId: 'u1',
    })
    expect(enAlmacen('i2', 'al2')).toBeCloseTo(pescado - 1)
    expect(enAlmacen('i16', 'al2')).toBeCloseTo(leche + 2)
  })

  it('un despiece reparte el costo entre sus salidas y la merma lo encarece', async () => {
    // 10 kg de lenguado → 6 kg de filete (88 %) + 1.5 kg de espinazo (12 %) + 2.5 de merma.
    const entrada = insumo('i2').costoUnitario * 10
    expect(insumo('i17').costoUnitario).toBe(Math.round(((entrada * 0.88) / 6) * 100) / 100)
    expect(insumo('i18').costoUnitario).toBe(Math.round(((entrada * 0.12) / 1.5) * 100) / 100)
    // Lo que se pierde en la merma lo pagan las salidas: el filete cuesta más que el pescado entero.
    expect(insumo('i17').costoUnitario).toBeGreaterThan(insumo('i2').costoUnitario)
  })

  it('la transformación consume las entradas y da de alta todas las salidas', async () => {
    const antes = {
      pescado: enAlmacen('i2', 'al2'),
      filete: enAlmacen('i17', 'al2'),
      espinazo: enAlmacen('i18', 'al2'),
    }
    await inventarioService.transformar({
      transformacionId: 'tf1',
      almacenId: 'al2',
      veces: 0.5,
      usuarioId: 'u1',
    })
    expect(enAlmacen('i2', 'al2')).toBeCloseTo(antes.pescado - 5)
    expect(enAlmacen('i17', 'al2')).toBeCloseTo(antes.filete + 3)
    expect(enAlmacen('i18', 'al2')).toBeCloseTo(antes.espinazo + 0.75)
  })
})

describe('carta: combos y mesas unidas', () => {
  it('el precio suelto suma la opción más barata de cada parte', () => {
    // Menú ejecutivo: causa 24 (vs anticuchos 28) + ají de gallina 38 + chicha 12
    expect(precioSueltos(db.combos.find((c) => c.id === 'cb1')!)).toBe(74)
  })

  it('un combo necesita partes con productos y el menú del día, días', async () => {
    await expect(
      combosService.crear({
        tipo: 'combo',
        nombre: 'Vacío',
        precio: 10,
        grupos: [],
        dias: [],
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { grupos: expect.any(String) } })
    await expect(
      combosService.crear({
        tipo: 'menuDia',
        nombre: 'Menú sin días',
        precio: 10,
        grupos: [{ id: 'g', nombre: 'Fondo', opciones: ['p6'] }],
        dias: [],
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { dias: expect.any(String) } })
  })

  it('une mesas del mismo salón y no de salones distintos', async () => {
    await mesasService.unir(['m1', 'm2'])
    expect(db.mesas.find((m) => m.id === 'm1')!.grupoId).toBe(
      db.mesas.find((m) => m.id === 'm2')!.grupoId,
    )
    await expect(mesasService.unir(['m3', 'm7'])).rejects.toBeTruthy()
    await expect(mesasService.unir(['m1', 'm3'])).rejects.toBeTruthy()
  })

  it('no separa una unión con la cuenta abierta', async () => {
    const [m] = await mesasService.unir(['m1', 'm2'])
    db.mesas.find((x) => x.id === 'm1')!.estado = 'ocupada'
    await expect(mesasService.separar(m!.grupoId!)).rejects.toBeTruthy()
  })
})
