import { beforeEach, describe, expect, it } from 'vitest'
import {
  codigoUbicacion,
  lotesService,
  parametrosAbastecimientoService,
  resolverParametros,
  stockDetalleService,
  ubicacionesService,
  valoresParametros,
} from './abastecimiento.service'
import { inventarioService } from './inventario.service'
import { db, reiniciarMock } from './mock/db'

/**
 * Reglas de F4.3 donde un error descuadra el inventario o hace imposible
 * recepcionar: la herencia de parámetros, la ubicación por defecto, el orden
 * FEFO y el cuadre entre stock principal y detallado.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('parámetros heredados', () => {
  it('sin ajuste propio, un insumo toma los valores de la empresa', () => {
    // Arroz en la zona principal: ni la zona ni la categoría ajustan nada.
    const p = resolverParametros({ insumoId: 'i8', zonaId: 'zn1' })
    expect(p.controlaLote).toEqual({ valor: false, nivel: 'empresa' })
    expect(p.tipoRecepcion).toEqual({ valor: 'total', nivel: 'empresa' })
  })

  it('el nivel más específico gana y se sabe de cuál viene cada valor', () => {
    // Lenguado en la cámara de frío: la zona pide lote, la categoría vencimiento.
    const p = resolverParametros({ insumoId: 'i2', zonaId: 'zn2' })
    expect(p.controlaLote).toEqual({ valor: true, nivel: 'zona' })
    expect(p.controlaVencimiento).toEqual({ valor: true, nivel: 'categoria' })
    expect(p.diasAlerta).toEqual({ valor: 2, nivel: 'categoria' })
    expect(p.bloquearVencidos).toEqual({ valor: true, nivel: 'empresa' })
  })

  it('el mismo insumo cambia de parámetros según la zona', () => {
    expect(valoresParametros({ insumoId: 'i2', zonaId: 'zn2' }).controlaUbicacion).toBe(true)
    expect(valoresParametros({ insumoId: 'i2', zonaId: 'zn1' }).controlaUbicacion).toBe(false)
  })

  it('lo fijado en el insumo pesa más que la categoría y que la zona', async () => {
    await parametrosAbastecimientoService.guardarAjuste('insumo', 'i2', { diasAlerta: 1 })
    const p = resolverParametros({ insumoId: 'i2', zonaId: 'zn2' })
    expect(p.diasAlerta).toEqual({ valor: 1, nivel: 'insumo' })
  })

  it('quitar un ajuste devuelve el parámetro a lo que heredaba', async () => {
    await parametrosAbastecimientoService.guardarAjuste('insumo', 'i2', { diasAlerta: 1 })
    await parametrosAbastecimientoService.guardarAjuste('insumo', 'i2', {})
    expect(resolverParametros({ insumoId: 'i2', zonaId: 'zn2' }).diasAlerta).toEqual({
      valor: 2,
      nivel: 'categoria',
    })
  })

  it('un ajuste que no sea de empresa necesita a qué aplica', async () => {
    await expect(
      parametrosAbastecimientoService.guardarAjuste('local', undefined, { fefo: true }),
    ).rejects.toMatchObject({ campos: { referencia: expect.any(String) } })
  })

  it('el nivel de empresa no se elimina: es el que da los valores por defecto', async () => {
    const cadena = db.ajustesParametros.find((a) => a.nivel === 'empresa')!
    await expect(parametrosAbastecimientoService.eliminarAjuste(cadena.id)).rejects.toBeTruthy()
  })
})

describe('ubicaciones', () => {
  it('no se repite la misma ubicación dentro de una zona', async () => {
    await expect(
      ubicacionesService.crear({
        zonaId: 'zn1',
        pasillo: 'P1',
        estante: 'A',
        fila: '1',
        columna: '1',
        porDefecto: false,
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { pasillo: expect.any(String) } })
  })

  it('la misma coordenada sí puede existir en otra zona', async () => {
    const u = await ubicacionesService.crear({
      zonaId: 'zn3',
      pasillo: 'P1',
      estante: 'A',
      fila: '1',
      columna: '1',
      porDefecto: false,
      activo: true,
    })
    expect(codigoUbicacion(u)).toBe('P1-A-1-1')
  })

  it('solo hay una ubicación por defecto por zona', async () => {
    await ubicacionesService.actualizar('ub2', { porDefecto: true })
    const enAl1 = db.ubicaciones.filter((u) => u.zonaId === 'zn1' && u.porDefecto)
    expect(enAl1.map((u) => u.id)).toEqual(['ub2'])
    // La del otra zona no se toca.
    expect(ubicacionesService.porDefectoDe('zn2')?.id).toBe('ub4')
  })

  it('no se elimina una ubicación que todavía guarda stock', async () => {
    await expect(ubicacionesService.eliminar('ub4')).rejects.toBeTruthy()
    await expect(ubicacionesService.eliminar('ub3')).resolves.toBeUndefined()
  })
})

describe('lotes y stock detallado', () => {
  it('un insumo que controla vencimiento no admite lotes sin fecha', async () => {
    await expect(lotesService.crear({ insumoId: 'i2', codigo: 'LEN-NUEVO' })).rejects.toMatchObject(
      { campos: { vencimiento: expect.any(String) } },
    )
  })

  it('el código de lote no se repite dentro del mismo insumo', async () => {
    await expect(
      lotesService.crear({ insumoId: 'i2', codigo: 'LEN-2409A', vencimiento: '2027-01-01' }),
    ).rejects.toMatchObject({ campos: { codigo: expect.any(String) } })
  })

  it('los lotes se listan en orden FEFO: primero el que vence antes', async () => {
    const lotes = await lotesService.porInsumo('i2')
    expect(lotes.map((l) => l.codigo)).toEqual(['LEN-2409A', 'LEN-2409B'])
  })

  it('marca los lotes vencidos y los que están dentro de los días de alerta', async () => {
    const filas = await stockDetalleService.porInsumo('i12', 'zn2')
    expect(filas[0]!.vencido).toBe(true)
    // El lenguado vence mañana y su categoría avisa con 2 días.
    const lenguado = await stockDetalleService.porInsumo('i2', 'zn2')
    expect(lenguado[0]!.porVencer).toBe(true)
  })

  it('la semilla cuadra: el stock detallado suma lo mismo que el principal', async () => {
    expect(await stockDetalleService.descuadres()).toEqual([])
  })

  it('un movimiento sin detalle descuadra, y ajustar el detalle lo vuelve a cuadrar', async () => {
    await inventarioService.registrarMovimiento({
      insumoId: 'i2',
      zonaId: 'zn2',
      tipo: 'entrada',
      cantidad: 3,
      usuarioId: 'u1',
    })
    const descuadres = await stockDetalleService.descuadres()
    expect(descuadres).toHaveLength(1)
    expect(descuadres[0]).toMatchObject({ zonaId: 'zn2', detallado: 11.2, principal: 14.2 })

    stockDetalleService.ajustar({
      insumoId: 'i2',
      zonaId: 'zn2',
      loteId: 'lt2',
      ubicacionId: 'ub5',
      cantidad: 3,
    })
    expect(await stockDetalleService.descuadres()).toEqual([])
  })

  it('si el insumo controla ubicación, el detalle sin ubicación cae en la de por defecto', () => {
    const fila = stockDetalleService.ajustar({
      insumoId: 'i1',
      zonaId: 'zn2',
      loteId: 'lt3',
      cantidad: 1,
    })
    expect(fila.ubicacionId).toBe('ub4')
  })

  it('el stock detallado nunca queda negativo', () => {
    expect(() =>
      stockDetalleService.ajustar({
        insumoId: 'i2',
        zonaId: 'zn2',
        loteId: 'lt1',
        ubicacionId: 'ub4',
        cantidad: -99,
      }),
    ).toThrow()
  })
})

describe('vínculo con los artículos del ERP', () => {
  it('un insumo alterno declara varios artículos y uno por defecto', () => {
    const aceite = db.insumos.find((i) => i.id === 'i9')!
    expect(aceite.articulos).toHaveLength(2)
    expect(aceite.articulos.filter((v) => v.porDefecto)).toHaveLength(1)
  })

  it('el factor convierte la unidad de compra en unidad de uso', () => {
    // Un saco de 50 kg de papa amarilla rinde 50 kg de insumo.
    const papa = db.insumos.find((i) => i.id === 'i3')!
    expect(papa.articulos[0]!.factor).toBe(50)
  })

  it('lo que sale de una transformación no se compra', () => {
    for (const id of ['i16', 'i17', 'i18']) {
      const insumo = db.insumos.find((i) => i.id === id)!
      expect(insumo.abastecimiento).toBe('transformacion')
      expect(insumo.articulos).toEqual([])
    }
  })
})
