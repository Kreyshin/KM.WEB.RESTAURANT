import { beforeEach, describe, expect, it } from 'vitest'
import { auditoriaService } from './auditoria.service'
import { comprobantesService } from './comprobantes.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'
import { ventasService } from './ventas.service'

/**
 * F8 · Comprobantes (D-013): la factura exige RUC, la boleta pide documento por
 * encima del límite, el envío tiene estados de verdad y anular es emitir una
 * nota de crédito, nunca borrar.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'
const MESERO = 'u2'
const CAJERO = 'u4'

/** Cobra la cuenta de ejemplo y devuelve su venta. */
async function cobrar(id = 'pd1') {
  const pedido = db.pedidos.find((p) => p.id === id)!
  if (pedido.lineas.some((l) => l.estado === 'pendiente')) await ventasService.comandar(id, MESERO)
  const cuenta = await ventasService.precuenta(id)
  return ventasService.cobrar(
    id,
    { pagos: [{ medioPagoId: 'mp1', nombre: '', monto: cuenta.total }] },
    CAJERO,
  )
}

const RUC_VALIDO = '20100070970'

describe('emisión', () => {
  it('la venta cobrada aparece como pendiente de comprobante', async () => {
    const venta = await cobrar()
    const pendientes = await comprobantesService.ventasSinComprobante('l1')
    expect(pendientes.map((v) => v.id)).toContain(venta.id)
  })

  it('emite boleta con la serie del local y queda por enviar', async () => {
    const venta = await cobrar()
    const boleta = await comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN)
    expect(boleta.serie).toBe('B001')
    expect(boleta.numero).toBe(18343)
    expect(boleta.estado).toBe('porEnviar')
    // Los importes se congelan como se cobraron.
    expect(boleta.totales.total).toBe(venta.totales.total)
  })

  it('no emite dos comprobantes de la misma venta', async () => {
    const venta = await cobrar()
    await comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN)
    await expect(
      comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('ya tiene boleta') })
  })

  it('la factura exige RUC válido, razón social y dirección', async () => {
    const venta = await cobrar()
    await expect(
      comprobantesService.emitir({ ventaId: venta.id, tipo: 'factura' }, ADMIN),
    ).rejects.toMatchObject({ campos: { documento: 'Requerido' } })

    await expect(
      comprobantesService.emitir(
        {
          ventaId: venta.id,
          tipo: 'factura',
          receptor: { tipoDocumento: 'ruc', documento: '20100070979', nombre: 'X', direccion: 'Y' },
        },
        ADMIN,
      ),
    ).rejects.toMatchObject({ campos: { documento: 'Revisa los 11 dígitos' } })

    const factura = await comprobantesService.emitir(
      {
        ventaId: venta.id,
        tipo: 'factura',
        receptor: {
          tipoDocumento: 'ruc',
          documento: RUC_VALIDO,
          nombre: 'Karma Corp S.A.C.',
          direccion: 'Av. Javier Prado 1234',
        },
      },
      ADMIN,
    )
    expect(factura.serie).toBe('F001')
  })

  it('la boleta pide documento por encima del límite configurado', async () => {
    const venta = await cobrar()
    // El límite baja por debajo de la cuenta: ahora hace falta el documento.
    await parametrosService.guardarValor('comprobantes.limiteBoletaSinDni', 50, 'l1')
    await expect(
      comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN),
    ).rejects.toMatchObject({ campos: { documento: 'Falta el documento' } })

    const boleta = await comprobantesService.emitir(
      {
        ventaId: venta.id,
        tipo: 'boleta',
        receptor: { tipoDocumento: 'dni', documento: '44556677', nombre: 'Carla Benavides' },
      },
      ADMIN,
    )
    expect(boleta.receptor.documento).toBe('44556677')
  })

  it('sin serie activa del tipo, avisa en vez de inventarla', async () => {
    const venta = await cobrar()
    // Se desactiva la serie de boletas del local: no hay con qué numerarla.
    db.series = db.series.filter((s) => !(s.localId === 'l1' && s.tipo === 'boleta'))
    await expect(
      comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('no tiene serie activa') })
  })

  it('pide permiso para emitir', async () => {
    const venta = await cobrar()
    await expect(
      comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, MESERO),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('permiso') })
  })
})

