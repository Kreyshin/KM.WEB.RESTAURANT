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
        path: 'carta',
        name: 'carta',
        component: () => import('@/views/carta/CartaView.vue'),
        meta: { titulo: 'Carta y menú', roles: ['admin'] },
      },
      {
        path: 'inventario',
        name: 'inventario',
        // TODO(fase 1.2): apuntar a @/views/inventario/InventarioView.vue
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Inventario', roles: ['admin'] },
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
