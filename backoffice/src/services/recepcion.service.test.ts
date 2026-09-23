import { beforeEach, describe, expect, it } from 'vitest'
import { stockDetalleService, transformacionesService } from './abastecimiento.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'
import { partesService, vencimientoPropuesto } from './partes.service'
import { modosDeOc, recepcionService } from './recepcion.service'

/**
 * Reglas de F4.5 donde un error descuadra el stock o el costo: cuánto se
 * recibe contra la OC, qué se exige según los parámetros del insumo, el
 * ingreso sin OC configurable y la parte de producción simple y detallada.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'
const stock = (insumoId: string, zonaId: string) =>
  db.insumos.find((i) => i.id === insumoId)!.existencias.find((e) => e.zonaId === zonaId)
    ?.cantidad ?? 0

/** Recepción del lenguado del REQ-000003 en la cámara de frío. */
function lineaLenguado(extra: Record<string, unknown> = {}) {
  const [linea] = recepcionService.preparar('rq3', 'zn2').filter((l) => l.insumoId === 'i2')
  return { ...linea!, partes: [{ ...linea!.partes[0]!, ...extra }] }
}

describe('recepción contra OC', () => {
  it('propone lo pendiente con su modo, costo por unidad del insumo y si queda por procesar', () => {
    const lenguado = lineaLenguado()
    expect(lenguado.cantidadCompra).toBe(12)
    expect(lenguado.modo).toBe('detalle')
    expect(lenguado.costoUnitario).toBe(38)
    expect(lenguado.porProcesar).toBe(true)
  })

  it('exige lote y vencimiento cuando el insumo los controla en esa zona', async () => {
    await expect(
      recepcionService.recibir(
        {
          localId: 'l1',
          requerimientoId: 'rq3',
          zonaId: 'zn2',
          modo: 'detalle',
          lineas: [lineaLenguado()],
        },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('controla lote') })
  })

  it('recibe parcial: entra el stock con su detalle y el requerimiento sigue abierto', async () => {
    const antes = stock('i2', 'zn2')
    const rec = await recepcionService.recibir(
      {
        localId: 'l1',
        requerimientoId: 'rq3',
        zonaId: 'zn2',
        modo: 'detalle',
        lineas: [lineaLenguado({ loteCodigo: 'LEN-NUEVO', vencimiento: '2099-01-01' })],
      },
      ADMIN,
    )
    expect(stock('i2', 'zn2')).toBeCloseTo(antes + 12)
    expect(await stockDetalleService.descuadres()).toEqual([])
    expect(db.lotes.find((l) => l.codigo === 'LEN-NUEVO')?.origen).toBe('compra')
    expect(db.porProcesar.some((p) => p.recepcionId === rec.id && p.pendiente === 12)).toBe(true)
    const req = db.requerimientos.find((r) => r.id === 'rq3')!
    expect(req.estado).toBe('despachado')
    expect(req.lineas.find((l) => l.id === 'rq3-1')?.cantidadRecibida).toBe(12)
  })

  it('total es todo o nada: no admite cantidades distintas y al completar queda recepcionado', async () => {
    const todas = recepcionService.preparar('rq3', 'zn1')
    const demasiado = todas.map((l) => ({ ...l, cantidadCompra: (l.cantidadCompra ?? 0) + 1 }))
    await expect(
      recepcionService.recibir(
        { localId: 'l1', requerimientoId: 'rq3', zonaId: 'zn1', modo: 'total', lineas: demasiado },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('todo o nada') })

    await recepcionService.recibir(
      { localId: 'l1', requerimientoId: 'rq3', zonaId: 'zn1', modo: 'total', lineas: todas },
      ADMIN,
    )
    expect(db.requerimientos.find((r) => r.id === 'rq3')?.estado).toBe('recepcionado')
  })

  it('solo registra en zonas que el usuario gestiona según el ERP', async () => {
    await expect(
      recepcionService.recibir(
        {
          localId: 'l1',
          requerimientoId: 'rq3',
          zonaId: 'zn3',
          modo: 'detalle',
          lineas: [lineaLenguado()],
        },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('No tienes permiso') })
  })
})

