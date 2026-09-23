<script setup lang="ts">
import { variantesAcceso, etiquetaVariante, type VarianteAcceso } from '@/config/acceso'

/**
 * Conmutador de variantes, visible solo mientras el producto se evalúa.
 *
 * Vive en una esquina y no compite con el formulario: es una herramienta de
 * revisión, no una preferencia del usuario final.
 */
const modelo = defineModel<VarianteAcceso>({ required: true })
</script>

<template>
  <div
    class="fixed right-4 bottom-4 z-40 flex items-center gap-1 rounded-full border border-white/15 bg-black/55 p-1 backdrop-blur-md"
    role="group"
    aria-label="Variante de la pantalla de acceso"
  >
    <span class="rs-etiqueta px-2.5 text-white/45">Acceso</span>
    <button
      v-for="v in variantesAcceso"
      :key="v"
      type="button"
      class="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
      :class="modelo === v ? 'bg-white text-[#0d1014]' : 'text-white/70 hover:text-white'"
      :aria-pressed="modelo === v"
      @click="modelo = v"
    >
      {{ etiquetaVariante[v] }}
    </button>
  </div>
</template>
