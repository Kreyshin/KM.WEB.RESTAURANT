<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import KmToaster from '@/components/ui/KmToaster.vue'
import { useUiStore } from '@/stores/ui.store'

const { isDark } = useData()

/**
 * El tema Mesa se activa con `data-theme`; VitePress usa la clase `.dark`.
 * El store de UI se crea solo en el navegador porque lee `window`.
 */
onMounted(() => {
  const ui = useUiStore()
  watch(isDark, (oscuro) => (ui.tema = oscuro ? 'oscuro' : 'claro'), { immediate: true })
})
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-bottom>
      <ClientOnly>
        <KmToaster />
      </ClientOnly>
    </template>
  </DefaultTheme.Layout>
</template>
