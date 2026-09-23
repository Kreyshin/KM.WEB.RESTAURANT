<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import { useLocalStore } from '@/stores/local.store'
import PanelParametros from './PanelParametros.vue'

/**
 * Parámetros por local. Cada usuario solo ve los locales a los que tiene
 * acceso: con uno, configura el suyo; con varios, elige cuál.
 */
const localStore = useLocalStore()
const seleccionado = ref<string | null>(null)

onMounted(async () => {
  if (localStore.locales.length === 0) await localStore.cargar()
  seleccionado.value = localStore.localId ?? localStore.locales[0]?.id ?? null
})
watch(
  () => localStore.localId,
  (id) => id && (seleccionado.value = id),
)

const varios = computed(() => localStore.locales.length > 1)
const local = computed(() => localStore.locales.find((l) => l.id === seleccionado.value))
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <KmCard v-if="localStore.locales.length === 0" titulo="Configuración por local">
      <KmEstado
        tipo="vacio"
        titulo="No tienes locales asignados"
        mensaje="Pide en el ERP que te den acceso a un local para configurarlo."
      />
    </KmCard>

    <div v-else class="grid gap-6" :class="varios ? 'md:grid-cols-[16rem_1fr]' : ''">
      <nav
        v-if="varios"
        aria-label="Locales"
        class="flex flex-col gap-1 self-start rounded-card border border-linea bg-panel p-2"
      >
        <p class="rs-etiqueta px-2 py-1.5 text-tenue">
          Tus locales · {{ localStore.locales.length }}
        </p>
        <button
          v-for="l in localStore.locales"
          :key="l.id"
          type="button"
          class="flex flex-col rounded-control px-3 py-2 text-left transition-colors"
          :class="
            seleccionado === l.id ? 'bg-seleccion text-tinta' : 'text-tenue hover:bg-seleccion/60'
          "
          :aria-current="seleccionado === l.id ? 'true' : undefined"
          @click="seleccionado = l.id"
        >
          <span class="text-sm font-semibold">{{ l.nombre }}</span>
          <span class="text-xs text-tenue">{{ l.distrito }}</span>
        </button>
      </nav>

      <KmCard
        :titulo="local ? `Configuración de ${local.nombre}` : 'Configuración por local'"
        :subtitulo="
          varios
            ? 'Cada local puede funcionar distinto. Lo que definas aquí solo afecta al local elegido.'
            : 'Solo tienes acceso a este local: lo que definas aquí afecta únicamente a él.'
        "
      >
        <PanelParametros v-if="seleccionado" alcance="local" :local-id="seleccionado">
          <template #vacio>
            Aquí irán las opciones que cambian cómo opera un local, por ejemplo cómo se recepciona o
            si se controlan lotes y ubicaciones. Sin valor propio, el local usa la configuración de
            la vertical.
          </template>
        </PanelParametros>
      </KmCard>
    </div>
  </div>
</template>
