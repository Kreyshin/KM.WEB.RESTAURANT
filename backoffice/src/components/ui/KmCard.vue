<script setup lang="ts">
defineProps<{ titulo?: string; subtitulo?: string; sinPadding?: boolean }>()
</script>

<template>
  <!-- Radio de 11px, borde de 1px y elevación tenue: tarjeta estándar Karma. -->
  <section class="rounded-card border border-linea bg-panel">
    <header
      v-if="titulo || $slots.acciones"
      class="flex flex-wrap items-center justify-between gap-4 border-b border-linea px-6 py-4"
    >
      <div>
        <h2 v-if="titulo" class="rs-titulo-seccion text-tinta">{{ titulo }}</h2>
        <p v-if="subtitulo" class="mt-1 text-xs text-tenue">{{ subtitulo }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="acciones" />
      </div>
    </header>

    <div :class="sinPadding ? '' : 'p-6'">
      <slot />
    </div>
  </section>
</template>