describe('modos de recepción y serie', () => {
  it('el modo es de toda la OC: detalle si un insumo lo exige, elegible si todos admiten ambos', () => {
    expect(modosDeOc('rq1', 'zn1').opciones).toEqual(['total'])
    expect(modosDeOc('rq6', 'zn1')).toMatchObject({
      opciones: ['detalle'],
      exigidoPor: 'Whisky Black Label 750 ml',
    })
    expect(modosDeOc('rq5', 'zn2').opciones).toEqual(['total', 'detalle'])
  })

  it('no acepta un modo que la OC no admite en esa zona', async () => {
    await expect(
      recepcionService.recibir(
        {
          localId: 'l1',
          requerimientoId: 'rq1',
          zonaId: 'zn1',
          modo: 'detalle',
          lineas: recepcionService.preparar('rq1', 'zn1', 'detalle'),
        },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('no se puede recibir a detalle') })
  })

  it('total tampoco admite dejar líneas fuera', async () => {
    const [primera] = recepcionService.preparar('rq8', 'zn1', 'total')
    await expect(
      recepcionService.recibir(
        { localId: 'l1', requerimientoId: 'rq8', zonaId: 'zn1', modo: 'total', lineas: [primera!] },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('todo o nada') })
  })

  it('rechazar una entrega total no mueve stock y la OC sigue pendiente', async () => {
    const antes = stock('i8', 'zn1')
    await expect(
      recepcionService.rechazar(
        { localId: 'l1', requerimientoId: 'rq1', zonaId: 'zn1', motivo: ' ' },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('por qué') })
    const rec = await recepcionService.rechazar(
      { localId: 'l1', requerimientoId: 'rq1', zonaId: 'zn1', motivo: 'Arroz mojado' },
      ADMIN,
    )
    expect(rec.estado).toBe('rechazada')
    expect(stock('i8', 'zn1')).toBe(antes)
    expect(db.requerimientos.find((r) => r.id === 'rq1')?.estado).toBe('convertido')
    expect(
      (await recepcionService.porRecibir('l1')).some((x) => x.requerimiento.id === 'rq1'),
    ).toBe(true)
  })

  it('en total con serie exige una serie por unidad, sin repetir ni reutilizar', async () => {
    const lineas = () => recepcionService.preparar('rq4', 'zn1', 'total')
    const datos = (series: string[]) => ({
      localId: 'l1',
      requerimientoId: 'rq4',
      zonaId: 'zn1',
      modo: 'total' as const,
      lineas: lineas().map((l) => ({ ...l, partes: [{ ...l.partes[0]!, series }] })),
    })
    expect(lineas()[0]!.partes[0]!.series).toHaveLength(4)
    await expect(
      recepcionService.recibir(datos(['G1', 'G2', '', '']), ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('faltan 2 de 4') })
    await expect(
      recepcionService.recibir(datos(['G1', 'G2', 'G3', 'g1']), ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('repetida') })
    const rec = await recepcionService.recibir(datos(['G1', 'G2', 'G3', 'G4']), ADMIN)
    expect(rec.modo).toBe('total')
    expect(db.requerimientos.find((r) => r.id === 'rq4')?.estado).toBe('recepcionado')
  })

  it('a detalle se recibe menos de lo pedido y guarda lo esperado para ver el faltante', async () => {
    const lineas = recepcionService.preparar('rq6', 'zn1', 'detalle').map((l) =>
      l.insumoId === 'i42'
        ? {
            ...l,
            cantidadCompra: 1,
            partes: [
              { cantidad: 6, ubicacionId: 'ub7', series: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'] },
            ],
          }
        : { ...l, cantidadCompra: 0 },
    )
    const rec = await recepcionService.recibir(
      { localId: 'l1', requerimientoId: 'rq6', zonaId: 'zn1', modo: 'detalle', lineas },
      ADMIN,
    )
    expect(rec.lineas).toHaveLength(1)
    expect(rec.lineas[0]).toMatchObject({ cantidadCompra: 1, cantidadEsperada: 2 })
    const req = db.requerimientos.find((r) => r.id === 'rq6')!
    expect(req.estado).toBe('despachado')
    expect(await stockDetalleService.descuadres()).toEqual([])
  })
})

describe('ingreso sin OC', () => {
  const datos = (monto: number) => ({
    localId: 'l1',
    zonaId: 'zn1',
    motivo: 'Faltó cebolla',
    comprobante: {
      tipo: 'boleta' as const,
      serie: 'B001',
      numero: '1',
      monto,
      proveedorOcasional: 'Mercado',
    },
    lineas: [
      {
        id: '',
        insumoId: 'i5',
        factor: 1,
        costoUnitario: 2.5,
        modo: 'total' as const,
        partes: [{ cantidad: 10 }],
        porProcesar: false,
      },
    ],
  })

  it('está apagado por defecto y respeta el tope del local', async () => {
    await expect(recepcionService.ingresoSinOc(datos(25), ADMIN)).rejects.toMatchObject({
      mensaje: expect.stringContaining('no permite'),
    })
    await parametrosService.guardarValor('recepcion.sinOc.permitido', true, 'l1')
    await expect(recepcionService.ingresoSinOc(datos(900), ADMIN)).rejects.toMatchObject({
      mensaje: expect.stringContaining('tope'),
    })
    const rec = await recepcionService.ingresoSinOc(datos(25), ADMIN)
    expect(rec.estado).toBe('pendienteRegularizar')
    expect((await recepcionService.regularizar(rec.id, ADMIN)).estado).toBe('regularizada')
  })
})

describe('parte de producción', () => {
  const despiece = (factor = 1) => {
    const { entradas, salidas } = partesService.escalar('tf1', factor)
    return {
      localId: 'l1',
      zonaId: 'zn2',
      transformacionId: 'tf1',
      factor,
      entradas,
      salidas,
      vencimiento: vencimientoPropuesto('tf1'),
    }
  }

  it('en modo simple aplica lo esperado, consume por FEFO y descuenta lo por procesar', async () => {
    const lenguado = stock('i2', 'zn2')
    const filete = stock('i17', 'zn2')
    const parte = await partesService.terminar(despiece(), ADMIN)
    expect(parte.estado).toBe('terminada')
    expect(stock('i2', 'zn2')).toBeCloseTo(lenguado - 10)
    expect(stock('i17', 'zn2')).toBeCloseTo(filete + 6)
    expect(db.lotes.find((l) => l.codigo === parte.numero)?.origen).toBe('produccion')
    expect(db.porProcesar.find((p) => p.id === 'pp1')?.pendiente).toBe(0)
    expect(await stockDetalleService.descuadres()).toEqual([])
  })

  it('en modo detallado la diferencia se explica o no se cierra', async () => {
    await parametrosService.guardarValor('produccion.modo', 'detallado', 'l1')
    const datos = despiece()
    datos.salidas = datos.salidas.map((s) =>
      s.tipo === 'insumo' && s.insumoId === 'i17' ? { ...s, real: 5.5 } : s,
    )
    await expect(partesService.terminar(datos, ADMIN)).rejects.toMatchObject({
      mensaje: expect.stringContaining('por explicar'),
    })
    const parte = await partesService.terminar({ ...datos, motivoDiferencia: 'Filete roto' }, ADMIN)
    expect(parte.mermaAdicional).toBe(0.5)
  })

  it('rechazar consume las entradas y no produce nada', async () => {
    const filete = stock('i17', 'zn2')
    const parte = await partesService.rechazar(despiece(0.5), 'Pescado en mal estado', ADMIN)
    expect(parte.estado).toBe('rechazada')
    expect(stock('i17', 'zn2')).toBe(filete)
  })
})

describe('transformaciones sin ciclos', () => {
  it('no deja que una salida vuelva a ser entrada de su propia cadena', async () => {
    await expect(
      transformacionesService.crear({
        nombre: 'Rearmar pescado',
        entradas: [{ insumoId: 'i17', cantidad: 1 }],
        salidas: [{ id: 's', tipo: 'insumo', insumoId: 'i2', cantidad: 1, reparto: 100 }],
        activo: true,
      }),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('ciclo') })
  })
})
