import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { createPinia } from 'pinia'
import Demo from './Demo.vue'
import Layout from './Layout.vue'
import '@vuepic/vue-datepicker/dist/main.css'
import '@/assets/main.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // Los componentes del back office leen stores de Pinia (tema, avisos).
    app.use(createPinia())
    app.component('Demo', Demo)
  },
} satisfies Theme
