import { beforeEach, describe, expect, it } from 'vitest'
import { auditoriaService } from './auditoria.service'
import { zonasRepartoService } from './delivery.service'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'

/**
 * Reglas de F6.2 · reparto (D-011): un distrito pertenece a una sola zona del
 * local, el mínimo manda y fuera de cobertura se avisa o se bloquea según el
 * local, nunca por programa.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'

const base = {
  nombre: 'Prueba',
  localId: 'l1',
  distritos: ['Jesús María'],
  costoEnvio: 9,
  pedidoMinimo: 40,
  tiempoEstimadoMin: 40,
  activa: true,
}

describe('zonas de reparto', () => {
  it('no deja el mismo distrito en dos zonas del local', async () => {
    await expect(
      zonasRepartoService.crear({ ...base, distritos: ['Barranco'] }, ADMIN),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('Cercana') })
  })

  it('sí deja el mismo distrito en otro local: son cocinas distintas', async () => {
    const zona = await zonasRepartoService.crear(
      { ...base, localId: 'l2', distritos: ['Barranco'] },
      ADMIN,
    )
    expect(zona.distritos).toEqual(['Barranco'])
  })

  it('rechaza el envío gratis por debajo del pedido mínimo', async () => {
    await expect(
      zonasRepartoService.crear({ ...base, pedidoMinimo: 50, envioGratisDesde: 30 }, ADMIN),
      // Sería gratis siempre: el campo quedaría mintiendo.
    ).rejects.toMatchObject({ campos: { envioGratisDesde: 'Revisa el monto' } })
  })

  it('limpia el nombre y descarta distritos vacíos', async () => {
    const zona = await zonasRepartoService.crear(
      { ...base, nombre: '  Norte  ', distritos: ['Lince', '  ', ' Breña '] },
      ADMIN,
    )
    expect(zona.nombre).toBe('Norte')
    expect(zona.distritos).toEqual(['Lince', 'Breña'])
  })

  it('anota en la bitácora quién cambió la cobertura', async () => {
    await zonasRepartoService.actualizar(
      'zr1',
      { ...db.zonasReparto[0], distritos: ['Miraflores'], costoEnvio: 7 },
      ADMIN,
    )
    const bitacora = await auditoriaService.listar({ modulo: 'Delivery' })
    expect(bitacora[0].accion).toBe('Zona de reparto editada')
    expect(bitacora[0].detalle).toContain('envío S/ 7.00')
  })

  it('pide permiso para editar zonas', async () => {
    // Lucía es mesera: no configura el reparto.
    await expect(zonasRepartoService.crear(base, 'u2')).rejects.toMatchObject({
      mensaje: expect.stringContaining('permiso'),
    })
  })
})

describe('cobertura', () => {
  it('cobra el envío de la zona y promete su tiempo', () => {
    const c = zonasRepartoService.cobertura('l1', 'Miraflores', 50)
    expect(c.estado).toBe('cubierto')
    expect(c.costoEnvio).toBe(6)
    expect(c.tiempoEstimadoMin).toBe(30)
  })

  it('no cobra envío desde el monto de envío gratis', () => {
    const c = zonasRepartoService.cobertura('l1', 'Miraflores', 95)
    expect(c.envioGratis).toBe(true)
    expect(c.costoEnvio).toBe(0)
  })

  it('bajo el mínimo dice cuánto falta y bloquea', () => {
    const c = zonasRepartoService.cobertura('l1', 'Miraflores', 20)
    expect(c.estado).toBe('bajoMinimo')
    expect(c.faltaParaMinimo).toBe(15)
    expect(c.bloquea).toBe(true)
  })

  it('ignora las zonas desactivadas', () => {
    const c = zonasRepartoService.cobertura('l1', 'La Molina', 200)
    expect(c.estado).toBe('fueraDeCobertura')
  })

  it('fuera de cobertura avisa o bloquea según el local', async () => {
    expect(zonasRepartoService.cobertura('l1', 'Ate', 80).bloquea).toBe(false)
    await parametrosService.guardarValor('delivery.fueraDeCobertura', 'bloquear', 'l1')
    expect(zonasRepartoService.cobertura('l1', 'Ate', 80).bloquea).toBe(true)
  })

  it('un local que no cobra envío lo deja en cero', async () => {
    await parametrosService.guardarValor('delivery.cobrarEnvio', false, 'l1')
    const c = zonasRepartoService.cobertura('l1', 'San Isidro', 60)
    expect(c.costoEnvio).toBe(0)
    expect(c.explicacion).toContain('no cobra envío')
  })
})
