import { beforeEach, describe, expect, it } from 'vitest'
import { inventarioService } from './inventario.service'
import { db, reiniciarMock } from './mock/db'
import type { NuevoMovimiento } from '@/types'

/**
 * El inventario es el único servicio con aritmética de por medio: cada
 * movimiento modifica el stock y un signo invertido pasaría desapercibido en
 * la interfaz. Se prueba el efecto sobre el stock, no la forma del objeto.
 */

const movimiento = (extra: Partial<NuevoMovimiento> = {}): NuevoMovimiento => ({
  insumoId: 'i1',
  tipo: 'entrada',
  cantidad: 5,
  usuarioId: 'u1',
  ...extra,
})

function stockDe(id: string) {
  return db.insumos.find((i) => i.id === id)!.stock
}

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('movimientos de stock', () => {
  it('una entrada suma al stock', async () => {
    const antes = stockDe('i1')
    await inventarioService.registrarMovimiento(movimiento({ tipo: 'entrada', cantidad: 5 }))
    expect(stockDe('i1')).toBeCloseTo(antes + 5)
  })

  it('una salida resta del stock', async () => {
    const antes = stockDe('i1')
    await inventarioService.registrarMovimiento(movimiento({ tipo: 'salida', cantidad: 3 }))
    expect(stockDe('i1')).toBeCloseTo(antes - 3)
  })

  it('una merma resta, igual que una salida', async () => {
    const antes = stockDe('i1')
    await inventarioService.registrarMovimiento(movimiento({ tipo: 'merma', cantidad: 1.5 }))
    expect(stockDe('i1')).toBeCloseTo(antes - 1.5)
  })

  it('rechaza una salida mayor que el stock en vez de dejarlo negativo', async () => {
    const antes = stockDe('i1')
    await expect(
      inventarioService.registrarMovimiento(movimiento({ tipo: 'salida', cantidad: antes + 1 })),
    ).rejects.toMatchObject({ campos: { cantidad: expect.any(String) } })
    expect(stockDe('i1')).toBe(antes)
  })

  it('rechaza cantidades nulas o negativas', async () => {
    await expect(
      inventarioService.registrarMovimiento(movimiento({ cantidad: 0 })),
    ).rejects.toBeTruthy()
    await expect(
      inventarioService.registrarMovimiento(movimiento({ cantidad: -2 })),
    ).rejects.toBeTruthy()
  })

  it('no arrastra error de coma flotante tras varios movimientos', async () => {
    await inventarioService.registrarMovimiento(movimiento({ tipo: 'entrada', cantidad: 0.1 }))
    await inventarioService.registrarMovimiento(movimiento({ tipo: 'entrada', cantidad: 0.2 }))
    // 8.4 + 0.1 + 0.2 daría 8.700000000000001 sin el redondeo del servicio.
    expect(stockDe('i1')).toBe(8.7)
  })

  it('el kardex devuelve lo más reciente primero', async () => {
    await inventarioService.registrarMovimiento(movimiento({ motivo: 'El más nuevo' }))
    const movimientos = await inventarioService.listarMovimientos('i1')
    expect(movimientos[0].motivo).toBe('El más nuevo')
  })
})

describe('recetas', () => {
  it('calcula el coste sumando insumo por insumo', () => {
    const coste = inventarioService.costeDeReceta({
      productoId: 'p6',
      // 0.2 kg de lomo a 52 = 10.4; 0.5 kg de papa blanca a 3.2 = 1.6
      ingredientes: [
        { insumoId: 'i1', cantidad: 0.2 },
        { insumoId: 'i4', cantidad: 0.5 },
      ],
    })
    expect(coste).toBeCloseTo(12)
  })

  it('ignora insumos que ya no existen en vez de fallar', () => {
    const coste = inventarioService.costeDeReceta({
      productoId: 'p6',
      ingredientes: [{ insumoId: 'no-existe', cantidad: 3 }],
    })
    expect(coste).toBe(0)
  })

  it('guardar una receta sin ingredientes la elimina', async () => {
    await inventarioService.guardarReceta({ productoId: 'p6', ingredientes: [] })
    expect(db.recetas.some((r) => r.productoId === 'p6')).toBe(false)
  })

  it('descarta ingredientes con cantidad cero al guardar', async () => {
    const receta = await inventarioService.guardarReceta({
      productoId: 'p7',
      ingredientes: [
        { insumoId: 'i1', cantidad: 0.3 },
        { insumoId: 'i4', cantidad: 0 },
      ],
    })
    expect(receta.ingredientes).toHaveLength(1)
  })

  it('no deja eliminar un insumo que forma parte de una receta', async () => {
    await expect(inventarioService.eliminarInsumo('i1')).rejects.toBeTruthy()
    expect(db.insumos.some((i) => i.id === 'i1')).toBe(true)
  })
})
