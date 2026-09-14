<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import { parametrosService } from '@/services/parametros.service'
import type { AlcanceParametro, DefinicionParametro } from '@/types'

/**
 * Lista los parámetros de un alcance agrupados. Mientras el catálogo esté
 * vacío muestra qué irá aquí, para que el espacio quede mapeado.
 */
const props = defineProps<{ alcance: AlcanceParametro; localId?: string }>()

const definiciones = ref<DefinicionParametro[]>([])
const cargando = ref(true)

async function cargar() {
  cargando.value = true
  definiciones.value = await parametrosService.definiciones(props.alcance)
  cargando.value = false
}
onMounted(cargar)
watch(() => props.localId, cargar)

const grupos = computed(() => {
  const mapa = new Map<string, DefinicionParametro[]>()
  for (const d of definiciones.value) mapa.set(d.grupo, [...(mapa.get(d.grupo) ?? []), d])
  return [...mapa.entries()]
})
</script>

<template>
  <KmEstado v-if="cargando" tipo="cargando" compacto />

  <div
    v-else-if="definiciones.length === 0"
    class="flex flex-col items-center gap-2 rounded-card border border-dashed border-linea px-6 py-12 text-center"
  >
    <p class="font-semibold text-tinta">Aún no hay parámetros en esta sección</p>
    <p class="max-w-md text-sm text-tenue">
      <slot name="vacio">Se agregarán conforme cada fase defina opciones configurables.</slot>
    </p>
  </div>

  <div v-else class="flex flex-col gap-6">
    <section v-for="[grupo, lista] in grupos" :key="grupo" class="flex flex-col gap-2">
      <h3 class="rs-etiqueta text-laton-texto">{{ grupo }}</h3>
      <ul class="divide-y divide-linea rounded-card border border-linea">
        <li v-for="d in lista" :key="d.clave" class="flex items-center gap-4 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-tinta">{{ d.etiqueta }}</p>
            <p v-if="d.descripcion" class="text-xs text-tenue">{{ d.descripcion }}</p>
          </div>
          <span class="text-sm text-tenue">{{ d.porDefecto }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
