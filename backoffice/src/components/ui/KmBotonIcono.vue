<script setup lang="ts">
import { computed } from 'vue'

export type IconoAccion = 'editar' | 'eliminar' | 'subir' | 'bajar' | 'ver'

const props = withDefaults(
  defineProps<{
    icono: IconoAccion
    /** Nombre accesible y texto del tooltip: «Editar Terraza». */
    etiqueta: string
    tono?: 'neutro' | 'peligro'
    disabled?: boolean
  }>(),
  { tono: 'neutro', disabled: false },
)

defineEmits<{ click: [evento: MouseEvent] }>()

/** Trazos de 24×24, línea sin relleno, con la misma familia que el resto de la interfaz. */
const trazos: Record<IconoAccion, string[]> = {
  editar: ['M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z', 'M13.5 6.5l3 3'],
  eliminar: [
    'M4 7h16',
    'M10 11v6M14 11v6',
    'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12',
    'M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
  ],
  subir: ['M18 15l-6-6-6 6'],
  bajar: ['M6 9l6 6 6-6'],
  ver: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
}

const clases = computed(() =>
  props.tono === 'peligro'
    ? 'text-tenue hover:bg-vino/10 hover:text-vino focus-visible:text-vino'
    : 'text-tenue hover:bg-seleccion hover:text-tinta focus-visible:text-tinta',
)
</script>

<template>
  <span class="group relative inline-flex">
    <button
      type="button"
      class="grid size-9 place-items-center rounded-control transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40"
      :class="clases"
      :aria-label="etiqueta"
      :disabled="disabled"
      @click="$emit('click', $event)"
    >
      <svg
        class="size-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path v-for="d in trazos[icono]" :key="d" :d="d" />
      </svg>
    </button>

    <!-- Tooltip propio: aparece al instante con ratón y con foco de teclado. -->
    <span
      role="presentation"
      class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 rounded-md bg-rail px-2 py-1 text-[11px] font-medium whitespace-nowrap text-rail-tinta opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
    >
      {{ etiqueta }}
    </span>
  </span>
</template>
