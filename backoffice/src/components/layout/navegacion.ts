import type { Rol } from '@/types'

/**
 * Estructura de navegación del shell Karma.
 *
 * La barra principal (100px) lista los MÓDULOS; el menú contextual (325px)
 * muestra únicamente las SECCIONES del módulo activo, según la guía de
 * identidad visual de Karma Corp.
 */

export interface SeccionNav {
  nombreRuta: string
  etiqueta: string
  descripcion?: string
  roles?: Rol[]
}

export interface ModuloNav {
  id: string
  etiqueta: string
  /** Path de un icono SVG de 24×24 (stroke, sin fill). */
  icono: string
  secciones: SeccionNav[]
}

export const modulos: ModuloNav[] = [
  {
    id: 'inicio',
    etiqueta: 'Inicio',
    icono: 'M3 12l9-9 9 9M5 10v10h14V10',
    secciones: [
      { nombreRuta: 'dashboard', etiqueta: 'Dashboard', descripcion: 'Estado de la sala en vivo' },
      {
        nombreRuta: 'componentes',
        etiqueta: 'Guía de componentes',
        descripcion: 'Piezas base de la interfaz',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'sala',
    etiqueta: 'Sala',
    icono: 'M4 9h16M6 9v11M18 9v11M3 5h18v4H3z',
    secciones: [
      {
        nombreRuta: 'salones',
        etiqueta: 'Salones',
        descripcion: 'Zonas físicas del local',
        roles: ['admin'],
      },
      {
        nombreRuta: 'mesas',
        etiqueta: 'Mesas',
        descripcion: 'Plano, estados y asignación',
      },
    ],
  },
  {
    id: 'operacion',
    etiqueta: 'Operación',
    icono: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4zM8 8h7M8 12h7',
    secciones: [
      {
        nombreRuta: 'carta',
        etiqueta: 'Carta y menú',
        descripcion: 'Categorías, precios y variantes',
        roles: ['admin'],
      },
      {
        nombreRuta: 'inventario',
        etiqueta: 'Inventario',
        descripcion: 'Insumos y control de stock',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'administracion',
    etiqueta: 'Admin',
    icono: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    secciones: [
      {
        nombreRuta: 'reportes',
        etiqueta: 'Reportes y caja',
        descripcion: 'Ventas y cierre de caja',
        roles: ['admin', 'cajero'],
      },
      {
        nombreRuta: 'facturacion',
        etiqueta: 'Facturación SUNAT',
        descripcion: 'Comprobantes electrónicos',
        roles: ['admin', 'cajero'],
      },
      {
        nombreRuta: 'usuarios',
        etiqueta: 'Usuarios y roles',
        descripcion: 'Personal y permisos',
        roles: ['admin'],
      },
    ],
  },
]

/** Módulo al que pertenece una ruta, para resaltar la barra principal. */
export function moduloDeRuta(nombreRuta?: string | symbol | null): ModuloNav | undefined {
  if (!nombreRuta) return undefined
  return modulos.find((m) => m.secciones.some((s) => s.nombreRuta === nombreRuta))
}

export const etiquetasRol: Record<Rol, string> = {
  admin: 'Administrador',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
}
