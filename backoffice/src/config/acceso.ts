/**
 * Variantes de la pantalla de acceso.
 *
 * Las tres comparten lógica, tipografía y paleta; cambian la puesta en escena.
 * La elegida se fija aquí y se puede previsualizar con `?acceso=` en la URL,
 * que es como se comparan sin tocar código.
 */
export const variantesAcceso = ['portada', 'salon', 'comanda'] as const

export type VarianteAcceso = (typeof variantesAcceso)[number]

export const etiquetaVariante: Record<VarianteAcceso, string> = {
  portada: 'Portada',
  salon: 'Salón',
  comanda: 'Comanda',
}

export const descripcionVariante: Record<VarianteAcceso, string> = {
  portada: 'Manifiesto a la izquierda, formulario a la derecha.',
  salon: 'El plano del comedor, con una pieza por mesa.',
  comanda: 'El acceso dentro de una comanda de cocina.',
}

/** La que se sirve por defecto. */
export const varianteAccesoPorDefecto: VarianteAcceso = 'salon'

export function esVarianteAcceso(valor: unknown): valor is VarianteAcceso {
  return typeof valor === 'string' && (variantesAcceso as readonly string[]).includes(valor)
}
