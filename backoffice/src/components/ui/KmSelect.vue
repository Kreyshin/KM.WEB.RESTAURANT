<script setup lang="ts">
import type { OpcionSelect } from '@/types/ui'

withDefaults(
  defineProps<{
    id?: string
    opciones: OpcionSelect[]
    placeholder?: string
    /** Nombre accesible cuando el select no tiene label visible. */
    etiqueta?: string
    invalido?: boolean
    disabled?: boolean
  }>(),
  { invalido: false, disabled: false },
)

const modelo = defineModel<string | number | undefined>()
</script>

<template>
  <div class="relative">
    <select
      :id="id"
      v-model="modelo"
      :disabled="disabled"
      :aria-label="etiqueta"
      :aria-invalid="invalido || undefined"
      class="rs-campo min-h-10 w-full appearance-none rounded-control border bg-panel py-2 pr-9 pl-3 text-sm text-tinta transition-colors duration-200 disabled:bg-panel-2 disabled:text-tenue"
      :class="invalido ? 'border-vino' : 'border-linea focus:border-verde'"
    >
      <option v-if="placeholder" :value="undefined" disabled>{{ placeholder }}</option>
      <option v-for="o in opciones" :key="o.valor" :value="o.valor">{{ o.etiqueta }}</option>
    </select>

    <!-- La flecha va como SVG y no como background-image para heredar el tema. -->
    <svg
      class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-tenue"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  </div>
</template>
