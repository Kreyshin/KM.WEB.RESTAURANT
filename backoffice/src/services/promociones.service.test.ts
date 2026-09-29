import { beforeEach, describe, expect, it } from 'vitest'
import { db, reiniciarMock } from './mock/db'
import { parametrosService } from './parametros.service'
import { evaluar, promocionesService, puntosService } from './promociones.service'
import type { CuentaPromociones, NuevaPromocion } from '@/types'

/**
 * Reglas de F6.2 · promociones (D-011): una forma sola, beneficio de lista
 * cerrada, no se acumulan salvo que se permita, el tope frena y todo se
 * explica —también lo que no entró—.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const ADMIN = 'u1'

/** Un lunes y un martes conocidos, para las promociones por día. */
const LUNES = '2026-09-28'
const MARTES = '2026-09-29'

const cuenta = (extra: Partial<CuentaPromociones> = {}): CuentaPromociones => ({
  localId: 'l1',
  canalId: 'cv1',
  fecha: MARTES,
  hora: '20:00',
  lineas: [{ vendibleId: 'v:v1', cantidad: 2 }],
  ...extra,
})

const nueva = (extra: Partial<NuevaPromocion> = {}): NuevaPromocion => ({
  codigo: 'PRUEBA',
  nombre: 'Promoción de prueba',
  localIds: [],
  canalIds: [],
  dias: [],
  activacion: 'automatica',
  condicion: { tipo: 'montoMinimo', monto: 50 },
  beneficio: { tipo: 'porcentaje', valor: 10, alcance: 'cuenta' },
  topeMonto: 0,
  topePorcentaje: 0,
  combinable: true,
  prioridad: 10,
  activa: true,
  ...extra,
})

