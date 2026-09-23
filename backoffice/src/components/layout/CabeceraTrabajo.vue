<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SelectorLocal from './SelectorLocal.vue'
import { moduloDeRuta } from './navegacion'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const localStore = useLocalStore()
const route = useRoute()

/** Migas: módulo › sección. El módulo no es navegable, solo orienta. */
const modulo = computed(() => moduloDeRuta(route.name))

const esMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

onMounted(() => {
  localStore.cargar().catch(() => ui.error('No se pudieron cargar los locales.'))
})
</script>

<template>
  <header class="shrink-0 border-b border-linea bg-panel px-6 py-4">
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="rounded-control p-2 text-tenue transition-colors hover:bg-seleccion hover:text-tinta"
        :aria-label="ui.menuAbierto ? 'Ocultar secciones' : 'Mostrar secciones'"
        @click="ui.alternarMenu()"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="min-w-0">
        <nav v-if="modulo" aria-label="Ubicación" class="mb-0.5">
          <ol class="flex items-center gap-1.5 text-xs text-tenue">
            <li>{{ modulo.etiqueta }}</li>
            <li aria-hidden="true" class="text-laton-texto">›</li>
            <li aria-current="page" class="truncate">{{ route.meta.titulo }}</li>
          </ol>
        </nav>
        <h1 class="rs-titulo-pagina truncate text-tinta">{{ route.meta.titulo }}</h1>
      </div>

      <div class="flex-1" />

      <button
        type="button"
        class="flex h-9 items-center gap-2 rounded-control border border-linea bg-lienzo px-2.5 text-sm text-tenue transition-colors hover:border-verde hover:text-tinta md:w-56"
        aria-label="Buscar en el back office"
        @click="ui.buscadorAbierto = true"
      >
        <svg
          class="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path stroke-linecap="round" d="m20 20-3.5-3.5" />
        </svg>
        <span class="hidden flex-1 text-left md:inline">Buscar…</span>
        <kbd
          class="hidden rounded border border-linea bg-panel px-1.5 font-sans text-[11px] md:inline"
        >
          {{ esMac ? '⌘' : 'Ctrl' }} K
        </kbd>
      </button>

      <!-- Local activo: dato de contexto permanente, en el registro «de carta». -->
      <div class="hidden items-center gap-3 sm:flex">
        <div class="h-9 w-px bg-linea" role="presentation" />
        <SelectorLocal />
      </div>
    </div>
  </header>
</template>
