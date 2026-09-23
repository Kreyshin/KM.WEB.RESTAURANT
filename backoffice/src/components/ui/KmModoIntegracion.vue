<script setup lang="ts">
import { computed } from 'vue'
import { descripcionModo, etiquetaCapacidad, modoIntegracion } from '@/services/integracion.service'
import type { CapacidadIntegracion } from '@/types'

/**
 * Cómo trabaja una capacidad con el ERP en un local (D-009). Autónomo no
 * muestra nada salvo que se pida: es el estado normal de la vertical.
 */
const props = withDefaults(
  defineProps<{ capacidad: CapacidadIntegracion; localId?: string; mostrarAutonomo?: boolean }>(),
  { mostrarAutonomo: false },
)

const modo = computed(() => modoIntegracion(props.capacidad, props.localId))
const texto = computed(
  () =>
    ({
      autonomo: 'Autónomo',
      sincronizado: 'Sincronizado con el ERP',
      delegado: 'Delegado al ERP',
    })[modo.value],
)
</script>

<template>
  <span
    v-if="modo !== 'autonomo' || mostrarAutonomo"
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
    :class="
      modo === 'autonomo'
        ? 'border-linea text-tenue'
        : modo === 'sincronizado'
          ? 'rs-tono rs-tono-pizarra'
          : 'rs-tono rs-tono-laton'
    "
    :title="`${etiquetaCapacidad[capacidad]}: ${descripcionModo[modo]}`"
  >
    <svg
      v-if="modo !== 'autonomo'"
      viewBox="0 0 24 24"
      class="size-3.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      aria-hidden="true"
    >
      <path
        d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    {{ texto }}
  </span>
</template>
