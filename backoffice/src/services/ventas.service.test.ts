import { beforeEach, describe, expect, it } from 'vitest'
import { auditoriaService } from './auditoria.service'
import { cajaService } from './caja.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'
import { ventasService } from './ventas.service'

/**
 * F7 · Ventas y caja (D-012), línea base estándar: la cuenta vive antes del
 * cobro, la línea comandada no se borra —se anula con motivo—, se comanda por
 * área, y la caja se abre con fondo y se cierra contando.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'
const MESERO = 'u2'
const CAJERO = 'u4'

describe('la cuenta antes del cobro', () => {
  it('abre una cuenta en mesa y la ocupa', async () => {
    const pedido = await ventasService.abrir(
      { localId: 'l1', canalId: 'cv1', mesaIds: ['m3'], comensales: 2 },
      MESERO,
    )
    expect(pedido.atencion).toBe('mesa')
    expect(db.mesas.find((m) => m.id === 'm3')?.estado).toBe('ocupada')
  })

  it('no abre dos cuentas en la misma mesa', async () => {
    await expect(
      ventasService.abrir({ localId: 'l1', canalId: 'cv1', mesaIds: ['m1'] }, MESERO),
    ).rejects.toMatchObject({ campos: { mesaIds: 'Mesa ocupada' } })
  })

  it('el delivery exige distrito, porque de ahí sale el envío', async () => {
    await expect(
      ventasService.abrir({ localId: 'l1', canalId: 'cv3' }, CAJERO),
    ).rejects.toMatchObject({ campos: { distrito: 'Requerido' } })
  })

  it('toma el precio de la lista vigente y suma el recargo del modificador', async () => {
    const pedido = await ventasService.agregarLinea(
      'pd2',
      { vendibleId: 'p:p6', cantidad: 1, modificadorIds: ['mo7'] },
      CAJERO,
    )
    const linea = pedido.lineas.at(-1)!
    expect(linea.precioUnitario).toBeGreaterThan(0)
    expect(linea.recargoModificadores).toBe(5)
    expect(linea.estado).toBe('pendiente')
  })

  it('quitar una línea pendiente es gratis', async () => {
    const pedido = await ventasService.quitarLinea('pd1', 'lp3', MESERO)
    expect(pedido.lineas.some((l) => l.id === 'lp3')).toBe(false)
  })

  it('quitar una comandada exige motivo y permiso, y la deja anulada', async () => {
    // El mesero no anula lo que ya está en cocina.
    await expect(ventasService.quitarLinea('pd1', 'lp1', MESERO, 'Se cayó')).rejects.toMatchObject({
      mensaje: expect.stringContaining('permiso'),
    })

    await expect(ventasService.quitarLinea('pd1', 'lp1', ADMIN)).rejects.toMatchObject({
      campos: { motivo: 'Requerido' },
    })

    const pedido = await ventasService.quitarLinea('pd1', 'lp1', ADMIN, 'Al cliente no le gustó')
    const linea = pedido.lineas.find((l) => l.id === 'lp1')!
    expect(linea.estado).toBe('anulada')
    expect(linea.motivoAnulacion).toBe('Al cliente no le gustó')

    const bitacora = await auditoriaService.listar({ modulo: 'Ventas' })
    expect(bitacora[0].accion).toBe('Producto anulado tras comandar')
  })
})

describe('comandar por área', () => {
  it('agrupa lo pendiente por el área que le toca', async () => {
    await ventasService.agregarLinea('pd1', { vendibleId: 'p:p7', cantidad: 1 }, MESERO)
    const comandas = await ventasService.comandar('pd1', MESERO)
    const areas = comandas.map((c) => c.areaNombre).sort()
    // La chicha va a Barra y el ají de gallina a Cocina caliente.
    expect(areas).toEqual(['Barra', 'Cocina caliente'])
    expect(comandas.every((c) => c.estado === 'enviada')).toBe(true)
    // Cada comanda se canta por su número: no pueden repetirse.
    expect(new Set(comandas.map((c) => c.numero)).size).toBe(comandas.length)
    expect(Math.min(...comandas.map((c) => c.numero))).toBe(514)
  })

  it('una línea no se comanda dos veces', async () => {
    await ventasService.comandar('pd1', MESERO)
    await expect(ventasService.comandar('pd1', MESERO)).rejects.toMatchObject({
      mensaje: expect.stringContaining('No hay nada pendiente'),
    })
  })

  it('avisa si un producto no tiene área que lo prepare', async () => {
    // La Barra deja de recibir comandas: las bebidas se quedan sin quien las sirva.
    db.areas.find((a) => a.id === 'ae3')!.recibeComandas = false
    await expect(ventasService.comandar('pd1', MESERO)).rejects.toMatchObject({
      mensaje: expect.stringContaining('Sin área que lo prepare: Chicha morada'),
    })
  })
})

describe('precuenta', () => {
  it('encadena promociones y recargo al consumo sobre el consumo ya rebajado', async () => {
    const cuenta = await ventasService.precuenta('pd1')
    expect(cuenta.subtotal).toBeGreaterThan(0)
    const base = cuenta.subtotal - cuenta.descuentoPromociones
    expect(cuenta.recargoConsumo).toBeCloseTo((base * cuenta.recargoPorcentaje) / 100, 2)
    expect(cuenta.total).toBeCloseTo(base + cuenta.recargoConsumo, 2)
    // Los precios incluyen IGV: valor de venta más IGV dan el total.
    expect(cuenta.valorVenta + cuenta.igv).toBeCloseTo(cuenta.total, 2)
  })

  it('el delivery suma el envío de su zona y no le carga recargo al consumo', async () => {
    const cuenta = await ventasService.precuenta('pd2')
    expect(cuenta.costoEnvio).toBe(6)
    expect(cuenta.recargoConsumo).toBe(0)
    expect(cuenta.cobertura?.estado).toBe('cubierto')
  })
})

describe('gestos de sala', () => {
  it('mueve la cuenta de mesa y deja la anterior en limpieza', async () => {
    const pedido = await ventasService.transferirMesa('pd1', ['m3'], MESERO)
    expect(pedido.mesaIds).toEqual(['m3'])
    expect(db.mesas.find((m) => m.id === 'm3')?.estado).toBe('ocupada')
    expect(db.mesas.find((m) => m.id === 'm1')?.estado).toBe('limpieza')
  })

  it('no mueve una cuenta a una mesa que ya tiene cuenta', async () => {
    await ventasService.abrir({ localId: 'l1', canalId: 'cv1', mesaIds: ['m3'] }, MESERO)
    await expect(ventasService.transferirMesa('pd1', ['m3'], MESERO)).rejects.toMatchObject({
      campos: { mesaIds: 'Mesa ocupada' },
    })
  })

  it('divide la cuenta en una hija que se cobra aparte', async () => {
    const hija = await ventasService.dividir('pd1', ['lp3'], MESERO)
    const madre = await ventasService.obtener('pd1')
    expect(hija.divididoDe).toBe('pd1')
    expect(hija.lineas).toHaveLength(1)
    expect(madre.lineas.some((l) => l.id === 'lp3')).toBe(false)
    // La mesa se queda con la cuenta madre.
    expect(hija.mesaIds).toEqual([])
  })

  it('no divide llevándose todas las líneas', async () => {
    await expect(ventasService.dividir('pd2', ['lp4'], CAJERO)).rejects.toMatchObject({
      mensaje: expect.stringContaining('la misma cuenta'),
    })
  })
})

describe('cobro', () => {
  it('no cobra con productos sin comandar', async () => {
    await expect(
      ventasService.cobrar(
        'pd1',
        { pagos: [{ medioPagoId: 'mp1', nombre: '', monto: 500 }] },
        CAJERO,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('sin comandar') })
  })

  it('cobra con varios medios, calcula el vuelto y emite nota de venta', async () => {
    await ventasService.comandar('pd1', MESERO)
    const cuenta = await ventasService.precuenta('pd1')
    const venta = await ventasService.cobrar(
      'pd1',
      {
        pagos: [
          { medioPagoId: 'mp2', nombre: '', monto: 50, referencia: '004512' },
          { medioPagoId: 'mp1', nombre: '', monto: cuenta.total + 10 - 50 + 20 },
        ],
        propina: 10,
      },
      CAJERO,
    )
    expect(venta.comprobante.tipo).toBe('notaVenta')
    expect(venta.comprobante.serie).toBe('NV01')
    expect(venta.comprobante.numero).toBe(905)
    expect(venta.vuelto).toBe(20)
    expect(venta.propina).toBe(10)
    expect((await ventasService.obtener('pd1')).estado).toBe('cobrado')
    expect(db.mesas.find((m) => m.id === 'm1')?.estado).toBe('limpieza')
  })

  it('pide la referencia de los medios que la exigen', async () => {
    await ventasService.comandar('pd2', CAJERO).catch(() => {})
    const pedido = await ventasService.abrir(
      { localId: 'l1', canalId: 'cv2', nombreCliente: 'Mostrador' },
      CAJERO,
    )
    await ventasService.agregarLinea(pedido.id, { vendibleId: 'v:v3', cantidad: 1 }, CAJERO)
    await ventasService.comandar(pedido.id, CAJERO)
    await expect(
      ventasService.cobrar(
        pedido.id,
        { pagos: [{ medioPagoId: 'mp2', nombre: '', monto: 500 }] },
        CAJERO,
      ),
    ).rejects.toMatchObject({ campos: { pagos: 'Falta la referencia' } })
  })

  it('no deja pagar de menos', async () => {
    await ventasService.comandar('pd1', MESERO)
    await expect(
      ventasService.cobrar(
        'pd1',
        { pagos: [{ medioPagoId: 'mp1', nombre: '', monto: 5 }] },
        CAJERO,
      ),
    ).rejects.toMatchObject({ campos: { pagos: 'Pago incompleto' } })
  })

  it('sin caja abierta no se cobra, salvo que el local lo desactive', async () => {
    await ventasService.comandar('pd1', MESERO)
    const sesion = db.sesionesCaja[0]!
    await cajaService.cerrar(sesion.id, [], ADMIN)

    const pago = [{ medioPagoId: 'mp1', nombre: '', monto: 1000 }]
    await expect(ventasService.cobrar('pd1', { pagos: pago }, CAJERO)).rejects.toMatchObject({
      mensaje: expect.stringContaining('No hay caja abierta'),
    })

    await parametrosService.guardarValor('caja.exigirSesion', false, 'l1')
    const venta = await ventasService.cobrar('pd1', { pagos: pago }, CAJERO)
    expect(venta.estado).toBe('cobrada')
    expect(venta.sesionCajaId).toBeUndefined()
  })

  it('anular una venta pide motivo y deja rastro', async () => {
    await ventasService.comandar('pd1', MESERO)
    const cuenta = await ventasService.precuenta('pd1')
    const venta = await ventasService.cobrar(
      'pd1',
      { pagos: [{ medioPagoId: 'mp1', nombre: '', monto: cuenta.total }] },
      CAJERO,
    )
    await expect(ventasService.anularVenta(venta.id, '', ADMIN)).rejects.toMatchObject({
      campos: { motivo: 'Requerido' },
    })
    const anulada = await ventasService.anularVenta(venta.id, 'Cobrada dos veces', ADMIN)
    expect(anulada.estado).toBe('anulada')
    expect((await ventasService.obtener('pd1')).estado).toBe('anulado')
    const bitacora = await auditoriaService.listar({ modulo: 'Ventas' })
    expect(bitacora[0].detalle).toContain('Cobrada dos veces')
  })
})

describe('caja', () => {
  it('no abre dos cajas en el mismo local', async () => {
    await expect(cajaService.abrir('l1', 300, ADMIN)).rejects.toMatchObject({
      mensaje: expect.stringContaining('ya tiene una caja abierta'),
    })
  })

  it('el arqueo compara lo contado con lo esperado y guarda la diferencia', async () => {
    await ventasService.comandar('pd1', MESERO)
    const cuenta = await ventasService.precuenta('pd1')
    await ventasService.cobrar(
      'pd1',
      { pagos: [{ medioPagoId: 'mp1', nombre: '', monto: cuenta.total + 50 }], propina: 0 },
      CAJERO,
    )

    const sesion = db.sesionesCaja[0]!
    const resumen = await cajaService.resumen(sesion.id)
    expect(resumen.ventas).toBe(1)
    // Fondo 200 + lo cobrado en efectivo − el vuelto entregado.
    expect(resumen.efectivoEsperado).toBeCloseTo(200 + cuenta.total, 2)

    const cerrada = await cajaService.cerrar(
      sesion.id,
      [{ medioPagoId: 'mp1', monto: resumen.efectivoEsperado - 5 }],
      ADMIN,
      'Faltan 5 soles del cambio',
    )
    expect(cerrada.estado).toBe('cerrada')
    expect(cerrada.diferencia).toBeCloseTo(-5, 2)
    expect(cerrada.conteo?.find((c) => c.medioPagoId === 'mp1')?.esperado).toBeCloseTo(
      resumen.efectivoEsperado,
      2,
    )
  })

  it('el cierre ciego es la configuración por defecto', () => {
    expect(cajaService.cierreCiego('l1')).toBe(true)
  })
})
