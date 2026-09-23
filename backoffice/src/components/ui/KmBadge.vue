<script setup lang="ts">
import type { TonoMesa } from '@/types/ui'

withDefaults(defineProps<{ tono?: TonoMesa; punto?: boolean }>(), {
  tono: 'neutro',
  punto: false,
})

/** Los tonos se resuelven con color-mix en main.css, así valen en ambos temas. */
const clases: Record<TonoMesa, string> = {
  neutro: 'rs-tono-neutro',
  verde: 'rs-tono-verde',
  laton: 'rs-tono-laton',
  vino: 'rs-tono-vino',
  pizarra: 'rs-tono-pizarra',
}
</script>

<template>
  <span
    class="rs-tono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
    :class="clases[tono]"
  >
    <span
      v-if="punto"
      class="size-1.5 shrink-0 rounded-full"
      style="background-color: var(--rs-tono-color)"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
