<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import {
  capacidades,
  descripcionModo,
  etiquetaCapacidad,
  etiquetaModo,
  integracionService,
  modoIntegracion,
} from '@/services/integracion.service'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  CapacidadIntegracion,
  ConfigIntegracion,
  ModoIntegracion,
  VinculoErp,
} from '@/types'
import type { OpcionSelect, TonoMesa } from '@/types/ui'
import { formatearFecha } from '@/utils/formato'

/**
 * Consola de Karma (D-009): modo de integración de cada capacidad con el ERP,
 * por empresa y con excepción por local. La usa el equipo de Karma según lo
 * acordado con el cliente; el cliente no tiene esta pantalla.
 */

const ui = useUiStore()
const { locales, recargar } = useCatalogos(['locales'])
const config = shallowRef<ConfigIntegracion | null>(null)
const vinculos = shallowRef<VinculoErp[]>([])

async function cargar() {
  const [c, v] = await Promise.all([
    integracionService.configuracion(),
    integracionService.vinculos(),
    recargar(),
  ])
  config.value = c
  vinculos.value = v
}
onMounted(cargar)

const tono: Record<ModoIntegracion, TonoMesa> = {
  autonomo: 'neutro',
  sincronizado: 'pizarra',
  delegado: 'laton',
}

const opcionesModo = (conHerencia: boolean): OpcionSelect[] => [
  ...(conHerencia ? [{ valor: '', etiqueta: 'Como la empresa' }] : []),
  ...(['autonomo', 'sincronizado', 'delegado'] as ModoIntegracion[]).map((m) => ({
    valor: m,
    etiqueta: etiquetaModo[m],
  })),
]

const propioDe = (capacidad: CapacidadIntegracion, localId?: string) =>
  localId
    ? (config.value?.locales[localId]?.[capacidad] ?? '')
    : (config.value?.empresa[capacidad] ?? 'autonomo')

// Cambio con motivo
const modal = ref(false)
const pendiente = shallowRef<{
  capacidad: CapacidadIntegracion
  localId?: string
  modo: string
} | null>(null)
const motivo = ref('')

function pedirCambio(capacidad: CapacidadIntegracion, modo: string, localId?: string) {
  if (modo === propioDe(capacidad, localId)) return
  pendiente.value = { capacidad, localId, modo }
  motivo.value = ''
  modal.value = true
}

async function confirmarCambio() {
  if (!pendiente.value) return
  try {
    await integracionService.cambiarModo(
      pendiente.value.capacidad,
      (pendiente.value.modo || undefined) as ModoIntegracion | undefined,
      motivo.value,
      pendiente.value.localId,
    )
    ui.exito('Modo de integración actualizado.')
    modal.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar el modo.')
  }
}

const nombreLocal = (id?: string) =>
  id ? (locales.value.find((l) => l.id === id)?.nombre ?? id) : 'Empresa'
