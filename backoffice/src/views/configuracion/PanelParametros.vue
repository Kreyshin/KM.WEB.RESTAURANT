<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { parametrosService, type ValorParametro } from '@/services/parametros.service'
import { useUiStore } from '@/stores/ui.store'
import type { AlcanceParametro, ApiError } from '@/types'

/**
 * Parámetros de un alcance, agrupados y editables. En un local cada valor
 * dice si es propio o si lo hereda de la cadena, y se puede volver a heredar.
 */
const props = defineProps<{ alcance: AlcanceParametro; localId?: string; cadenaId?: string }>()

const ui = useUiStore()
const valores = ref<ValorParametro[]>([])
const cargando = ref(true)

const enLocal = computed(() => props.alcance === 'local' && (!!props.localId || !!props.cadenaId))

async function cargar() {
  cargando.value = true
  valores.value = await parametrosService.valores(
    enLocal.value ? { localId: props.localId, cadenaId: props.cadenaId } : {},
  )
  cargando.value = false
}
onMounted(cargar)
watch(() => [props.localId, props.cadenaId], cargar)

const grupos = computed(() => {
  const mapa = new Map<string, ValorParametro[]>()
  for (const v of valores.value) {
    mapa.set(v.definicion.grupo, [...(mapa.get(v.definicion.grupo) ?? []), v])
  }
  return [...mapa.entries()]
})

async function guardar(v: ValorParametro, valor: string | number | boolean | undefined) {
  try {
    await parametrosService.guardarValor(
      v.definicion.clave,
      valor,
      enLocal.value ? props.localId : undefined,
      enLocal.value ? props.cadenaId : undefined,
    )
    await cargar()
    ui.exito(valor === undefined ? 'Vuelve a usar el valor heredado.' : 'Guardado.')
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar.')
  }
}

function textoOrigen(v: ValorParametro) {
  if (v.origen === 'propio') {
    return props.localId
      ? 'Propio de este local'
      : props.cadenaId
        ? 'Propio de esta cadena'
        : 'Fijado para la empresa'
  }
  if (v.origen === 'cadena') return 'Heredado de la cadena'
  if (v.origen === 'empresa') return 'Heredado de la empresa'
  return 'Valor por defecto'
}
</script>

<template>
  <KmEstado v-if="cargando" tipo="cargando" compacto />

  <div
    v-else-if="valores.length === 0"
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
        <li
          v-for="v in lista"
          :key="v.definicion.clave"
          class="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3"
        >
          <div class="min-w-0 flex-1 basis-72">
            <p class="font-medium text-tinta">{{ v.definicion.etiqueta }}</p>
            <p v-if="v.definicion.descripcion" class="text-xs text-tenue">
              {{ v.definicion.descripcion }}
            </p>
            <p
              class="mt-1 text-xs"
              :class="v.origen === 'propio' ? 'text-laton-texto' : 'text-tenue'"
            >
              {{ textoOrigen(v) }}
              <template v-if="!enLocal && v.definicion.alcance === 'local'">
                · cada cadena o local puede cambiarlo
              </template>
              <button
                v-if="enLocal && v.origen === 'propio'"
                type="button"
                class="ml-2 text-verde underline"
                @click="guardar(v, undefined)"
              >
                Usar el heredado
              </button>
            </p>
          </div>

          <div class="w-56 shrink-0">
            <KmSwitch
              v-if="v.definicion.tipo === 'booleano'"
              :model-value="Boolean(v.valor)"
              :etiqueta="v.valor ? 'Sí' : 'No'"
              @update:model-value="guardar(v, $event)"
            />
            <KmNumero
              v-else-if="v.definicion.tipo === 'numero'"
              :model-value="Number(v.valor)"
              :min="0"
              :aria-label="v.definicion.etiqueta"
              @update:model-value="guardar(v, $event ?? 0)"
            />
            <KmSelect
              v-else-if="v.definicion.tipo === 'opcion'"
              :model-value="String(v.valor)"
              :opciones="v.definicion.opciones ?? []"
              :etiqueta="v.definicion.etiqueta"
              @update:model-value="guardar(v, $event as string)"
            />
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
