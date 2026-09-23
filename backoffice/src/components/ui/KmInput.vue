<script setup lang="ts">
withDefaults(
  defineProps<{
    id?: string
    type?: string
    placeholder?: string
    invalido?: boolean
    disabled?: boolean
    min?: number | string
    max?: number | string
    autocomplete?: string
  }>(),
  { type: 'text', invalido: false, disabled: false },
)

const modelo = defineModel<string | number>()
</script>

<template>
  <input
    :id="id"
    v-model="modelo"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :min="min"
    :max="max"
    :autocomplete="autocomplete"
    :aria-invalid="invalido || undefined"
    class="rs-campo min-h-10 w-full rounded-control border bg-panel px-3 py-2 text-sm text-tinta transition-colors duration-200 placeholder:text-tenue/70 disabled:bg-panel-2 disabled:text-tenue"
    :class="invalido ? 'border-vino' : 'border-linea focus:border-verde'"
  />
</template>
