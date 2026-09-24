import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { Rol } from '@/types'
import { useAuthStore } from '@/stores/auth.store'

declare module 'vue-router' {
  interface RouteMeta {
    /** Título mostrado en la topbar y en document.title. */
    titulo?: string
    /** Ruta pública (no requiere sesión). */
    publica?: boolean
    /** Roles autorizados. Sin definir = cualquier usuario autenticado. */
    roles?: Rol[]
  }
}

const rutas: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { publica: true, titulo: 'Iniciar sesión' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { titulo: 'Dashboard' },
      },
      {
        path: 'salones',
        name: 'salones',
        component: () => import('@/views/salones/SalonesView.vue'),
        meta: { titulo: 'Salones', roles: ['admin'] },
      },
      {
        path: 'mesas',
        name: 'mesas',
        component: () => import('@/views/mesas/MesasView.vue'),
        meta: { titulo: 'Mesas' },
      },
      {
        path: 'mesas/reloj',
        name: 'reloj-servicio',
        component: () => import('@/views/mesas/RelojServicioView.vue'),
        meta: { titulo: 'Reloj del servicio' },
      },
      {
        path: 'carta',
        name: 'carta',
        component: () => import('@/views/carta/CartaView.vue'),
        meta: { titulo: 'Carta y menú', roles: ['admin'] },
      },
      {
        path: 'carta/listas-precios',
        name: 'listas-precios',
        component: () => import('@/views/carta/ListasPreciosView.vue'),
        meta: { titulo: 'Listas de precios', roles: ['admin'] },
      },
      {
        path: 'combos',
        name: 'combos',
        component: () => import('@/views/carta/CombosView.vue'),
        meta: { titulo: 'Combos y menús', roles: ['admin'] },
      },
      {
        path: 'inventario',
        name: 'inventario',
        component: () => import('@/views/inventario/InsumosView.vue'),
        meta: { titulo: 'Insumos', roles: ['admin'] },
      },
      {
        path: 'inventario/movimientos',
        name: 'inv-movimientos',
        component: () => import('@/views/inventario/MovimientosView.vue'),
        meta: { titulo: 'Movimientos y kardex', roles: ['admin'] },
      },
      {
        path: 'inventario/recetas',
        name: 'inv-recetas',
        component: () => import('@/views/inventario/RecetasView.vue'),
        meta: { titulo: 'Recetas y costos', roles: ['admin'] },
      },
      {
        path: 'inventario/transformaciones',
        name: 'inv-transformaciones',
        component: () => import('@/views/inventario/TransformacionesView.vue'),
        meta: { titulo: 'Transformaciones', roles: ['admin'] },
      },
      {
        path: 'inventario/parametros',
        name: 'inv-parametros',
        component: () => import('@/views/inventario/ParametrosAbastecimientoView.vue'),
        meta: { titulo: 'Parámetros de abastecimiento', roles: ['admin'] },
      },
      {
        path: 'inventario/stock',
        name: 'inv-stock-detalle',
        component: () => import('@/views/inventario/StockDetalleView.vue'),
        meta: { titulo: 'Stock', roles: ['admin'] },
      },
      {
        path: 'inventario/ubicaciones',
        name: 'inv-ubicaciones',
        component: () => import('@/views/inventario/UbicacionesView.vue'),
        meta: { titulo: 'Ubicaciones', roles: ['admin'] },
      },
      {
        path: 'inventario/zonas',
        name: 'inv-zonas',
        component: () => import('@/views/inventario/ZonasView.vue'),
        meta: { titulo: 'Almacén y zonas', roles: ['admin'] },
      },
      {
        path: 'compras/solicitudes',
        name: 'compras-solicitudes',
        component: () => import('@/views/compras/SolicitudesView.vue'),
        meta: { titulo: 'Solicitudes de compra', roles: ['admin'] },
      },
      {
        path: 'compras/requerimientos',
        name: 'compras-requerimientos',
        component: () => import('@/views/compras/RequerimientosView.vue'),
        meta: { titulo: 'Requerimientos de compra', roles: ['admin'] },
      },
      {
        path: 'compras/recepcion',
        name: 'compras-recepcion',
        component: () => import('@/views/compras/RecepcionView.vue'),
        meta: { titulo: 'Recepción', roles: ['admin'] },
      },
      {
        path: 'inventario/produccion',
        name: 'inv-produccion',
        component: () => import('@/views/inventario/ProduccionView.vue'),
        meta: { titulo: 'Producción', roles: ['admin'] },
      },
      {
        path: 'compras/articulos',
        name: 'compras-articulos',
        component: () => import('@/views/compras/ArticulosView.vue'),
        meta: { titulo: 'Artículos', roles: ['admin'] },
      },
      {
        path: 'compras/proveedores',
        name: 'compras-proveedores',
        component: () => import('@/views/compras/ProveedoresView.vue'),
        meta: { titulo: 'Proveedores', roles: ['admin'] },
      },
      {
        path: 'compras/marcas',
        name: 'compras-marcas',
        component: () => import('@/views/compras/MarcasView.vue'),
        meta: { titulo: 'Marcas', roles: ['admin'] },
      },
      { path: 'compras', redirect: { name: 'compras-solicitudes' } },
      { path: 'configuracion', redirect: { name: 'config-vertical' } },
      {
        path: 'configuracion/vertical',
        name: 'config-vertical',
        component: () => import('@/views/configuracion/ConfigVerticalView.vue'),
        meta: { titulo: 'Configuración de la vertical', roles: ['admin'] },
      },
      {
        path: 'configuracion/local',
        name: 'config-local',
        component: () => import('@/views/configuracion/ConfigLocalView.vue'),
        meta: { titulo: 'Configuración por local', roles: ['admin'] },
      },
      {
        path: 'configuracion/roles',
        name: 'config-roles',
        component: () => import('@/views/configuracion/RolesPermisosView.vue'),
        meta: { titulo: 'Permisos por rol', roles: ['admin'] },
      },
      {
        path: 'configuracion/excepciones',
        name: 'config-excepciones',
        component: () => import('@/views/configuracion/ExcepcionesUsuarioView.vue'),
        meta: { titulo: 'Excepciones por usuario', roles: ['admin'] },
      },
      {
        path: 'clientes',
        name: 'clientes',
        component: () => import('@/views/clientes/ClientesView.vue'),
        meta: { titulo: 'Clientes', roles: ['admin'] },
      },
      {
        path: 'reservas',
        name: 'reservas',
        component: () => import('@/views/clientes/ReservasView.vue'),
        meta: { titulo: 'Reservas', roles: ['admin'] },
      },
      {
        path: 'personal/turnos',
        name: 'personal-turnos',
        component: () => import('@/views/personal/TurnosView.vue'),
        meta: { titulo: 'Turnos', roles: ['admin'] },
      },
      {
        path: 'personal/bitacora',
        name: 'personal-bitacora',
        component: () => import('@/views/personal/BitacoraView.vue'),
        meta: { titulo: 'Bitácora', roles: ['admin'] },
      },
      {
        path: 'configuracion/cadenas',
        name: 'config-cadenas',
        component: () => import('@/views/configuracion/CadenasView.vue'),
        meta: { titulo: 'Cadenas', roles: ['admin'] },
      },
      {
        path: 'karma/integracion',
        name: 'karma-integracion',
        component: () => import('@/views/karma/ConsolaIntegracionView.vue'),
        meta: { titulo: 'Consola Karma · Integración', roles: ['admin'] },
      },
      {
        path: 'configuracion/canales',
        name: 'config-canales',
        component: () => import('@/views/configuracion/CanalesView.vue'),
        meta: { titulo: 'Canales de venta', roles: ['admin'] },
      },
      {
        path: 'configuracion/areas',
        name: 'config-areas',
        component: () => import('@/views/configuracion/AreasView.vue'),
        meta: { titulo: 'Áreas e impresoras', roles: ['admin'] },
      },
      {
        path: 'configuracion/motivos',
        name: 'config-motivos',
        component: () => import('@/views/configuracion/MotivosView.vue'),
        meta: { titulo: 'Motivos', roles: ['admin'] },
      },
      {
        path: 'reportes',
        name: 'reportes',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Reportes y caja', roles: ['admin', 'cajero'] },
      },
      {
        path: 'usuarios',
        name: 'usuarios',
        // TODO(fase 1.3): apuntar a @/views/usuarios/UsuariosView.vue
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Usuarios y roles', roles: ['admin'] },
      },
      {
        path: 'facturacion',
        name: 'facturacion',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Facturación SUNAT', roles: ['admin', 'cajero'] },
      },
    ],
  },
  {
    path: '/componentes',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'componentes',
        component: () => import('@/views/guia/GuiaComponentesView.vue'),
        meta: { titulo: 'Guía de componentes', roles: ['admin'] },
      },
    ],
  },
  {
    path: '/sin-permiso',
    name: 'sin-permiso',
    component: () => import('@/views/SinPermisoView.vue'),
    meta: { publica: true, titulo: 'Sin permiso' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'no-encontrado',
    component: () => import('@/views/NoEncontradoView.vue'),
    meta: { publica: true, titulo: 'Página no encontrada' },
  },
]

export const router = createRouter({
  // La demo de GitHub Pages usa hash (#/salones): Pages no reescribe subrutas al index.html.
  history:
    import.meta.env.MODE === 'demo'
      ? createWebHashHistory(import.meta.env.BASE_URL)
      : createWebHistory(import.meta.env.BASE_URL),
  routes: rutas,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.publica) {
    // Un usuario con sesión no debería volver al login.
    if (to.name === 'login' && auth.autenticado) return { name: 'dashboard' }
    return true
  }

  if (!auth.autenticado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!auth.puede(to.meta.roles)) {
    return { name: 'sin-permiso' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.titulo ? `${to.meta.titulo} · Mesa` : 'Mesa · Gestión de restaurante'
})
