import { describe, expect, it } from 'vitest'
import type { HorarioDia } from '@/types'
import {
  duracionTurno,
  formatearNumeroComprobante,
  validarHorario,
  validarIpv4,
  validarRuc,
  validarSerie,
} from './validaciones'

describe('validarRuc', () => {
  it('acepta RUC con dígito verificador correcto', () => {
    expect(validarRuc('20100070970')).toBe(true) // persona jurídica
    expect(validarRuc('10467793549')).toBe(true) // persona natural
  })

  it('rechaza dígito verificador incorrecto, longitud o prefijo inválidos', () => {
    expect(validarRuc('20100070971')).toBe(false)
    expect(validarRuc('2010007097')).toBe(false)
    expect(validarRuc('30100070970')).toBe(false)
    expect(validarRuc('20A00070970')).toBe(false)
  })
})

describe('validarSerie', () => {
  it('exige la letra del comprobante electrónico', () => {
    expect(validarSerie('boleta', 'B001')).toBe(true)
    expect(validarSerie('boleta', 'F001')).toBe(false)
    expect(validarSerie('factura', 'F002')).toBe(true)
    expect(validarSerie('factura', 'F01')).toBe(false)
  })

  it('las notas de crédito aceptan B o F y la nota de venta cualquier código', () => {
    expect(validarSerie('notaCredito', 'BC01')).toBe(true)
    expect(validarSerie('notaCredito', 'FC01')).toBe(true)
    expect(validarSerie('notaCredito', 'NC01')).toBe(false)
    expect(validarSerie('notaVenta', 'NV01')).toBe(true)
    expect(validarSerie('notaVenta', 'nv01')).toBe(false)
  })

  it('formatea el número completo con 8 dígitos', () => {
    expect(formatearNumeroComprobante('B001', 123)).toBe('B001-00000123')
  })
})

describe('validarIpv4', () => {
  it('acepta direcciones válidas y rechaza el resto', () => {
    expect(validarIpv4('192.168.1.50')).toBe(true)
    expect(validarIpv4('192.168.1.256')).toBe(false)
    expect(validarIpv4('192.168.01.5')).toBe(false)
    expect(validarIpv4('192.168.1')).toBe(false)
  })
})

describe('horario', () => {
  const dia = (d: Partial<HorarioDia>): HorarioDia => ({
    dia: 0,
    abierto: true,
    apertura: '12:00',
    cierre: '23:00',
    ...d,
  })

  it('ignora días cerrados y detecta horas vacías o iguales', () => {
    const errores = validarHorario([
      dia({ dia: 0 }),
      dia({ dia: 1, abierto: false, apertura: '' }),
      dia({ dia: 2, cierre: '' }),
      dia({ dia: 3, apertura: '10:00', cierre: '10:00' }),
    ])
    expect(Object.keys(errores).map(Number)).toEqual([2, 3])
  })

  it('calcula turnos que cruzan la medianoche', () => {
    expect(duracionTurno('12:00', '23:00')).toBe(660)
    expect(duracionTurno('19:00', '02:00')).toBe(420)
  })
})
