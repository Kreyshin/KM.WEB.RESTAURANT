<script setup lang="ts">
/** Casilla de verificación con la estética del sistema. */
withDefaults(defineProps<{ tamano?: 'sm' | 'md'; disabled?: boolean; ayuda?: string }>(), {
  tamano: 'md',
  disabled: false,
})
const marcado = defineModel<boolean>({ default: false })
</script>

<template>
  <label
    class="rs-check inline-flex cursor-pointer items-start select-none"
    :class="[
      tamano === 'sm' ? 'gap-1.5 text-xs' : 'gap-2.5 text-sm',
      { 'cursor-not-allowed opacity-50': disabled },
    ]"
  >
    <input v-model="marcado" type="checkbox" class="peer sr-only" :disabled="disabled" />
    <span class="rs-check-caja" :class="tamano === 'sm' ? 'size-4' : 'size-5'" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4">
        <path d="M3.5 8.5l3 3 6-7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span class="flex flex-col">
      <span :class="marcado ? 'text-tinta' : 'text-tenue'" class="leading-5 font-medium">
        <slot />
      </span>
      <span v-if="ayuda" class="text-xs text-tenue">{{ ayuda }}</span>
    </span>
  </label>
</template>

<style scoped>
.rs-check-caja {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  margin-top: 1px;
  border: 1.5px solid var(--color-linea);
  border-radius: 5px;
  background: var(--color-panel);
  color: transparent;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.rs-check:hover .rs-check-caja {
  border-color: var(--color-accion);
}
.rs-check-caja svg {
  width: 80%;
  height: 80%;
}
input:checked + .rs-check-caja {
  background: var(--color-accion);
  border-color: var(--color-accion);
  color: #fff;
}
input:focus-visible + .rs-check-caja {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accion) 30%, transparent);
}
</style>
