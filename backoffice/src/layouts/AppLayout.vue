<script setup lang="ts">
import BarraPrincipal from '@/components/layout/BarraPrincipal.vue'
import CabeceraTrabajo from '@/components/layout/CabeceraTrabajo.vue'
import MenuContextual from '@/components/layout/MenuContextual.vue'
import BuscadorGlobal from '@/components/layout/BuscadorGlobal.vue'
import PanelDatosEjemplo from '@/components/layout/PanelDatosEjemplo.vue'
</script>

<template>
  <!--
    `relative` es el marco de referencia del menú de secciones cuando se
    comporta como panel superpuesto (por debajo de lg).
  -->
  <div class="relative flex h-full overflow-hidden bg-lienzo">
    <BarraPrincipal />
    <MenuContextual />

    <div class="flex min-w-0 flex-1 flex-col">
      <CabeceraTrabajo />
      <main class="rs-lienzo min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
        <RouterView v-slot="{ Component }">
          <component :is="Component" class="rs-entrada" />
        </RouterView>
      </main>
    </div>

    <BuscadorGlobal />
    <PanelDatosEjemplo />
  </div>
</template>
