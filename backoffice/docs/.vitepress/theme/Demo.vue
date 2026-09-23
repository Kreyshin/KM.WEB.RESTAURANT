<script setup lang="ts">
defineProps<{ titulo?: string }>()
</script>

<template>
  <!--
    `vp-raw` aísla la demo de los estilos de prosa de VitePress, para que los
    componentes se vean exactamente como en el back office.
  -->
  <div class="rs-demo vp-raw">
    <p v-if="titulo" class="rs-demo-titulo">{{ titulo }}</p>
    <ClientOnly>
      <slot />
      <template #fallback>
        <p class="rs-demo-cargando">Cargando demo…</p>
      </template>
    </ClientOnly>
  </div>
</template>
