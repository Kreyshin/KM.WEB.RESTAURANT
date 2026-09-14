<script setup lang="ts">
/** Marca los datos que administra el ERP: aquí solo se consultan. */
withDefaults(defineProps<{ detalle?: boolean }>(), { detalle: false })
</script>

<template>
  <div
    v-if="detalle"
    class="rs-origen-erp flex items-start gap-3 rounded-card px-4 py-3"
    role="note"
  >
    <svg
      viewBox="0 0 24 24"
      class="mt-0.5 size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path
        d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <div class="flex flex-col gap-0.5">
      <p class="text-sm font-semibold">Sincronizado desde el ERP</p>
      <p class="text-xs text-tenue">
        <slot
          >Estos datos se administran en el ERP. Para cambiarlos, pide el ajuste allí; aquí se
          actualizan solos.</slot
        >
      </p>
    </div>
  </div>
  <span
    v-else
    class="rs-origen-erp inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
    title="Se administra en el ERP"
  >
    <svg
      viewBox="0 0 24 24"
      class="size-3.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      aria-hidden="true"
    >
      <path
        d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    Sincronizado desde ERP
  </span>
</template>

<style scoped>
.rs-origen-erp {
  border: 1px solid color-mix(in srgb, var(--color-laton, #a8842b) 45%, var(--color-linea));
  background: color-mix(in srgb, var(--color-laton, #a8842b) 10%, transparent);
  color: var(--color-laton-texto, var(--color-tinta));
}
</style>