describe('envío', () => {
  it('acepta un comprobante correcto y guarda su constancia', async () => {
    const venta = await cobrar()
    const boleta = await comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN)
    const enviado = await comprobantesService.enviar(boleta.id, ADMIN)
    expect(enviado.estado).toBe('aceptado')
    expect(enviado.respuesta?.cdr).toBe(`R-${boleta.serie}-${boleta.numero}`)
    expect(enviado.intentos).toBe(1)
  })

  it('un aceptado no se reenvía', async () => {
    const venta = await cobrar()
    const boleta = await comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN)
    await comprobantesService.enviar(boleta.id, ADMIN)
    await expect(comprobantesService.enviar(boleta.id, ADMIN)).rejects.toMatchObject({
      mensaje: expect.stringContaining('ya fue aceptado'),
    })
  })

  it('un rechazo se corrige y se reintenta, contando los intentos', async () => {
    const venta = await cobrar()
    const factura = await comprobantesService.emitir(
      {
        ventaId: venta.id,
        tipo: 'factura',
        receptor: {
          tipoDocumento: 'ruc',
          documento: RUC_VALIDO,
          nombre: 'Karma Corp S.A.C.',
          direccion: 'Av. Javier Prado 1234',
        },
      },
      ADMIN,
    )
    // El RUC se estropea después de emitir: es el caso que rechaza el OSE.
    db.comprobantes.find((c) => c.id === factura.id)!.receptor.documento = '20100070979'
    const rechazado = await comprobantesService.enviar(factura.id, ADMIN)
    expect(rechazado.estado).toBe('rechazado')
    expect(rechazado.respuesta?.codigo).toBe('2017')

    const corregido = await comprobantesService.corregirReceptor(
      factura.id,
      {
        tipoDocumento: 'ruc',
        documento: RUC_VALIDO,
        nombre: 'Karma Corp S.A.C.',
        direccion: 'Av. Javier Prado 1234',
      },
      ADMIN,
    )
    expect(corregido.estado).toBe('porEnviar')
    const reenviado = await comprobantesService.enviar(factura.id, ADMIN)
    expect(reenviado.estado).toBe('aceptado')
    expect(reenviado.intentos).toBe(2)

    const bitacora = await auditoriaService.listar({ modulo: 'Comprobantes' })
    expect(bitacora.some((b) => b.accion === 'Envío rechazado')).toBe(true)
  })
})

describe('notas de crédito', () => {
  async function boletaAceptada() {
    const venta = await cobrar()
    const boleta = await comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN)
    await comprobantesService.enviar(boleta.id, ADMIN)
    return { venta, boleta }
  }

  it('solo sobre un comprobante aceptado', async () => {
    const venta = await cobrar()
    const boleta = await comprobantesService.emitir({ ventaId: venta.id, tipo: 'boleta' }, ADMIN)
    await expect(
      comprobantesService.emitirNotaCredito(boleta.id, { motivo: 'anulacion' }, ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('aceptado') })
  })

  it('la total anula la venta y devuelve lo consumido al almacén', async () => {
    const insumo = db.insumos.find((i) => i.id === 'i2')!
    const antes = insumo.stock
    const { venta, boleta } = await boletaAceptada()
    expect(db.insumos.find((i) => i.id === 'i2')!.stock).toBeLessThan(antes)

    const nota = await comprobantesService.emitirNotaCredito(
      boleta.id,
      { motivo: 'anulacion', detalle: 'El cliente se retractó' },
      ADMIN,
    )
    expect(nota.tipo).toBe('notaCredito')
    expect(nota.serie).toBe('BC01')
    expect(nota.totales.total).toBe(boleta.totales.total)
    expect(db.ventas.find((v) => v.id === venta.id)?.estado).toBe('anulada')
    expect(db.insumos.find((i) => i.id === 'i2')!.stock).toBeCloseTo(antes, 3)
  })

  it('la parcial rebaja solo lo indicado y deja la venta en pie', async () => {
    const { venta, boleta } = await boletaAceptada()
    const nota = await comprobantesService.emitirNotaCredito(
      boleta.id,
      { motivo: 'descuento', montoParcial: 20 },
      ADMIN,
    )
    expect(nota.totales.total).toBe(20)
    expect(nota.totales.igv).toBeLessThan(boleta.totales.igv)
    expect(db.ventas.find((v) => v.id === venta.id)?.estado).toBe('cobrada')
  })

  it('no admite un monto parcial mayor que el comprobante', async () => {
    const { boleta } = await boletaAceptada()
    await expect(
      comprobantesService.emitirNotaCredito(
        boleta.id,
        { motivo: 'devolucion', montoParcial: boleta.totales.total + 1 },
        ADMIN,
      ),
    ).rejects.toMatchObject({ campos: { montoParcial: expect.any(String) } })
  })

  it('no emite dos notas sobre el mismo comprobante', async () => {
    const { boleta } = await boletaAceptada()
    await comprobantesService.emitirNotaCredito(boleta.id, { motivo: 'anulacion' }, ADMIN)
    await expect(
      comprobantesService.emitirNotaCredito(boleta.id, { motivo: 'anulacion' }, ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('ya tiene la nota de crédito') })
  })

  it('pide permiso propio, distinto del de emitir', async () => {
    const { boleta } = await boletaAceptada()
    await expect(
      comprobantesService.emitirNotaCredito(boleta.id, { motivo: 'anulacion' }, CAJERO),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('permiso') })
  })
})
