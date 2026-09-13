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
    id: 'carta',
    etiqueta: 'Carta',
    icono: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4zM8 8h7M8 12h7',
    secciones: [
      {
        nombreRuta: 'carta',
        etiqueta: 'Carta y menú',
        descripcion: 'Productos, categorías y precios',
        roles: ['admin'],
      },
      {
        nombreRuta: 'combos',
        etiqueta: 'Combos y menús',
        descripcion: 'Menú del día y promociones armadas',
        roles: ['admin'],
      },
      {
        nombreRuta: 'carta-pos',
        etiqueta: 'Vista POS',
        descripcion: 'Tarjetas de carta, menús y combos como en caja',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'inventario',
    etiqueta: 'Inventario',
    icono: 'M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10',
    secciones: [
      {
        nombreRuta: 'inventario',
        etiqueta: 'Insumos',
        descripcion: 'Stock y alertas de mínimo',
        roles: ['admin'],
      },
      {
        nombreRuta: 'inv-movimientos',
        etiqueta: 'Movimientos y kardex',
        descripcion: 'Entradas, salidas y traslados',
        roles: ['admin'],
      },
      {
        nombreRuta: 'inv-recetas',
        etiqueta: 'Recetas y costos',
        descripcion: 'Costo por plato y margen',
        roles: ['admin'],
      },
      {
        nombreRuta: 'inv-tomas',
        etiqueta: 'Toma de inventario',
        descripcion: 'Conteo físico y ajustes',
        roles: ['admin'],
      },
      {
        nombreRuta: 'inv-almacenes',
        etiqueta: 'Almacenes',
        descripcion: 'Dónde se guarda por local',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'compras',
    etiqueta: 'Compras',
    icono:
      'M3 4h2l2.4 11h11.2L21 8H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    secciones: [
      {
        nombreRuta: 'compras-ordenes',
        etiqueta: 'Órdenes de compra',
        descripcion: 'Pedidos y recepción',
        roles: ['admin'],
      },
      {
        nombreRuta: 'compras-proveedores',
        etiqueta: 'Proveedores',
        descripcion: 'Quién nos abastece',
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
  {
    id: 'configuracion',
    etiqueta: 'Config.',
    icono:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    secciones: [
      {
        nombreRuta: 'config-empresa',
        etiqueta: 'Empresa',
        descripcion: 'RUC, razón social y logo',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-locales',
        etiqueta: 'Locales',
        descripcion: 'Sucursales, horario y código SUNAT',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-impuestos',
        etiqueta: 'Impuestos y cargos',
        descripcion: 'IGV, recargo al consumo e ICBPER',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-medios-pago',
        etiqueta: 'Medios de pago',
        descripcion: 'Formas de cobro en caja',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-canales',
        etiqueta: 'Canales de venta',
        descripcion: 'Salón, llevar, delivery y apps',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-produccion',
        etiqueta: 'Estaciones e impresoras',
        descripcion: 'Dónde se prepara y se imprime',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-motivos',
        etiqueta: 'Motivos',
        descripcion: 'Anulación, descuento y cortesía',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-series',
        etiqueta: 'Series de comprobantes',
        descripcion: 'Numeración de comprobantes',
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
