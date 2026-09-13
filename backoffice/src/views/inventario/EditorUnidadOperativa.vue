<script setup lang="ts">
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import type { UnidadOperativa } from '@/types'

/** Una unidad de operación: nombre libre y cuánto equivale en la unidad de stock. */
defineProps<{ etiqueta: string; unidadBase: string; error?: string }>()
const unidad = defineModel<UnidadOperativa | undefined>()

function cambiar(campo: 'nombre' | 'factor', valor: string | number | null | undefined) {
  const actual = unidad.value ?? { nombre: '', factor: 1 }
  unidad.value = {
    ...actual,
    [campo]: campo === 'factor' ? Number(valor) || 0 : String(valor ?? ''),
  }
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-medium text-tinta">{{ etiqueta }}</span>
    <div class="grid grid-cols-[1fr_auto_10rem] items-center gap-2">
      <KmInput
        :model-value="unidad?.nombre ?? ''"
        :placeholder="`Ej. Caja, Jaba x30 · vacío = ${unidadBase}`"
        :aria-label="`${etiqueta}: nombre`"
        @update:model-value="cambiar('nombre', $event)"
      />
      <span class="text-sm text-tenue">equivale a</span>
      <KmNumero
        :model-value="unidad?.nombre ? unidad.factor : 1"
        :min="0"
        :decimales="3"
        :controles="false"
        :sufijo="unidadBase"
        :disabled="!unidad?.nombre"
        :aria-label="`${etiqueta}: equivalencia`"
        @update:model-value="cambiar('factor', $event)"
      />
    </div>
    <p v-if="error" class="text-xs font-medium text-vino">{{ error }}</p>
  </div>
</template>
