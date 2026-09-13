<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'
import type { Pestana } from '@/types/ui'

const props = defineProps<{ pestanas: Pestana[]; etiqueta?: string }>()
const activa = defineModel<string>({ required: true })

const base = useId()
const botones = ref<HTMLButtonElement[]>([])

/** Navegación de teclado del patrón WAI-ARIA tabs: flechas, Inicio y Fin. */
async function alTeclear(evento: KeyboardEvent, indice: number) {
  const n = props.pestanas.length
  const destinos: Record<string, number> = {
    ArrowRight: (indice + 1) % n,
    ArrowLeft: (indice - 1 + n) % n,
    Home: 0,
    End: n - 1,
  }
  const destino = destinos[evento.key]
  if (destino === undefined) return
  evento.preventDefault()
  activa.value = props.pestanas[destino]!.valor
  await nextTick()
  botones.value[destino]?.focus()
}

defineExpose({ idPanel: (valor: string) => `${base}-panel-${valor}` })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      role="tablist"
      :aria-label="etiqueta"
      class="flex gap-1 overflow-x-auto border-b border-linea"
    >
      <button
        v-for="(p, i) in pestanas"
        :id="`${base}-tab-${p.valor}`"
        :key="p.valor"
        ref="botones"
        type="button"
        role="tab"
        :aria-selected="p.valor === activa"
        :aria-controls="`${base}-panel-${p.valor}`"
        :tabindex="p.valor === activa ? 0 : -1"
        class="relative -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors"
        :class="
          p.valor === activa
            ? 'border-laton text-tinta'
            : 'border-transparent text-tenue hover:text-tinta'
        "
        @click="activa = p.valor"
        @keydown="alTeclear($event, i)"
      >
        {{ p.etiqueta }}
        <span
          v-if="p.contador !== undefined"
          class="rounded-full bg-panel-2 px-1.5 py-0.5 text-[11px] font-semibold text-tenue tabular-nums"
        >
          {{ p.contador }}
        </span>
      </button>
    </div>

    <div
      :id="`${base}-panel-${activa}`"
      role="tabpanel"
      :aria-labelledby="`${base}-tab-${activa}`"
      tabindex="0"
    >
      <slot :activa="activa" />
    </div>
  </div>
</template>
