<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tipo?: 'vacio' | 'error' | 'cargando'
    titulo?: string
    mensaje?: string
    compacto?: boolean
  }>(),
  { tipo: 'vacio', compacto: false },
)

const iconos = {
  // Plato vacío visto desde arriba.
  vacio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  error:
    'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  cargando: '',
}

const tituloPorDefecto = computed(
  () => ({ vacio: 'Sin registros', error: 'Algo salió mal', cargando: 'Cargando…' })[props.tipo],
)
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 px-6 text-center"
    :class="compacto ? 'py-8' : 'py-14'"
    :role="tipo === 'error' ? 'alert' : tipo === 'cargando' ? 'status' : undefined"
  >
    <div
      class="grid size-12 place-items-center rounded-full"
      :class="tipo === 'error' ? 'rs-tono rs-tono-vino border' : 'bg-panel-2 text-tenue'"
    >
      <svg
        v-if="tipo === 'cargando'"
        class="size-5 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2Z" />
      </svg>
      <svg
        v-else
        class="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="iconos[tipo]" />
      </svg>
    </div>

    <div class="flex max-w-sm flex-col gap-1">
      <p class="text-sm font-semibold text-tinta">{{ titulo ?? tituloPorDefecto }}</p>
      <p v-if="mensaje" class="text-sm text-tenue">{{ mensaje }}</p>
    </div>

    <div v-if="$slots.default" class="flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
