<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'

const localStore = useLocalStore()
const ui = useUiStore()

const abierto = ref(false)
const contenedor = ref<HTMLElement | null>(null)

function alClicFuera(evento: MouseEvent) {
  if (contenedor.value && !contenedor.value.contains(evento.target as Node)) abierto.value = false
}

onMounted(() => document.addEventListener('click', alClicFuera))
onBeforeUnmount(() => document.removeEventListener('click', alClicFuera))

function elegir(id: string) {
  abierto.value = false
  if (id === localStore.localId) return
  localStore.seleccionar(id)
  ui.notificar(`Trabajando en el local ${localStore.local?.nombre}.`)
}
</script>

<template>
  <div ref="contenedor" class="relative" @keydown.escape="abierto = false">
    <button
      type="button"
      class="-mx-2 flex items-center gap-2 rounded-control px-2 py-1 text-right transition-colors hover:bg-seleccion"
      :aria-expanded="abierto"
      aria-haspopup="listbox"
      :disabled="localStore.locales.length === 0"
      @click="abierto = !abierto"
    >
      <span>
        <span class="rs-etiqueta block text-tenue">Local</span>
        <span class="rs-display block text-sm font-semibold text-tinta">
          {{ localStore.local?.nombre ?? '—' }}
        </span>
      </span>
      <svg
        class="size-4 text-tenue"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <ul
      v-if="abierto"
      role="listbox"
      aria-label="Elegir local"
      class="rs-entrada absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-control border border-linea bg-panel py-1"
      style="box-shadow: var(--rs-sombra-flotante)"
    >
      <li
        v-for="l in localStore.locales"
        :key="l.id"
        role="option"
        :aria-selected="l.id === localStore.localId"
      >
        <button
          type="button"
          class="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-seleccion"
          @click="elegir(l.id)"
        >
          <span
            class="mt-1.5 size-2 shrink-0 rounded-full"
            :class="l.id === localStore.localId ? 'bg-laton' : 'bg-linea'"
            aria-hidden="true"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-tinta">{{ l.nombre }}</span>
            <span class="block truncate text-xs text-tenue">{{ l.direccion }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
