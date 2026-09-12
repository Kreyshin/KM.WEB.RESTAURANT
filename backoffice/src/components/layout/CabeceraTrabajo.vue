<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const route = useRoute()

/**
 * Contexto global del espacio de trabajo. Cuando exista el módulo de empresas
 * esto vendrá de la sesión; por ahora es fijo.
 */
const local = 'Miraflores'
const razonSocial = 'Karma Corp'
</script>

<template>
  <header class="shrink-0 border-b border-linea bg-panel px-6 py-5">
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
        <h1 class="rs-titulo-pagina truncate text-tinta">{{ route.meta.titulo }}</h1>
      </div>

      <div class="flex-1" />

      <!-- Local activo: dato de contexto permanente, en el registro «de carta». -->
      <div class="hidden items-center gap-3 sm:flex">
        <div class="text-right">
          <p class="rs-etiqueta text-tenue">Local</p>
          <p class="rs-display text-sm font-semibold text-tinta">{{ local }}</p>
        </div>
        <div class="h-9 w-px bg-linea" role="presentation" />
        <p class="text-xs text-tenue">{{ razonSocial }}</p>
      </div>
    </div>
  </header>
</template>
