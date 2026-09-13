<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

withDefaults(defineProps<{ titulo?: string; subtitulo?: string; ancho?: 'sm' | 'md' | 'lg' }>(), {
  ancho: 'md',
})

const abierto = defineModel<boolean>({ required: true })

const anchos = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const

function alPresionarTecla(e: KeyboardEvent) {
  if (e.key === 'Escape') abierto.value = false
}

// Igual que KmModal: bloquea el scroll del body y escucha Escape mientras está abierto.
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
    <Transition name="rs-drawer">
      <div v-if="abierto" class="fixed inset-0 z-50 flex justify-end">
        <div class="rs-drawer-velo absolute inset-0 bg-black/45" @click="abierto = false" />

        <aside
          role="dialog"
          aria-modal="true"
          :aria-label="titulo"
          class="rs-drawer-panel relative flex h-full w-full flex-col border-l border-linea bg-panel"
          :class="anchos[ancho]"
          style="box-shadow: var(--rs-sombra-flotante)"
        >
          <header class="flex items-start justify-between gap-4 border-b border-linea px-6 py-4">
            <div class="min-w-0">
              <h2 class="rs-titulo-seccion text-tinta">{{ titulo }}</h2>
              <p v-if="subtitulo" class="mt-0.5 text-xs text-tenue">{{ subtitulo }}</p>
            </div>
            <button
              type="button"
              class="rounded-control p-1.5 text-tenue transition-colors hover:bg-seleccion hover:text-tinta"
              aria-label="Cerrar"
              @click="abierto = false"
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

          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="flex justify-end gap-2 border-t border-linea px-6 py-4"
          >
            <slot name="footer" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rs-drawer-enter-active,
.rs-drawer-leave-active {
  transition: opacity 0.2s ease;
}
.rs-drawer-enter-active .rs-drawer-panel,
.rs-drawer-leave-active .rs-drawer-panel {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}
.rs-drawer-enter-from,
.rs-drawer-leave-to {
  opacity: 0;
}
.rs-drawer-enter-from .rs-drawer-panel,
.rs-drawer-leave-to .rs-drawer-panel {
  transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
  .rs-drawer-enter-active,
  .rs-drawer-leave-active,
  .rs-drawer-enter-active .rs-drawer-panel,
  .rs-drawer-leave-active .rs-drawer-panel {
    transition: none;
  }
}
</style>
