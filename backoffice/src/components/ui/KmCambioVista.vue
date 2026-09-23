<script setup lang="ts">
/** Interruptor Tabla / Tarjetas. Recuerda la elección por pantalla. */
import { watch } from 'vue'

const props = defineProps<{ clave: string }>()
const modelo = defineModel<'tabla' | 'tarjetas'>({ default: 'tabla' })

try {
  const guardado = localStorage.getItem(`km.vista.${props.clave}`)
  if (guardado === 'tabla' || guardado === 'tarjetas') modelo.value = guardado
} catch {
  /* sin almacenamiento: se queda la vista por defecto */
}

watch(modelo, (v) => {
  try {
    localStorage.setItem(`km.vista.${props.clave}`, v)
  } catch {
    /* ignorar */
  }
})

const opciones = [
  { valor: 'tabla', etiqueta: 'Tabla', icono: 'M4 6h16M4 12h16M4 18h16' },
  {
    valor: 'tarjetas',
    etiqueta: 'Tarjetas',
    icono: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  },
] as const
</script>

<template>
  <div
    role="radiogroup"
    aria-label="Visualización"
    class="flex shrink-0 gap-0.5 rounded-control border border-linea bg-panel p-0.5"
  >
    <button
      v-for="o in opciones"
      :key="o.valor"
      type="button"
      role="radio"
      :aria-checked="modelo === o.valor"
      class="flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors"
      :class="modelo === o.valor ? 'bg-seleccion text-tinta' : 'text-tenue hover:text-tinta'"
      @click="modelo = o.valor"
    >
      <svg
        viewBox="0 0 24 24"
        class="size-3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path :d="o.icono" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
      {{ o.etiqueta }}
    </button>
  </div>
</template>
