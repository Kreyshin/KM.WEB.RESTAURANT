<script setup lang="ts">
withDefaults(
  defineProps<{
    id?: string
    etiqueta?: string
    descripcion?: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const activo = defineModel<boolean>({ default: false })
</script>

<template>
  <label
    class="flex items-start justify-between gap-4"
    :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
  >
    <span v-if="etiqueta || descripcion" class="min-w-0">
      <span v-if="etiqueta" class="block text-sm font-medium text-tinta">{{ etiqueta }}</span>
      <span v-if="descripcion" class="block text-xs text-tenue">{{ descripcion }}</span>
    </span>

    <button
      :id="id"
      type="button"
      role="switch"
      :aria-checked="activo"
      :aria-label="etiqueta"
      :disabled="disabled"
      class="rs-switch relative mt-0.5 h-6 w-11 shrink-0 rounded-full"
      :class="activo ? 'bg-accion' : 'bg-linea'"
      @click="activo = !activo"
    >
      <span
        class="rs-switch-tirador absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm"
        :class="activo ? 'translate-x-5' : 'translate-x-0'"
      />
    </button>
  </label>
</template>

<style scoped>
/*
 * El tirador sale rápido y frena al llegar, en vez de deslizarse a velocidad
 * constante: así se lee como algo que se empuja, no como algo que se arrastra.
 * El color de la pista va por detrás, un punto más lento, para que el gesto
 * mande sobre el relleno.
 */
.rs-switch {
  transition: background-color var(--km-mov-normal) var(--km-curva);
}

.rs-switch-tirador {
  transition:
    transform var(--km-mov-rapido) var(--km-curva),
    width var(--km-mov-rapido) var(--km-curva);
}

/* Se estira al pulsarlo, como una tecla que cede. */
.rs-switch:active:not(:disabled) .rs-switch-tirador {
  width: 1.625rem;
}

.rs-switch:active:not(:disabled) .rs-switch-tirador.translate-x-5 {
  transform: translateX(1.0625rem);
}
</style>
