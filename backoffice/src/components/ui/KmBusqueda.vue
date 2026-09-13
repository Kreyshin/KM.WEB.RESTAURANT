<script setup lang="ts">
withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Buscar…' })

const termino = defineModel<string>({ default: '' })
</script>

<template>
  <div class="relative w-full sm:w-64">
    <svg
      class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path stroke-linecap="round" d="m20 20-3.5-3.5" />
    </svg>
    <input
      v-model="termino"
      type="search"
      :placeholder="placeholder"
      :aria-label="placeholder"
      class="h-9 w-full rounded-control border border-linea bg-panel pr-8 pl-9 text-sm text-tinta placeholder:text-tenue/70 focus:border-verde [&::-webkit-search-cancel-button]:hidden"
    />
    <button
      v-if="termino"
      type="button"
      class="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded text-tenue hover:text-tinta"
      aria-label="Limpiar búsqueda"
      @click="termino = ''"
    >
      ×
    </button>
  </div>
</template>
