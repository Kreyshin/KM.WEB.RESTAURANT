<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
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
const { cargando, iniciar, terminar } = useCarga()

const enLocal = computed(() => props.alcance === 'local' && (!!props.localId || !!props.cadenaId))

async function cargar() {
  iniciar()
  valores.value = await parametrosService.valores(
    enLocal.value ? { localId: props.localId, cadenaId: props.cadenaId } : {},
  )
  terminar()
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

/**
 * Solo hay dos estados que importan: el valor es **propio** de este nivel, o
 * **heredado** del de arriba. De dónde viene y cuánto vale va en letra pequeña,
 * porque es el detalle, no la decisión.
 */
const esPropio = (v: ValorParametro) => v.origen === 'propio'

const nivel = () => (props.localId ? 'este local' : props.cadenaId ? 'esta cadena' : 'la empresa')

/** De dónde viene lo heredado, dicho como lo diría una persona. */
function fuente(origen: ValorParametro['origenHeredado']) {
  if (origen === 'cadena') return 'de la cadena'
  if (origen === 'empresa') return 'de la empresa'
  return 'de fábrica'
}

/** El valor, legible: los interruptores no dicen «true». */
function comoTexto(v: ValorParametro, valor: ValorParametro['valor']) {
  if (v.definicion.tipo === 'booleano') return valor ? 'Sí' : 'No'
  const opcion = v.definicion.opciones?.find((o) => o.valor === valor)
  return opcion ? opcion.etiqueta : String(valor)
}

function detalle(v: ValorParametro) {
  if (!esPropio(v)) return `Viene ${fuente(v.origenHeredado)}`
  // En un valor propio interesa lo otro: a qué volvería si se suelta.
  return `Fijado en ${nivel()} · ${fuente(v.origenHeredado)} sería ${comoTexto(v, v.heredado)}`
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
            <div class="mt-1.5 flex flex-wrap items-center gap-2">
              <KmBadge :tono="esPropio(v) ? 'laton' : 'neutro'" punto>
                {{ esPropio(v) ? 'Propio' : 'Heredado' }}
              </KmBadge>
              <span class="text-xs text-tenue">{{ detalle(v) }}</span>
              <KmButton
                v-if="esPropio(v)"
                tamano="sm"
                variante="secundario"
                @click="guardar(v, undefined)"
              >
                {{ enLocal ? 'Volver a lo heredado' : 'Volver a lo de fábrica' }} ({{
                  comoTexto(v, v.heredado)
                }})
              </KmButton>
              <span v-if="!enLocal && v.definicion.alcance === 'local'" class="text-xs text-tenue">
                · cada cadena o local puede cambiarlo
              </span>
            </div>
          </div>

          <div class="w-56 shrink-0">
            <KmSwitch
              v-if="v.definicion.tipo === 'booleano'"
              :model-value="Boolean(v.valor)"
              :etiqueta="v.valor ? 'Sí' : 'No'"
              :nombre-accesible="v.definicion.etiqueta"
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