describe('evaluación de la cuenta', () => {
  it('aplica el 2×1 del martes regalando la unidad más barata', () => {
    const r = evaluar(cuenta())
    // Dos cebiches personales a 42: se cobra uno.
    expect(r.subtotal).toBe(84)
    expect(r.aplicadas[0].codigo).toBe('MARTES-CEBICHE')
    expect(r.descuento).toBe(42)
    expect(r.total).toBe(42)
  })

  it('el lunes esa misma cuenta no tiene promoción, y dice por qué', () => {
    const r = evaluar(cuenta({ fecha: LUNES }))
    expect(r.aplicadas).toHaveLength(0)
    expect(r.descartadas.find((d) => d.codigo === 'MARTES-CEBICHE')?.motivo).toBe('otroDia')
  })

  it('respeta la franja horaria de la promoción del almuerzo', () => {
    const almuerzo = cuenta({
      fecha: LUNES,
      hora: '13:00',
      lineas: [{ vendibleId: 'p:p14', cantidad: 1 }],
    })
    expect(evaluar(almuerzo).aplicadas[0].codigo).toBe('ALMUERZO-PISCO')
    const noche = { ...almuerzo, hora: '21:00' }
    expect(evaluar(noche).descartadas.find((d) => d.codigo === 'ALMUERZO-PISCO')?.motivo).toBe(
      'fueraDeFranja',
    )
  })

  it('el precio fijo descuenta solo la diferencia con el precio de lista', () => {
    const r = evaluar(
      cuenta({ fecha: LUNES, hora: '13:00', lineas: [{ vendibleId: 'p:p14', cantidad: 2 }] }),
    )
    // Pisco sour a 26, precio fijo 15: 11 por unidad.
    expect(r.descuento).toBe(22)
  })

  it('el cupón solo entra si se teclea, y no si está agotado', () => {
    const sinCupon = evaluar(
      cuenta({ fecha: LUNES, lineas: [{ vendibleId: 'p:p9', cantidad: 2 }] }),
    )
    expect(sinCupon.descartadas.find((d) => d.codigo === 'BIENVENIDA10')?.motivo).toBe('sinCupon')

    const conCupon = evaluar(
      cuenta({
        fecha: LUNES,
        lineas: [{ vendibleId: 'p:p9', cantidad: 2 }],
        cupon: 'bienvenida10',
      }),
    )
    expect(conCupon.aplicadas[0].codigo).toBe('BIENVENIDA10')
    // 10 % de 108.
    expect(conCupon.descuento).toBe(10.8)

    const agotado = evaluar(
      cuenta({
        fecha: LUNES,
        canalId: 'cv3',
        distrito: 'Miraflores',
        lineas: [{ vendibleId: 'p:p9', cantidad: 1 }],
        cupon: 'MOTO5',
      }),
    )
    expect(agotado.descartadas.find((d) => d.codigo === 'DELIVERY-5')?.motivo).toBe('cuponAgotado')
  })

  it('el tope de la promoción recorta el descuento y lo dice', async () => {
    await promocionesService.crear(
      nueva({
        codigo: 'TOPE',
        beneficio: { tipo: 'porcentaje', valor: 50, alcance: 'cuenta' },
        topeMonto: 20,
        prioridad: 99,
      }),
      ADMIN,
    )
    const r = evaluar(cuenta({ fecha: LUNES, lineas: [{ vendibleId: 'p:p9', cantidad: 2 }] }))
    const aplicada = r.aplicadas.find((a) => a.codigo === 'TOPE')
    expect(aplicada?.descuento).toBe(20)
    expect(aplicada?.descuentoSinTope).toBe(54)
    expect(aplicada?.explicacion).toContain('tope')
  })

  it('sin acumular entra una sola: la de mayor prioridad', async () => {
    await promocionesService.crear(nueva({ codigo: 'CHICA', prioridad: 5 }), ADMIN)
    await promocionesService.crear(nueva({ codigo: 'GRANDE', prioridad: 95 }), ADMIN)
    const r = evaluar(cuenta({ fecha: LUNES, lineas: [{ vendibleId: 'p:p9', cantidad: 2 }] }))
    expect(r.aplicadas.map((a) => a.codigo)).toEqual(['GRANDE'])
    expect(r.descartadas.find((d) => d.codigo === 'CHICA')?.motivo).toBe('noCombinable')
  })

  it('con acumular activado se suman las combinables', async () => {
    await parametrosService.guardarValor('promociones.acumular', true)
    await promocionesService.crear(nueva({ codigo: 'CHICA', prioridad: 5 }), ADMIN)
    await promocionesService.crear(nueva({ codigo: 'GRANDE', prioridad: 95 }), ADMIN)
    const r = evaluar(cuenta({ fecha: LUNES, lineas: [{ vendibleId: 'p:p9', cantidad: 2 }] }))
    expect(r.aplicadas.map((a) => a.codigo)).toEqual(['GRANDE', 'CHICA'])
    // 10 % de 108, dos veces.
    expect(r.descuento).toBe(21.6)
  })

  it('una promoción no combinable corta la acumulación', async () => {
    await parametrosService.guardarValor('promociones.acumular', true)
    await promocionesService.crear(
      nueva({ codigo: 'SOLA', prioridad: 95, combinable: false }),
      ADMIN,
    )
    await promocionesService.crear(nueva({ codigo: 'OTRA', prioridad: 5 }), ADMIN)
    const r = evaluar(cuenta({ fecha: LUNES, lineas: [{ vendibleId: 'p:p9', cantidad: 2 }] }))
    expect(r.aplicadas.map((a) => a.codigo)).toEqual(['SOLA'])
  })

  it('el tope del local recorta desde la promoción de menor prioridad', async () => {
    await parametrosService.guardarValor('promociones.acumular', true)
    await parametrosService.guardarValor('promociones.topeCuentaPorcentaje', 15, 'l1')
    await promocionesService.crear(nueva({ codigo: 'GRANDE', prioridad: 95 }), ADMIN)
    await promocionesService.crear(nueva({ codigo: 'CHICA', prioridad: 5 }), ADMIN)
    const r = evaluar(cuenta({ fecha: LUNES, lineas: [{ vendibleId: 'p:p9', cantidad: 2 }] }))
    // 15 % de 108 = 16.20, en vez de 21.60.
    expect(r.descuento).toBe(16.2)
    expect(r.aplicadas.find((a) => a.codigo === 'GRANDE')?.descuento).toBe(10.8)
    expect(r.aplicadas.find((a) => a.codigo === 'CHICA')?.descuento).toBe(5.4)
  })

  it('en delivery cobra el envío de la zona y el envío gratis lo perdona', () => {
    const chico = evaluar(
      cuenta({
        fecha: LUNES,
        canalId: 'cv3',
        distrito: 'Miraflores',
        lineas: [{ vendibleId: 'p:p9', cantidad: 1 }],
      }),
    )
    expect(chico.costoEnvio).toBe(6)
    expect(chico.total).toBe(60)

    const grande = evaluar(
      cuenta({
        fecha: LUNES,
        canalId: 'cv3',
        distrito: 'San Isidro',
        lineas: [{ vendibleId: 'p:p9', cantidad: 2 }],
      }),
    )
    // Zona intermedia: envío 10, y la promoción de envío gratis desde 100.
    expect(grande.costoEnvio).toBe(10)
    expect(grande.descuentoEnvio).toBe(10)
    expect(grande.total).toBe(108)
  })

  it('el producto de regalo no descuenta: se agrega como línea sin cobrar', () => {
    const r = evaluar(cuenta({ fecha: LUNES, lineas: [{ vendibleId: 'p:p9', cantidad: 3 }] }))
    const postre = r.aplicadas.find((a) => a.codigo === 'POSTRE-INVITA')
    expect(postre?.regalo).toMatchObject({ nombre: 'Suspiro limeño', cantidad: 1 })
    expect(postre?.descuento).toBe(0)
  })

  it('descarta la promoción cuya vigencia ya terminó', () => {
    const r = evaluar(cuenta({ fecha: LUNES, lineas: [{ vendibleId: 'p:p6', cantidad: 1 }] }))
    expect(r.descartadas.find((d) => d.codigo === 'FIESTAS-PATRIAS')?.motivo).toBe(
      'fueraDeVigencia',
    )
  })

  it('respeta el precio ya cobrado en la línea', () => {
    const r = evaluar(cuenta({ lineas: [{ vendibleId: 'v:v1', cantidad: 2, precioUnitario: 30 }] }))
    expect(r.subtotal).toBe(60)
    expect(r.descuento).toBe(30)
  })
})

