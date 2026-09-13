<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import KmButton from './KmButton.vue'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ exportar: [formato: 'csv' | 'excel'] }>()

const abierto = ref(false)
const contenedor = ref<HTMLElement | null>(null)

function alClicFuera(evento: MouseEvent) {
  if (contenedor.value && !contenedor.value.contains(evento.target as Node)) abierto.value = false
}

onMounted(() => document.addEventListener('click', alClicFuera))
onBeforeUnmount(() => document.removeEventListener('click', alClicFuera))

function elegir(formato: 'csv' | 'excel') {
  abierto.value = false
  emit('exportar', formato)
}
</script>

<template>
  <div ref="contenedor" class="relative" @keydown.escape="abierto = false">
    <KmButton
      variante="secundario"
      tamano="sm"
      :disabled="disabled"
      :aria-expanded="abierto"
      aria-haspopup="menu"
      @click="abierto = !abierto"
    >
      <svg
        class="size-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
      </svg>
      Exportar
    </KmButton>

    <div
      v-if="abierto"
      role="menu"
      class="rs-entrada absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-control border border-linea bg-panel py-1"
      style="box-shadow: var(--rs-sombra-flotante)"
    >
      <button
        type="button"
        role="menuitem"
        class="flex w-full flex-col px-3 py-2 text-left hover:bg-seleccion"
        @click="elegir('excel')"
      >
        <span class="text-sm text-tinta">Excel</span>
        <span class="text-[11px] text-tenue">Hoja con números editables</span>
      </button>
      <button
        type="button"
        role="menuitem"
        class="flex w-full flex-col px-3 py-2 text-left hover:bg-seleccion"
        @click="elegir('csv')"
      >
        <span class="text-sm text-tinta">CSV</span>
        <span class="text-[11px] text-tenue">Texto separado por «;»</span>
      </button>
    </div>
  </div>
</template>
