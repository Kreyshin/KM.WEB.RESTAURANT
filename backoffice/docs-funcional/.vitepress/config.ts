import { defineConfig } from 'vitepress'

const REPO = 'KM.WEB.RESTAURANT'
const DEMO = `https://kreyshin.github.io/${REPO}/demo/`
const TECNICA = `https://kreyshin.github.io/${REPO}/`

/**
 * Sitio de documentación FUNCIONAL, independiente del técnico.
 *
 * Vive en `/funcional/` y no comparte navegación con la guía técnica: aquí no
 * se habla de arquitectura, componentes ni modelo de datos. El lector es quien
 * opera el restaurante —sala, cocina, almacén, administración—, o quien
 * necesita entender el alcance antes de decidir.
 */
export default defineConfig({
  lang: 'es-PE',
  title: 'Mesa',
  description: 'Cómo funciona el back office de restaurante de KM.Restaurante',
  base: `/${REPO}/funcional/`,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `/${REPO}/funcional/favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#0d1014' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'Mesa · Guía funcional',

    nav: [
      { text: 'Guía', link: '/conceptos', activeMatch: '^/(conceptos|el-servicio|roles)' },
      { text: 'Módulos', link: '/modulos/', activeMatch: '/modulos/' },
      { text: 'Procesos', link: '/procesos/mesa', activeMatch: '/procesos/' },
      { text: 'Glosario', link: '/glosario' },
      { text: 'Ver demo', link: DEMO, target: '_blank' },
      { text: 'Documentación técnica', link: TECNICA, target: '_blank' },
    ],

    sidebar: [
      {
        text: 'Entender el sistema',
        items: [
          { text: 'Qué es Mesa', link: '/introduccion' },
          { text: 'Conceptos base', link: '/conceptos' },
          { text: 'El servicio', link: '/el-servicio' },
          { text: 'Quién hace qué', link: '/roles' },
        ],
      },
      {
        text: 'Módulos',
        items: [
          { text: 'Resumen', link: '/modulos/' },
          { text: 'Sala', link: '/modulos/sala' },
          { text: 'Carta y precios', link: '/modulos/carta' },
          { text: 'Inventario y recetas', link: '/modulos/inventario' },
          { text: 'Compras', link: '/modulos/compras' },
          { text: 'Clientes y reservas', link: '/modulos/clientes' },
          { text: 'Configuración', link: '/modulos/configuracion' },
        ],
      },
      {
        text: 'Procesos de principio a fin',
        items: [
          { text: 'Una mesa', link: '/procesos/mesa' },
          { text: 'Del plato al insumo', link: '/procesos/receta' },
          { text: 'El precio de un plato', link: '/procesos/precio' },
          { text: 'Una compra', link: '/procesos/compra' },
          { text: 'Lo que se pierde', link: '/procesos/mermas' },
        ],
      },
      {
        text: 'Referencia',
        items: [
          { text: 'Glosario', link: '/glosario' },
          { text: 'Qué está listo', link: '/estado' },
          { text: 'Preguntas frecuentes', link: '/preguntas' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: `https://github.com/Kreyshin/${REPO}` }],
    editLink: {
      pattern: `https://github.com/Kreyshin/${REPO}/edit/main/backoffice/docs-funcional/:path`,
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
      message: 'Back office Mesa · Un sistema Karma Systems',
    },
  },
})
