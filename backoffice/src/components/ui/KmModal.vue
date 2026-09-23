<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

withDefaults(defineProps<{ titulo?: string; ancho?: 'sm' | 'md' | 'lg' }>(), { ancho: 'md' })

const abierto = defineModel<boolean>({ required: true })

const anchos = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' } as const

function cerrar() {
  abierto.value = false
}

function alPresionarTecla(e: KeyboardEvent) {
  if (e.key === 'Escape') cerrar()
}

// El modal bloquea el scroll del body y escucha Escape solo mientras está abierto.
watch(abierto, (esta) => {
  document.body.style.overflow = esta ? 'hidden' : ''
  if (esta) window.addEventListener('keydown', alPresionarTecla)
  else window.removeEventListener('keydown', alPresionarTecla)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', alPresionarTecla)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="abierto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrar" />

      <div
        role="dialog"
        aria-modal="true"
        class="rs-entrada relative w-full rounded-overlay border border-linea bg-panel shadow-2xl"
        :class="anchos[ancho]"
      >
        <header
          v-if="titulo || $slots.header"
          class="flex items-center justify-between border-b border-linea px-6 py-4"
        >
          <slot name="header">
            <h2 class="rs-titulo-seccion text-tinta">{{ titulo }}</h2>
          </slot>
          <button
            type="button"
            class="rounded-control p-1.5 text-tenue transition-colors hover:bg-seleccion hover:text-tinta"
            aria-label="Cerrar"
            @click="cerrar"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div class="max-h-[70vh] overflow-y-auto px-6 py-5">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-linea px-6 py-4">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
