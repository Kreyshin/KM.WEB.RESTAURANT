<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

export type IconoAccion = 'editar' | 'eliminar' | 'subir' | 'bajar' | 'ver'

const props = withDefaults(
  defineProps<{
    icono: IconoAccion
    /** Texto corto del tooltip: «Editar». */
    etiqueta: string
    /**
     * Registro sobre el que actúa: «Terraza». No se ve, pero completa el nombre
     * accesible («Editar Terraza») para lectores de pantalla y pruebas.
     */
    contexto?: string
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

const nombreAccesible = computed(() =>
  props.contexto ? `${props.etiqueta} ${props.contexto}` : props.etiqueta,
)

const clases = computed(() =>
  props.tono === 'peligro'
    ? 'text-vino hover:border-vino/60 hover:bg-vino/10'
    : 'text-tenue hover:border-verde hover:text-verde',
)

// ── Tooltip ──
// Se teletransporta a <body> con posición fija: así no lo recorta ni genera
// scroll el contenedor con overflow de la tabla.
const boton = ref<HTMLButtonElement | null>(null)
const tooltip = ref<HTMLElement | null>(null)
const visible = ref(false)
const posicion = ref({ top: 0, left: 0 })

async function mostrar() {
  if (props.disabled || !boton.value) return
  visible.value = true
  await nextTick()
  const r = boton.value.getBoundingClientRect()
  const ancho = tooltip.value?.offsetWidth ?? 0
  const margen = 8
  // Centrado sobre el botón, sin salirse de la ventana.
  const left = Math.min(
    Math.max(r.left + r.width / 2 - ancho / 2, margen),
    window.innerWidth - ancho - margen,
  )
  posicion.value = { top: r.top - 6, left }
}

function ocultar() {
  visible.value = false
}
</script>

<template>
  <button
    ref="boton"
    type="button"
    class="grid size-8 place-items-center rounded-control border border-linea bg-panel transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40"
    :class="clases"
    :aria-label="nombreAccesible"
    :disabled="disabled"
    @click="$emit('click', $event)"
    @mouseenter="mostrar"
    @mouseleave="ocultar"
    @focus="mostrar"
    @blur="ocultar"
  >
    <svg
      class="size-4"
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

  <Teleport to="body">
    <span
      v-if="visible"
      ref="tooltip"
      role="presentation"
      class="pointer-events-none fixed z-[70] -translate-y-full rounded-md bg-rail px-2 py-1 text-[11px] font-medium whitespace-nowrap text-rail-tinta shadow-md"
      :style="{ top: `${posicion.top}px`, left: `${posicion.left}px` }"
    >
      {{ etiqueta }}
    </span>
  </Teleport>
</template>
