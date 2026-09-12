<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="mx-auto max-w-lg py-16 text-center">
    <div class="mx-auto mb-5 grid size-14 place-items-center rounded-card bg-seleccion text-verde">
      <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    </div>

    <h2 class="text-lg font-semibold text-tinta">{{ route.meta.titulo }}</h2>
    <p class="mt-2 text-sm text-tenue">
      Este módulo aún no está desarrollado. La navegación, los permisos por rol y la ruta ya están
      listos: solo falta construir la vista.
    </p>
  </div>
</template>
