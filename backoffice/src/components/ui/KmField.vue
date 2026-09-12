<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  label?: string
  error?: string
  ayuda?: string
  requerido?: boolean
}>()

// Cada campo genera su propio id para enlazar label ↔ control.
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-semibold text-tinta">
      {{ label }}
      <span v-if="requerido" class="text-vino" aria-hidden="true">*</span>
    </label>

    <slot :id="id" :invalido="!!error" />

    <p v-if="error" class="text-xs font-medium text-vino">{{ error }}</p>
    <p v-else-if="ayuda" class="text-xs text-tenue">{{ ayuda }}</p>
  </div>
</template>
