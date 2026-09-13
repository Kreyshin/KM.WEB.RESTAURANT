import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, postcssIsolateStyles } from 'vitepress'

const REPO = 'KM.WEB.RESTAURANT'
const DEMO = `https://kreyshin.github.io/${REPO}/demo/`

export default defineConfig({
  lang: 'es-PE',
  title: 'Mesa',
  description: 'Documentación del back office de KM.Restaurante',
  base: `/${REPO}/`,
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `/${REPO}/favicon.svg` }]],

  vite: {
    // Las demos importan los componentes reales del back office.
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('../../src', import.meta.url)),
      },
    },
    css: {
      postcss: {
        // Aísla las demos (.vp-raw) de los estilos de prosa y base de VitePress.
        plugins: [postcssIsolateStyles({ includeFiles: [/base\.css/, /vp-doc\.css/] })],
      },
    },
    ssr: {
      // La librería de fechas trae CSS y código de navegador: se empaqueta con la docs.
      noExternal: ['@vuepic/vue-datepicker'],
    },
  },

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'Mesa · Docs',

    nav: [
      { text: 'Guía', link: '/guia/introduccion', activeMatch: '/guia/' },
      { text: 'Componentes', link: '/componentes/', activeMatch: '/componentes/' },
      { text: 'Entidades', link: '/guia/entidades' },
      { text: 'Ver demo', link: DEMO, target: '_blank' },
    ],

    sidebar: {
      '/guia/': [
        {
          text: 'Empezar',
          items: [
            { text: 'Introducción', link: '/guia/introduccion' },
            { text: 'Estructura del proyecto', link: '/guia/estructura' },
            { text: 'Módulos y navegación', link: '/guia/modulos' },
          ],
        },
        {
          text: 'Arquitectura',
          items: [
            { text: 'Capa de datos mock', link: '/guia/datos-mock' },
            { text: 'Listados con useListado', link: '/guia/listados' },
            { text: 'Crear un módulo nuevo', link: '/guia/nuevo-modulo' },
            { text: 'Sistema de diseño', link: '/guia/diseno' },
          ],
        },
        {
          text: 'Producto',
          items: [
            { text: 'Entidades del dominio', link: '/guia/entidades' },
            { text: 'Roadmap', link: '/guia/roadmap' },
            { text: 'Publicación', link: '/guia/publicacion' },
          ],
        },
      ],
      '/componentes/': [
        {
          text: 'Componentes',
          items: [
            { text: 'Resumen', link: '/componentes/' },
            { text: 'KmCatalogo', link: '/componentes/catalogo' },
            { text: 'KmTable y paginación', link: '/componentes/tabla' },
            { text: 'KmTabs', link: '/componentes/tabs' },
            { text: 'KmDrawer', link: '/componentes/drawer' },
            { text: 'KmModal y KmConfirm', link: '/componentes/modal' },
            { text: 'KmFecha y KmRangoFechas', link: '/componentes/fechas' },
            { text: 'Formularios', link: '/componentes/formularios' },
            { text: 'KmButton y KmBadge', link: '/componentes/botones' },
            { text: 'KmUploadImagen', link: '/componentes/imagen' },
            { text: 'KmEstado', link: '/componentes/estados' },
            { text: 'Búsqueda y exportación', link: '/componentes/busqueda-exportacion' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: `https://github.com/Kreyshin/${REPO}` }],
    editLink: {
      pattern: `https://github.com/Kreyshin/${REPO}/edit/main/backoffice/docs/:path`,
      text: 'Editar esta página en GitHub',
    },
    outline: { label: 'En esta página', level: [2, 3] },
    docFooter: { prev: 'Anterior', next: 'Siguiente' },
    lastUpdated: { text: 'Actualizado' },
    darkModeSwitchLabel: 'Tema',
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Menú',
    search: { provider: 'local' },
    footer: {
      message: 'Back office Mesa · Un sistema Karma Corp',
    },
  },
})
