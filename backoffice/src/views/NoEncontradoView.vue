<script setup lang="ts">
import KmButton from '@/components/ui/KmButton.vue'
</script>

<template>
  <div class="grid h-full place-items-center p-6 text-center">
    <div class="max-w-md">
      <p class="text-sm font-semibold text-verde">404</p>
      <h1 class="mt-2 text-2xl font-semibold text-tinta">Página no encontrada</h1>
      <p class="mt-2 text-sm text-tenue">La ruta que buscas no existe o fue movida.</p>
      <RouterLink :to="{ name: 'dashboard' }" class="mt-6 inline-block">
        <KmButton>Volver al inicio</KmButton>
      </RouterLink>
    </div>
  </div>
</template>
