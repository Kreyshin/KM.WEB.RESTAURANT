<script setup lang="ts">
import { computed } from 'vue'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
type Tamano = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variante?: Variante
    tamano?: Tamano
    type?: 'button' | 'submit' | 'reset'
    cargando?: boolean
    disabled?: boolean
    bloque?: boolean
  }>(),
  {
    variante: 'primario',
    tamano: 'md',
    type: 'button',
    cargando: false,
    disabled: false,
    bloque: false,
  },
)

const variantes: Record<Variante, string> = {
  primario: 'bg-accion text-white hover:bg-accion-hover',
  secundario: 'bg-panel text-tinta border border-linea hover:border-verde hover:text-verde',
  fantasma: 'text-tenue hover:bg-seleccion hover:text-tinta',
  peligro: 'bg-vino text-white hover:brightness-110',
}

/** Alturas mínimas de 40px en md/lg: objetivo táctil cómodo en sala. */
const tamanos: Record<Tamano, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 min-h-10 py-2 text-sm gap-2',
  lg: 'px-6 min-h-11 py-2.5 text-sm gap-2',
}

const clases = computed(() => [
  'inline-flex items-center justify-center rounded-control font-semibold tracking-[0.01em]',
  'transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none',
  variantes[props.variante],
  tamanos[props.tamano],
  props.bloque ? 'w-full' : '',
])
</script>

<template>
  <button :type="type" :class="clases" :disabled="disabled || cargando">
    <svg
      v-if="cargando"
      class="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
      <path
        class="opacity-90"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2Z"
      />
    </svg>
    <slot />
  </button>
</template>
