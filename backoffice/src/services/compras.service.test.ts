import { beforeEach, describe, expect, it } from 'vitest'
import {
  consolidar,
  requerimientosService,
  simuladorErp,
  solicitudesService,
  unidadesDeCompra,
} from './compras.service'
import { db, reiniciarMock } from './mock/db'

/**
 * Reglas de F4.4 donde un error compra de más, de menos o dos veces: la
 * traducción de insumos a artículos, la reserva de solicitudes, el permiso
 * para ajustar cantidades y lo que se puede hacer en cada estado.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'
const MESERO = 'u2'

describe('traducción a artículos', () => {
  it('redondea hacia arriba a unidades de compra enteras', () => {
    expect(unidadesDeCompra(30, 50)).toBe(1)
    expect(unidadesDeCompra(100, 50)).toBe(2)
    expect(unidadesDeCompra(100.5, 50)).toBe(3)
  })

  it('consolida por insumo y artículo sumando lo que piden varias áreas', () => {
    // so1 y so2 piden cebolla (8 kg + 5 kg): una sola malla de 20 kg.
    const lineas = consolidar(['so1', 'so2'])
    const cebolla = lineas.find((l) => l.insumoId === 'i5')!
    expect(cebolla.cantidadInsumo).toBe(13)
    expect(cebolla.cantidad).toBe(1)
    expect(cebolla.origen).toHaveLength(2)
    expect(cebolla.proveedorId).toBe('pv3')
  })

  it('la marca preferida elige el artículo de esa marca', async () => {
    const s = await solicitudesService.crear(
      {
        localId: 'l1',
        areaId: 'ae1',
        lineas: [{ id: '', insumoId: 'i9', cantidad: 12, marcaId: 'mc3' }],
      },
      ADMIN,
    )
    const [linea] = consolidar([s.id])
    expect(db.articulos.find((a) => a.id === linea!.articuloId)?.marcaId).toBe('mc3')
  })
})

describe('solicitudes', () => {
  it('no admite insumos sin artículos del ERP', async () => {
    await expect(
      solicitudesService.crear(
        { localId: 'l1', areaId: 'ae1', lineas: [{ id: '', insumoId: 'i14', cantidad: 2 }] },
        ADMIN,
      ),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('no tiene artículos') })
  })

  it('solo se rechaza una enviada que no esté en un requerimiento', async () => {
    await expect(solicitudesService.rechazar('so3', 'x')).rejects.toBeTruthy()
    const r = await solicitudesService.rechazar('so1', 'Hay stock')
    expect(r.estado).toBe('rechazada')
  })
})

describe('requerimientos', () => {
  it('reserva las solicitudes y al enviar quedan atendidas', async () => {
    const req = await requerimientosService.crear(
      { localId: 'l1', lineas: consolidar(['so1']) },
      ADMIN,
    )
    expect(db.solicitudes.find((s) => s.id === 'so1')?.requerimientoId).toBe(req.id)
    expect((await requerimientosService.pendientes('l1')).map((s) => s.id)).not.toContain('so1')

    await requerimientosService.enviar(req.id, ADMIN)
    expect(db.solicitudes.find((s) => s.id === 'so1')?.estado).toBe('atendida')
  })

  it('una solicitud no entra en dos requerimientos', async () => {
    await requerimientosService.crear({ localId: 'l1', lineas: consolidar(['so1']) }, ADMIN)
    await expect(
      requerimientosService.crear({ localId: 'l1', lineas: consolidar(['so1']) }, ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('ya no está disponible') })
  })

  it('ajustar la cantidad pedida por las áreas requiere permiso', async () => {
    const lineas = consolidar(['so1']).map((l) => ({ ...l, cantidad: l.cantidad + 5 }))
    await expect(
      requerimientosService.crear({ localId: 'l1', lineas }, MESERO),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('permiso') })
    await expect(
      requerimientosService.crear({ localId: 'l1', lineas }, ADMIN),
    ).resolves.toBeTruthy()
  })

  it('anular libera las solicitudes; ya aprobado no se anula', async () => {
    const req = await requerimientosService.crear(
      { localId: 'l1', lineas: consolidar(['so2']) },
      ADMIN,
    )
    await requerimientosService.enviar(req.id, ADMIN)
    await requerimientosService.anular(req.id, ADMIN, 'Duplicado')
    const so2 = db.solicitudes.find((s) => s.id === 'so2')!
    expect(so2.estado).toBe('enviada')
    expect(so2.requerimientoId).toBeUndefined()

    await expect(requerimientosService.anular('rq2', ADMIN, 'x')).rejects.toMatchObject({
      mensaje: expect.stringContaining('ERP'),
    })
  })

  it('no se convierte en OC con líneas no disponibles; el alterno lo desbloquea', async () => {
    await expect(simuladorErp.convertir('rq2')).rejects.toBeTruthy()
    // Lenguado no disponible → corvina, alterno del mismo insumo.
    const r = await requerimientosService.reemplazar('rq2', 'rq2-1', 'ar3', ADMIN)
    const linea = r.lineas.find((l) => l.id === 'rq2-1')!
    expect(linea.articuloId).toBe('ar3')
    expect(linea.reemplazoDe).toBe('ar2')
    expect(linea.noDisponible).toBe(false)

    const convertido = await simuladorErp.convertir('rq2')
    expect(convertido.estado).toBe('convertido')
    expect(convertido.ordenCompra).toMatch(/^OC-/)
  })

  it('no acepta un artículo que no abastece el insumo', async () => {
    await expect(
      requerimientosService.reemplazar('rq2', 'rq2-1', 'ar10', ADMIN),
    ).rejects.toBeTruthy()
  })
})