const historial = computed(() => config.value?.historial ?? [])
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <p class="rs-tono rs-tono-laton max-w-4xl rounded-card border px-4 py-3 text-sm">
      <strong>Consola de Karma.</strong> Esta pantalla la usa el equipo de Karma, no el cliente.
      Cada cambio de modo se acuerda con el cliente y queda registrado con su motivo.
    </p>

    <KmCard
      titulo="Modo de integración por capacidad"
      subtitulo="Autónomo por defecto. Instalar un módulo del ERP no conecta nada: se decide aquí, para la empresa o para un local."
      sin-padding
    >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-sm">
          <thead>
            <tr class="border-b border-linea text-left text-xs text-tenue">
              <th class="px-6 py-3 font-medium">Capacidad</th>
              <th class="w-48 px-3 py-3 font-medium">Empresa</th>
              <th v-for="l in locales" :key="l.id" class="w-48 px-3 py-3 font-medium">
                {{ l.nombre }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in capacidades" :key="c" class="border-b border-linea last:border-0">
              <td class="px-6 py-3">
                <p class="font-medium text-tinta">{{ etiquetaCapacidad[c] }}</p>
              </td>
              <td class="px-3 py-2">
                <KmSelect
                  :model-value="propioDe(c)"
                  :opciones="opcionesModo(false)"
                  :etiqueta="`${etiquetaCapacidad[c]} en la empresa`"
                  @update:model-value="pedirCambio(c, String($event))"
                />
              </td>
              <td v-for="l in locales" :key="l.id" class="px-3 py-2">
                <KmSelect
                  :model-value="propioDe(c, l.id)"
                  :opciones="opcionesModo(true)"
                  :etiqueta="`${etiquetaCapacidad[c]} en ${l.nombre}`"
                  @update:model-value="pedirCambio(c, String($event ?? ''), l.id)"
                />
                <p class="mt-1 text-[11px] text-tenue">
                  Efectivo:
                  <KmBadge :tono="tono[modoIntegracion(c, l.id)]">{{
                    etiquetaModo[modoIntegracion(c, l.id)]
                  }}</KmBadge>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul class="flex flex-wrap gap-x-6 gap-y-1 border-t border-linea px-6 py-3 text-xs text-tenue">
        <li v-for="m in ['autonomo', 'sincronizado', 'delegado'] as ModoIntegracion[]" :key="m">
          <strong class="text-tinta">{{ etiquetaModo[m] }}:</strong> {{ descripcionModo[m] }}
        </li>
      </ul>
    </KmCard>

    <div class="grid gap-5 xl:grid-cols-2">
      <KmCard titulo="Historial de cambios" subtitulo="Quién, cuándo y por qué cambió cada modo.">
        <ol class="flex flex-col gap-3">
          <li v-for="(h, i) in historial" :key="i" class="text-sm">
            <p class="text-tinta">
              <strong>{{ etiquetaCapacidad[h.capacidad] }}</strong> en {{ nombreLocal(h.localId) }}:
              {{ etiquetaModo[h.anterior] }} → {{ etiquetaModo[h.nuevo] }}
            </p>
            <p class="text-xs text-tenue">
              {{ formatearFecha(h.fecha) }} · {{ h.autor }} · {{ h.motivo }}
            </p>
          </li>
          <li v-if="!historial.length" class="text-sm text-tenue">Sin cambios registrados.</li>
        </ol>
      </KmCard>

      <KmCard
        titulo="Vínculos con el ERP"
        subtitulo="Registro de la vertical y su par en el ERP."
        sin-padding
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-linea text-left text-xs text-tenue">
              <th class="px-6 py-2.5 font-medium">Entidad</th>
              <th class="px-3 py-2.5 font-medium">Vertical</th>
              <th class="px-3 py-2.5 font-medium">ERP</th>
              <th class="px-6 py-2.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in vinculos" :key="v.id" class="border-b border-linea last:border-0">
              <td class="px-6 py-2.5 capitalize">{{ v.entidad }}</td>
              <td class="px-3 py-2.5 tabular-nums">{{ v.idVertical }}</td>
              <td class="px-3 py-2.5 tabular-nums">{{ v.idExterno }}</td>
              <td class="px-6 py-2.5">
                <KmBadge
                  :tono="
                    v.estado === 'sincronizado' ? 'verde' : v.estado === 'error' ? 'vino' : 'laton'
                  "
                  punto
                >
                  {{ v.estado }}
                </KmBadge>
                <span class="ml-2 text-xs text-tenue">v{{ v.version }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </KmCard>
    </div>

    <KmModal v-model="modal" titulo="Cambiar modo de integración" ancho="sm">
      <div class="flex flex-col gap-3">
        <p v-if="pendiente" class="text-sm text-tenue">
          {{ etiquetaCapacidad[pendiente.capacidad] }} en
          {{ nombreLocal(pendiente.localId) }} pasará a
          <strong class="text-tinta">
            {{
              pendiente.modo
                ? etiquetaModo[pendiente.modo as ModoIntegracion]
                : 'usar el modo de la empresa'
            }} </strong
          >.
        </p>
        <KmField v-slot="{ id }" label="Motivo acordado con el cliente" requerido>
          <KmInput
            :id="id"
            v-model="motivo"
            placeholder="Por ejemplo: piloto de integración en local nuevo"
          />
        </KmField>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="modal = false">Cancelar</KmButton>
        <KmButton :disabled="!motivo.trim()" @click="confirmarCambio">Confirmar</KmButton>
      </template>
    </KmModal>
  </div>
</template>
