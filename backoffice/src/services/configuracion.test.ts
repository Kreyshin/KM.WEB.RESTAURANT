import { reactive } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { canalesService, mediosPagoService } from './comercial.service'
import { empresaService, impuestosService } from './empresa.service'
import { localesService } from './locales.service'
import { db, reiniciarMock } from './mock/db'
import { guardarConfigRed } from './mock/red'
import type { NuevaArea } from '@/types'
import {
  areasService,
  coberturaComanda,
  impresorasService,
  seriesService,
} from './produccion.service'

/**
 * Reglas de configuración donde un error sería caro: comprobantes con numeración
 * rota ante SUNAT, comandas que no llegan a cocina o un negocio sin forma de cobrar.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
  guardarConfigRed({ latenciaMs: 0, tasaError: 0 })
})

describe('series de comprobantes', () => {
  it('no permite retroceder el correlativo', async () => {
    await expect(seriesService.actualizar('sr1', { correlativo: 100 })).rejects.toMatchObject({
      campos: { correlativo: expect.any(String) },
    })
    expect(db.series.find((s) => s.id === 'sr1')!.correlativo).toBe(18342)
  })

  it('valida el formato según el tipo y normaliza a mayúsculas', async () => {
    await expect(
      seriesService.crear({
        localId: 'l1',
        tipo: 'factura',
        serie: 'B010',
        correlativo: 0,
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { serie: expect.any(String) } })

    const creada = await seriesService.crear({
      localId: 'l1',
      tipo: 'factura',
      serie: 'f010',
      correlativo: 0,
      activo: true,
    })
    expect(creada.serie).toBe('F010')
  })

  it('una serie es única por tipo en todo el RUC, aunque sea de otro local', async () => {
    await expect(
      seriesService.crear({
        localId: 'l2',
        tipo: 'boleta',
        serie: 'B001',
        correlativo: 0,
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { serie: expect.any(String) } })
  })

  it('solo elimina series que nunca emitieron', async () => {
    await expect(seriesService.eliminar('sr1')).rejects.toBeTruthy()
    const nueva = await seriesService.crear({
      localId: 'l1',
      tipo: 'boleta',
      serie: 'B099',
      correlativo: 0,
      activo: true,
    })
    await seriesService.eliminar(nueva.id)
    expect(db.series.some((s) => s.id === nueva.id)).toBe(false)
  })
})

describe('impresoras y áreas', () => {
  it('una impresora de red exige IP válida; una USB no', async () => {
    const base = {
      nombre: 'Postres',
      localId: 'l1',
      uso: 'comandas',
      ancho: '80mm',
      activo: true,
    } as const
    await expect(
      impresorasService.crear({ ...base, conexion: 'red', direccionIp: '192.168.1' }),
    ).rejects.toMatchObject({ campos: { direccionIp: expect.any(String) } })
    const usb = await impresorasService.crear({ ...base, conexion: 'usb', direccionIp: '1.1.1.1' })
    expect(usb.direccionIp).toBeUndefined()
  })

  it('no elimina una impresora asignada a áreas', async () => {
    await expect(impresorasService.eliminar('im1')).rejects.toMatchObject({
      mensaje: expect.stringContaining('Cocina caliente'),
    })
  })

  it('la impresora de un área debe ser de su mismo local', async () => {
    await expect(areasService.actualizar('ae5', { impresoraId: 'im1' })).rejects.toMatchObject({
      campos: { impresoraId: expect.any(String) },
    })
  })

  it('admite dos áreas con el mismo nombre si están en salones distintos', async () => {
    const base: Omit<NuevaArea, 'salonId'> = {
      nombre: 'Barra',
      localId: 'l1',
      recibeComandas: true,
      comanda: { modo: 'todos', categoriaIds: [], productoIds: [] },
      activo: true,
    }
    await expect(areasService.crear({ ...base, salonId: 's1' })).rejects.toMatchObject({
      campos: { nombre: expect.any(String) },
    })
    const terraza = await areasService.crear({ ...base, salonId: 's2' })
    expect(terraza.id).toBeTruthy()
  })

  it('el salón de un área debe ser de su mismo local', async () => {
    await expect(areasService.actualizar('ae5', { salonId: 's1' })).rejects.toMatchObject({
      campos: { salonId: expect.any(String) },
    })
  })

  it('un área con productos seleccionados necesita al menos uno', async () => {
    await expect(
      areasService.actualizar('ae3', {
        comanda: { modo: 'seleccionados', categoriaIds: [], productoIds: [] },
      }),
    ).rejects.toMatchObject({ campos: { comanda: expect.any(String) } })
  })

  it('avisa de productos sin área y de productos en varias', () => {
    const areas = db.areas.map((a) =>
      a.id === 'ae3' ? { ...a, comanda: { ...a.comanda, categoriaIds: [] } } : a,
    )
    const sinBarra = coberturaComanda(areas, db.productos, 'l1')
    expect(sinBarra.sinArea.every((p) => p.categoriaId === 'c6')).toBe(true)
    expect(sinBarra.sinArea.length).toBeGreaterThan(0)

    const duplicada = db.areas.map((a) =>
      a.id === 'ae2' ? { ...a, comanda: { ...a.comanda, categoriaIds: ['c2', 'c3'] } } : a,
    )
    expect(coberturaComanda(duplicada, db.productos, 'l1').enVarias.length).toBeGreaterThan(0)
    expect(coberturaComanda(db.areas, db.productos, 'l2').sinArea).toHaveLength(0)
  })
})

describe('medios de pago y canales', () => {
  it('siempre queda al menos un medio de pago activo', async () => {
    db.mediosPago = db.mediosPago.map((m) => ({ ...m, activo: m.id === 'mp1' }))
    await expect(mediosPagoService.actualizar('mp1', { activo: false })).rejects.toBeTruthy()
    await expect(mediosPagoService.eliminar('mp1')).rejects.toBeTruthy()
  })

  it('un canal que no es app de delivery no guarda comisión', async () => {
    const canal = await canalesService.crear({
      nombre: 'Barra',
      tipo: 'salon',
      comisionPorcentaje: 15,
      aplicaRecargoConsumo: false,
      activo: true,
    })
    expect(canal.comisionPorcentaje).toBe(0)
  })
})

describe('empresa, impuestos y locales', () => {
  it('rechaza un RUC con dígito verificador incorrecto', async () => {
    await expect(
      empresaService.guardar({ ...db.empresa, ruc: '20100070971' }),
    ).rejects.toMatchObject({
      campos: { ruc: expect.any(String) },
    })
  })

  it('el recargo al consumo no supera el 13 %', async () => {
    await expect(
      impuestosService.guardar({ ...db.impuestos, recargoConsumoPorcentaje: 15 }),
    ).rejects.toBeTruthy()
  })

  it('no elimina un local con series asociadas', async () => {
    await expect(localesService.eliminar('l1')).rejects.toBeTruthy()
  })

  it('el código de establecimiento es único y de 4 dígitos', async () => {
    await expect(
      localesService.actualizar('l2', { codigoEstablecimiento: '0000' }),
    ).rejects.toBeTruthy()
    await expect(
      localesService.actualizar('l2', { codigoEstablecimiento: '12' }),
    ).rejects.toBeTruthy()
  })
})

describe('datos que llegan desde formularios', () => {
  it('acepta objetos reactivos anidados y no comparte referencias con la vista', async () => {
    const borrador = reactive(structuredClone(db.locales.find((l) => l.id === 'l2')!))
    borrador.horario[6]!.abierto = true

    await localesService.actualizar('l2', { horario: borrador.horario })
    expect(db.locales.find((l) => l.id === 'l2')!.horario[6]!.abierto).toBe(true)

    // Editar el formulario después de guardar no debe alterar la base.
    borrador.horario[6]!.abierto = false
    expect(db.locales.find((l) => l.id === 'l2')!.horario[6]!.abierto).toBe(true)
  })
})
