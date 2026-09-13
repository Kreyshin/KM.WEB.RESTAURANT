import type { ConfigImpuestos, Empresa } from '@/types'
import { validarEmail, validarRuc } from '@/utils/validaciones'
import { db, latencia, persistir } from './mock/db'
import { errorCampo, esPorcentaje } from './mock/reglas'

/** Datos de la empresa: un único registro por cuenta. */
export const empresaService = {
  async obtener(): Promise<Empresa> {
    return latencia(db.empresa)
  },

  async guardar(datos: Empresa): Promise<Empresa> {
    const ruc = datos.ruc.trim()
    if (!validarRuc(ruc)) {
      throw errorCampo('ruc', 'El RUC no es válido.', 'Revisa los 11 dígitos')
    }
    if (!datos.razonSocial.trim()) {
      throw errorCampo('razonSocial', 'La razón social es obligatoria.', 'Obligatoria')
    }
    if (datos.email && !validarEmail(datos.email)) {
      throw errorCampo('email', 'El correo no es válido.', 'Formato incorrecto')
    }
    const resultado = await latencia({ ...datos, ruc })
    db.empresa = resultado
    persistir()
    return resultado
  },
}

/** Impuestos y cargos: un único registro por cuenta. */
export const impuestosService = {
  async obtener(): Promise<ConfigImpuestos> {
    return latencia(db.impuestos)
  },

  async guardar(datos: ConfigImpuestos): Promise<ConfigImpuestos> {
    if (!esPorcentaje(datos.igvPorcentaje, 30)) {
      throw errorCampo('igvPorcentaje', 'El IGV debe estar entre 0 % y 30 %.', 'Fuera de rango')
    }
    if (!esPorcentaje(datos.recargoConsumoPorcentaje, 13)) {
      throw errorCampo(
        'recargoConsumoPorcentaje',
        'El recargo al consumo no puede superar el 13 %.',
        'Máximo 13 %',
      )
    }
    if (!Number.isFinite(datos.icbperMonto) || datos.icbperMonto < 0) {
      throw errorCampo('icbperMonto', 'El ICBPER no puede ser negativo.', 'Monto inválido')
    }
    const resultado = await latencia(datos)
    db.impuestos = resultado
    persistir()
    return resultado
  },
}
