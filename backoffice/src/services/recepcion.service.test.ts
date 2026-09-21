import { beforeEach, describe, expect, it } from 'vitest'
import { stockDetalleService, transformacionesService } from './abastecimiento.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'
import { partesService, vencimientoPropuesto } from './partes.service'
import { recepcionService } from './recepcion.service'

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
        { localId: 'l1', requerimientoId: 'rq3', zonaId: 'zn2', lineas: [lineaLenguado()] },
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

  it('no recibe más de lo pendiente y al completar queda recepcionado', async () => {
    const todas = recepcionService.preparar('rq3', 'zn1')
    const demasiado = todas.map((l) => ({ ...l, cantidadCompra: (l.cantidadCompra ?? 0) + 1 }))
    await expect(
      recepcionService.recibir(
        { localId: 'l1', requerimientoId: 'rq3', zonaId: 'zn1', lineas: demasiado },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('no se puede recibir más') })

    await recepcionService.recibir(
      { localId: 'l1', requerimientoId: 'rq3', zonaId: 'zn1', lineas: todas },
      ADMIN,
    )
    expect(db.requerimientos.find((r) => r.id === 'rq3')?.estado).toBe('recepcionado')
  })

  it('solo registra en zonas que el usuario gestiona según el ERP', async () => {
    await expect(
      recepcionService.recibir(
        { localId: 'l1', requerimientoId: 'rq3', zonaId: 'zn3', lineas: [lineaLenguado()] },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('No tienes permiso') })
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