describe('mantenimiento de promociones', () => {
  it('no admite dos promociones con el mismo cupón', async () => {
    await expect(
      promocionesService.crear(
        nueva({
          codigo: 'OTRA',
          activacion: 'cupon',
          cupon: { codigo: 'bienvenida10', usosMaximos: 10, usosPorCliente: 1, usados: 0 },
        }),
        ADMIN,
      ),
    ).rejects.toMatchObject({ campos: { cupon: 'Cupón duplicado' } })
  })

  it('un N×M necesita llevar más de lo que se paga', async () => {
    await expect(
      promocionesService.crear(
        nueva({
          condicion: { tipo: 'unidades', cantidad: 2, vendibleIds: ['v:v1'] },
          beneficio: { tipo: 'nxm', llevan: 2, pagan: 2 },
        }),
        ADMIN,
      ),
    ).rejects.toMatchObject({ campos: { beneficio: 'Revisa N y M' } })
  })

  it('el envío gratis exige un canal de reparto propio', async () => {
    await expect(
      promocionesService.crear(
        nueva({ canalIds: ['cv1'], beneficio: { tipo: 'envioGratis' } }),
        ADMIN,
      ),
    ).rejects.toMatchObject({ campos: { canalIds: 'Canal equivocado' } })
  })

  it('no borra una promoción con cupones ya canjeados: se desactiva', async () => {
    await expect(promocionesService.eliminar('pm3', ADMIN)).rejects.toMatchObject({
      mensaje: expect.stringContaining('desactívala'),
    })
    const apagada = await promocionesService.cambiarEstado('pm3', false, ADMIN)
    expect(apagada.activa).toBe(false)
  })

  it('al editar la regla no se reescriben los usos del cupón', async () => {
    const promo = db.promociones.find((p) => p.id === 'pm3')!
    const editada = await promocionesService.actualizar(
      'pm3',
      { ...promo, cupon: { ...promo.cupon!, usados: 0 }, nombre: 'Bienvenida renovada' },
      ADMIN,
    )
    expect(editada.cupon?.usados).toBe(214)
  })

  it('pide permiso para editar promociones', async () => {
    await expect(promocionesService.crear(nueva(), 'u2')).rejects.toMatchObject({
      mensaje: expect.stringContaining('permiso'),
    })
  })
})

describe('reglas de puntos', () => {
  it('no da puntos mientras están apagadas', () => {
    expect(puntosService.puntosPor(200, 'cv1')).toBe(0)
  })

  it('da un punto por cada tramo de soles, solo en los canales que acumulan', async () => {
    await puntosService.guardar(
      { ...db.reglasPuntos, activo: true, solesPorPunto: 10, canalIds: ['cv1'] },
      ADMIN,
    )
    expect(puntosService.puntosPor(95, 'cv1')).toBe(9)
    expect(puntosService.puntosPor(95, 'cv4')).toBe(0)
  })

  it('exige que un punto valga algo', async () => {
    await expect(
      puntosService.guardar({ ...db.reglasPuntos, valorPunto: 0 }, ADMIN),
    ).rejects.toMatchObject({ campos: { valorPunto: expect.any(String) } })
  })
})
