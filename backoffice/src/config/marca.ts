/**
 * Identidad del sistema de restaurante.
 *
 * Este vertical tiene lenguaje visual propio —verde comedor y latón sobre
 * marfil— definido en `src/assets/main.css`. La pertenencia a la plataforma se
 * mantiene como atribución explícita («Un sistema Karma Corp») con el isotipo
 * original, que se conserva en `src/components/marca/KarmaLogo.vue`.
 *
 * El tema de plataforma sigue disponible sin cambios en
 * `src/assets/karma/karma-identidad.css` por si el sistema debe reintegrarse.
 */

export interface Marca {
  /** Nombre del producto tal como se muestra en el shell. */
  nombre: string
  /** Descriptor corto bajo el nombre. */
  descriptor: string
  /** Atribución de plataforma. */
  plataforma: string
  /** Frase de portada. */
  lema: string
  /** Lo que resuelve el sistema, para la pantalla de acceso. */
  capacidades: string[]
}

export const marca: Marca = {
  nombre: 'Mesa',
  descriptor: 'Gestión de restaurante',
  plataforma: 'Un sistema Karma Corp',
  lema: 'El comedor, en orden.',
  capacidades: [
    'Salones y plano de mesas en tiempo real',
    'Comandas, cocina e inventario de insumos',
    'Cierre de caja y facturación electrónica SUNAT',
  ],
}
