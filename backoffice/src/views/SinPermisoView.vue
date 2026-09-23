<script setup lang="ts">
import KmButton from '@/components/ui/KmButton.vue'
</script>

<template>
  <div class="grid h-full place-items-center p-6 text-center">
    <div class="max-w-md">
      <p class="text-sm font-semibold text-verde">403</p>
      <h1 class="mt-2 text-2xl font-semibold text-tinta">No tienes permiso</h1>
      <p class="mt-2 text-sm text-tenue">
        Tu rol actual no puede acceder a esta sección. Si crees que es un error, pide al
        administrador que revise tus permisos.
      </p>
      <RouterLink :to="{ name: 'dashboard' }" class="mt-6 inline-block">
        <KmButton>Volver al dashboard</KmButton>
      </RouterLink>
    </div>
  </div>
</template>
