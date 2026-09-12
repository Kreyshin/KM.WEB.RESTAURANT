<script setup lang="ts">
import { useUiStore } from '@/stores/ui.store'
import type { TipoToast } from '@/stores/ui.store'

const ui = useUiStore()

const fondos: Record<TipoToast, string> = {
  exito: 'bg-verde',
  error: 'bg-vino',
  info: 'bg-verde-fuerte',
}

/** Icono además del color: los estados no se comunican solo por color. */
const iconos: Record<TipoToast, string> = {
  exito: 'M5 13l4 4L19 7',
  error:
    'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed top-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2">
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        role="status"
        class="rs-entrada pointer-events-auto flex items-start gap-3 rounded-card px-4 py-3 text-sm font-medium text-white shadow-lg"
        :class="fondos[t.tipo]"
      >
        <svg
          class="mt-0.5 size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="iconos[t.tipo]" />
        </svg>

        <p class="flex-1">{{ t.mensaje }}</p>

        <button
          type="button"
          class="opacity-70 transition-opacity hover:opacity-100"
          aria-label="Cerrar notificación"
          @click="ui.cerrarToast(t.id)"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>
