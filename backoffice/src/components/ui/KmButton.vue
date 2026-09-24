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

/**
 * El tamaño del control no es una constante del kit: lo pone la postura desde
 * la que se usa la pantalla. Fuera del modo operación valen los 40px de
 * siempre; dentro, cada vertical impone los suyos (ver `--km-toque` en
 * `assets/main.css`). `sm` se queda fijo: es el botón de una fila de tabla,
 * no un objetivo táctil.
 */
const tamanos: Record<Tamano, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 min-h-[var(--km-toque,2.5rem)] py-2 text-[length:var(--km-texto,0.875rem)] gap-2',
  lg: 'px-6 min-h-[calc(var(--km-toque,2.5rem)+0.25rem)] py-2.5 text-[length:var(--km-texto,0.875rem)] gap-2',
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
