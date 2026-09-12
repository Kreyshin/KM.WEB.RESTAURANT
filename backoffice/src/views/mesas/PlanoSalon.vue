<script setup lang="ts">
import { ref } from 'vue'
import type { Mesa } from '@/types'
import { clasePlanoEstado, etiquetaEstado, formaPlano, glifoEstado } from '@/utils/mesas'

const props = defineProps<{
  mesas: Mesa[]
  /** Cuando es falso, el plano es de solo lectura (sin arrastre). */
  editable: boolean
}>()

const emit = defineEmits<{
  mover: [id: string, posX: number, posY: number]
  seleccionar: [mesa: Mesa]
}>()

const lienzo = ref<HTMLElement | null>(null)
const arrastrando = ref<string | null>(null)
/** Posición temporal durante el arrastre, para no escribir en el servidor en cada frame. */
const posicionTemporal = ref<{ x: number; y: number } | null>(null)
/** Distancia recorrida: sirve para distinguir un clic de un arrastre real. */
let recorrido = 0

function posicionDe(mesa: Mesa) {
  if (arrastrando.value === mesa.id && posicionTemporal.value) {
    return { left: `${posicionTemporal.value.x}%`, top: `${posicionTemporal.value.y}%` }
  }
  return { left: `${mesa.posX}%`, top: `${mesa.posY}%` }
}

function iniciarArrastre(mesa: Mesa, evento: PointerEvent) {
  if (!props.editable) return
  arrastrando.value = mesa.id
  posicionTemporal.value = { x: mesa.posX, y: mesa.posY }
  recorrido = 0
  ;(evento.target as HTMLElement).setPointerCapture(evento.pointerId)
}

function moverArrastre(evento: PointerEvent) {
  if (!arrastrando.value || !lienzo.value) return
  const caja = lienzo.value.getBoundingClientRect()
  const x = ((evento.clientX - caja.left) / caja.width) * 100
  const y = ((evento.clientY - caja.top) / caja.height) * 100
  recorrido += Math.abs(evento.movementX) + Math.abs(evento.movementY)
  // Se deja un margen para que la mesa no quede cortada contra el borde.
  posicionTemporal.value = {
    x: Math.min(92, Math.max(0, x)),
    y: Math.min(88, Math.max(0, y)),
  }
}

function terminarArrastre(mesa: Mesa) {
  if (!arrastrando.value) return
  const pos = posicionTemporal.value
  arrastrando.value = null
  posicionTemporal.value = null

  // Un movimiento mínimo se interpreta como clic: abre la mesa en vez de moverla.
  if (recorrido < 4) {
    emit('seleccionar', mesa)
    return
  }
  if (pos) emit('mover', mesa.id, pos.x, pos.y)
}
</script>

<template>
  <div
    ref="lienzo"
    class="rs-mantel relative h-[30rem] w-full overflow-hidden rounded-card border border-linea bg-panel-2"
  >
    <p
      v-if="mesas.length === 0"
      class="absolute inset-0 grid place-items-center text-sm text-tenue"
    >
      Este salón todavía no tiene mesas.
    </p>

    <button
      v-for="mesa in mesas"
      :key="mesa.id"
      type="button"
      class="rs-tono absolute flex touch-none flex-col items-center justify-center border-2 transition-shadow duration-200 select-none hover:shadow-md"
      :class="[
        formaPlano[mesa.forma],
        clasePlanoEstado[mesa.estado],
        editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        arrastrando === mesa.id ? 'z-10 shadow-lg' : '',
      ]"
      :style="posicionDe(mesa)"
      :title="`${mesa.codigo} · ${mesa.capacidad} personas · ${etiquetaEstado[mesa.estado]}`"
      @pointerdown="iniciarArrastre(mesa, $event)"
      @pointermove="moverArrastre"
      @pointerup="terminarArrastre(mesa)"
      @pointercancel="terminarArrastre(mesa)"
    >
      <span class="text-[13px] leading-none font-bold" aria-hidden="true">
        {{ glifoEstado[mesa.estado] }}
      </span>
      <span class="mt-1 text-xs leading-none font-bold">{{ mesa.codigo }}</span>
      <span class="mt-0.5 text-[10px] leading-none opacity-80">{{ mesa.capacidad }}p</span>
      <span class="sr-only">{{ etiquetaEstado[mesa.estado] }}</span>
    </button>
  </div>
</template>

<style scoped>
/* Mantel: retícula tenue ligada al borde del tema activo. */
.rs-mantel {
  background-image:
    linear-gradient(to right, var(--rs-border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--rs-border) 1px, transparent 1px);
  background-size: 2.25rem 2.25rem;
}
</style>
