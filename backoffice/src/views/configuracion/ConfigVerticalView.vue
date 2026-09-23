<script setup lang="ts">
import KmCard from '@/components/ui/KmCard.vue'
import PanelParametros from './PanelParametros.vue'
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <KmCard
      titulo="Configuración de la vertical"
      subtitulo="Cómo funciona el sistema en toda la cadena. Un cambio aquí afecta a todos los locales, salvo que un local tenga su propio valor."
    >
      <PanelParametros alcance="vertical">
        <template #vacio>
          Aquí irán las reglas que valen para todos los locales: validaciones generales y
          comportamientos comunes de la vertical.
        </template>
      </PanelParametros>
    </KmCard>
  </div>
</template>
