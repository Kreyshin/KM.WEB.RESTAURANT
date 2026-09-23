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
      class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200"
      :class="activo ? 'bg-accion' : 'bg-linea'"
      @click="activo = !activo"
    >
      <span
        class="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        :class="activo ? 'translate-x-5' : 'translate-x-0'"
      />
    </button>
  </label>
</template>
