import { beforeEach, describe, expect, it } from 'vitest'
import { auditoriaService } from './auditoria.service'
import { consumoService } from './consumo.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'
import { ventasService } from './ventas.service'

/**
 * Consumo de insumos por venta (F7 · D-007): la receta sale del almacén en el
 * momento que el local elija, la venta nunca se bloquea por stock y lo anulado
 * vuelve.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'
const MESERO = 'u2'
const CAJERO = 'u4'

const stockDe = (insumoId: string) => db.insumos.find((i) => i.id === insumoId)?.stock ?? 0

/** Un insumo que de verdad está en la receta de la cuenta de ejemplo. */
function insumoDeLaCuenta() {
  const pedido = db.pedidos.find((p) => p.id === 'pd1')!
  const consumo = consumoService.consumoPendiente(pedido)
  expect(consumo.length).toBeGreaterThan(0)
  return consumo[0]!
}

async function cobrarCuenta(id = 'pd1') {
  const pedido = db.pedidos.find((p) => p.id === id)!
  if (pedido.lineas.some((l) => l.estado === 'pendiente')) await ventasService.comandar(id, MESERO)
  const cuenta = await ventasService.precuenta(id)
  return ventasService.cobrar(
    id,
    { pagos: [{ medioPagoId: 'mp1', nombre: '', monto: cuenta.total }] },
    CAJERO,
  )
}

describe('qué consume una cuenta', () => {
  it('suma los insumos de las recetas de sus líneas', () => {
    const pedido = db.pedidos.find((p) => p.id === 'pd1')!
    const consumo = consumoService.consumoPendiente(pedido)
    // Dos cebiches personales: el pescado sale por los dos.
    const pescado = consumo.find((c) => c.nombre.toLowerCase().includes('lenguado'))
    expect(pescado?.cantidad).toBeGreaterThan(0)
  })

  it('dice qué productos no tienen receta, en vez de callarlo', () => {
    const pedido = db.pedidos.find((p) => p.id === 'pd1')!
    expect(Array.isArray(consumoService.sinReceta(pedido))).toBe(true)
  })
})

describe('cuándo sale del almacén', () => {
  it('por defecto, al cobrar', async () => {
    const objetivo = insumoDeLaCuenta()
    const antes = stockDe(objetivo.insumoId)

    await ventasService.comandar('pd1', MESERO)
    expect(stockDe(objetivo.insumoId)).toBe(antes)

    await cobrarCuenta()
    expect(stockDe(objetivo.insumoId)).toBeCloseTo(antes - objetivo.cantidad, 3)
  })

  it('configurado al comandar, sale cuando la cocina lo recibe', async () => {
    await parametrosService.guardarValor('ventas.descuentoStock', 'comandar', 'l1')
    const pedido = await ventasService.agregarLinea(
      'pd1',
      { vendibleId: 'v:v2', cantidad: 1 },
      MESERO,
    )
    const nueva = pedido.lineas.at(-1)!
    const objetivo = consumoService.consumoPendiente(pedido, [nueva])[0]!
    const antes = stockDe(objetivo.insumoId)

    await ventasService.comandar('pd1', MESERO)
    expect(stockDe(objetivo.insumoId)).toBeCloseTo(antes - objetivo.cantidad, 3)

    // Al cobrar sale el resto de la cuenta, pero lo ya comandado no sale dos
    // veces: el total descontado es el de la cuenta entera, ni más ni menos.
    const totalCuenta = consumoService
      .consumoPendiente(pedido)
      .find((c) => c.insumoId === objetivo.insumoId)!
    await cobrarCuenta()
    expect(stockDe(objetivo.insumoId)).toBeCloseTo(antes - totalCuenta.cantidad, 3)
  })

  it('apagado, la caja no toca el inventario', async () => {
    await parametrosService.guardarValor('ventas.descuentoStock', 'no', 'l1')
    const objetivo = insumoDeLaCuenta()
    const antes = stockDe(objetivo.insumoId)
    await cobrarCuenta()
    expect(stockDe(objetivo.insumoId)).toBe(antes)
  })
})

describe('cuando no alcanza el stock', () => {
  it('cobra igual, descuenta lo que hay y anota el faltante', async () => {
    const objetivo = insumoDeLaCuenta()
    const insumo = db.insumos.find((i) => i.id === objetivo.insumoId)!
    // Se deja casi sin stock: el almacén dice una cosa y la cocina otra.
    for (const e of insumo.existencias) e.cantidad = 0
    insumo.existencias[0]!.cantidad = 0.01
    insumo.stock = 0.01

    const venta = await cobrarCuenta()
    expect(venta.estado).toBe('cobrada')
    const consumo = venta.consumo?.find((c) => c.insumoId === objetivo.insumoId)
    expect(consumo?.cantidad).toBeCloseTo(0.01, 3)
    expect(consumo?.faltante).toBeGreaterThan(0)
    expect(stockDe(objetivo.insumoId)).toBe(0)

    const bitacora = await auditoriaService.listar({ modulo: 'Inventario' })
    expect(bitacora[0].accion).toBe('Venta con stock insuficiente')
  })
})

describe('lo anulado vuelve al almacén', () => {
  it('anular un producto comandado devuelve su consumo', async () => {
    await parametrosService.guardarValor('ventas.descuentoStock', 'comandar', 'l1')
    const conLinea = await ventasService.agregarLinea(
      'pd1',
      { vendibleId: 'v:v2', cantidad: 1 },
      MESERO,
    )
    const nueva = conLinea.lineas.at(-1)!
    const objetivo = consumoService.consumoPendiente(conLinea, [nueva])[0]!
    const antes = stockDe(objetivo.insumoId)

    await ventasService.comandar('pd1', MESERO)
    expect(stockDe(objetivo.insumoId)).toBeLessThan(antes)

    await ventasService.quitarLinea('pd1', nueva.id, ADMIN, 'Al cliente no le gustó')
    expect(stockDe(objetivo.insumoId)).toBeCloseTo(antes, 3)
  })

  it('anular la venta devuelve todo lo consumido', async () => {
    const objetivo = insumoDeLaCuenta()
    const antes = stockDe(objetivo.insumoId)
    const venta = await cobrarCuenta()
    expect(stockDe(objetivo.insumoId)).toBeLessThan(antes)

    await ventasService.anularVenta(venta.id, 'Cobrada dos veces', ADMIN)
    expect(stockDe(objetivo.insumoId)).toBeCloseTo(antes, 3)
  })

  it('el movimiento queda en el kardex con la cuenta que lo originó', async () => {
    await cobrarCuenta()
    const salidas = db.movimientos.filter((m) => m.motivo?.startsWith('Venta · cuenta'))
    expect(salidas.length).toBeGreaterThan(0)
    expect(salidas[0].referencia).toBe('1041')
    expect(salidas[0].tipo).toBe('salida')
  })
})
