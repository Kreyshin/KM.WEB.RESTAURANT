import { beforeEach, describe, expect, it } from 'vitest'
import { db, reiniciarMock } from './mock/db'
import { parametrosService, valorConfig } from './parametros.service'

/**
 * Herencia de parámetros (D-006, D-008): empresa → cadena → local. Lo que la
 * pantalla necesita saber de cada valor es si es **propio** de ese nivel o
 * **heredado**, y a cuánto volvería si se suelta.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

/** Miraflores está en la cadena «Cevicherías»; Barranco no está en ninguna. */
const MIRAFLORES = 'l1'
const BARRANCO = 'l3'
const CADENA = 'cd1'
const CLAVE = 'ventas.propinaSugerida'

const valorDe = async (ambito: Parameters<typeof parametrosService.valores>[0]) =>
  (await parametrosService.valores(ambito)).find((v) => v.definicion.clave === CLAVE)!

describe('de dónde sale cada valor', () => {
  it('sin que nadie lo toque, viene de fábrica', async () => {
    const v = await valorDe({ localId: MIRAFLORES })
    expect(v.origen).toBe('defecto')
    expect(v.valor).toBe(10)
    // Soltar el valor no cambiaría nada: ya es el heredado.
    expect(v.heredado).toBe(10)
    expect(v.origenHeredado).toBe('defecto')
  })

  it('lo de la empresa llega a los locales que no lo tocaron', async () => {
    await parametrosService.guardarValor(CLAVE, 8)
    const v = await valorDe({ localId: MIRAFLORES })
    expect(v.origen).toBe('empresa')
    expect(v.valor).toBe(8)
  })

  it('la cadena se interpone entre la empresa y su local', async () => {
    await parametrosService.guardarValor(CLAVE, 8)
    await parametrosService.guardarValor(CLAVE, 12, undefined, CADENA)

    const miraflores = await valorDe({ localId: MIRAFLORES })
    expect(miraflores.origen).toBe('cadena')
    expect(miraflores.valor).toBe(12)

    // Barranco no está en la cadena: sigue escuchando a la empresa.
    const barranco = await valorDe({ localId: BARRANCO })
    expect(barranco.origen).toBe('empresa')
    expect(barranco.valor).toBe(8)
  })

  it('el valor propio del local gana, y dice a cuánto volvería', async () => {
    await parametrosService.guardarValor(CLAVE, 8)
    await parametrosService.guardarValor(CLAVE, 12, undefined, CADENA)
    await parametrosService.guardarValor(CLAVE, 15, MIRAFLORES)

    const v = await valorDe({ localId: MIRAFLORES })
    expect(v.origen).toBe('propio')
    expect(v.valor).toBe(15)
    expect(v.heredado).toBe(12)
    expect(v.origenHeredado).toBe('cadena')
    expect(valorConfig(CLAVE, MIRAFLORES)).toBe(15)
  })
})

describe('devolver la herencia', () => {
  it('soltar el valor propio devuelve el de arriba, y lo sigue escuchando', async () => {
    await parametrosService.guardarValor(CLAVE, 8)
    await parametrosService.guardarValor(CLAVE, 12, undefined, CADENA)
    await parametrosService.guardarValor(CLAVE, 15, MIRAFLORES)

    await parametrosService.guardarValor(CLAVE, undefined, MIRAFLORES)
    expect((await valorDe({ localId: MIRAFLORES })).origen).toBe('cadena')
    expect(valorConfig(CLAVE, MIRAFLORES)).toBe(12)

    // Lo que importa: sigue la cadena, no se quedó con una copia de 12.
    await parametrosService.guardarValor(CLAVE, 14, undefined, CADENA)
    expect(valorConfig(CLAVE, MIRAFLORES)).toBe(14)
  })

  it('en la empresa, soltarlo vuelve al valor de fábrica', async () => {
    await parametrosService.guardarValor(CLAVE, 8)
    expect((await valorDe({})).origen).toBe('propio')

    await parametrosService.guardarValor(CLAVE, undefined)
    const v = await valorDe({})
    expect(v.origen).toBe('defecto')
    expect(v.valor).toBe(10)
    expect(db.configuracion.vertical[CLAVE]).toBeUndefined()
  })

  it('la cadena también suelta el suyo y vuelve a la empresa', async () => {
    await parametrosService.guardarValor(CLAVE, 8)
    await parametrosService.guardarValor(CLAVE, 12, undefined, CADENA)
    expect((await valorDe({ cadenaId: CADENA })).origen).toBe('propio')

    await parametrosService.guardarValor(CLAVE, undefined, undefined, CADENA)
    const v = await valorDe({ cadenaId: CADENA })
    expect(v.origen).toBe('empresa')
    expect(v.valor).toBe(8)
  })
})

describe('qué se puede tocar en cada nivel', () => {
  it('un parámetro de toda la vertical no admite valor propio por local', async () => {
    await expect(
      parametrosService.guardarValor('recetas.fichaTecnica', true, MIRAFLORES),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('vale igual para toda la empresa') })
  })

  it('el local solo lista los parámetros que puede cambiar', async () => {
    const enLocal = await parametrosService.valores({ localId: MIRAFLORES })
    expect(enLocal.every((v) => v.definicion.alcance === 'local')).toBe(true)

    const enEmpresa = await parametrosService.valores({})
    expect(enEmpresa.some((v) => v.definicion.alcance === 'vertical')).toBe(true)
  })
})
