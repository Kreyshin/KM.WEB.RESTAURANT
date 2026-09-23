<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { inventarioService, type FilaKardex } from '@/services/inventario.service'
import type { Zona, ApiError, Insumo } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import {
  etiquetaMovimiento,
  etiquetaUnidad,
  formatearCantidad,
  formatearFecha,
  formatearSoles,
  signoMovimiento,
  tonoMovimiento,
} from '@/utils/formato'

const props = defineProps<{ insumo: Insumo | null; zonas: Zona[] }>()
const abierto = defineModel<boolean>({ required: true })

const zonaId = ref('')
const filas = ref<FilaKardex[]>([])
const cargando = ref(false)
const error = ref<string | null>(null)

const opciones = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todas las zonas' },
  ...props.zonas
    .filter((a) => props.insumo?.existencias.some((e) => e.zonaId === a.id))
    .map((a) => ({ valor: a.id, etiqueta: a.nombre })),
])

const nombreZona = (id: string) => props.zonas.find((a) => a.id === id)?.nombre ?? '—'

async function cargar() {
  if (!props.insumo) return
  cargando.value = true
  error.value = null
  try {
    filas.value = await inventarioService.kardex(props.insumo.id, zonaId.value || undefined)
  } catch (e) {
    error.value = (e as ApiError).mensaje ?? 'No se pudo cargar el kardex.'
  } finally {
    cargando.value = false
  }
}

watch(abierto, (esta) => {
  if (!esta) return
  zonaId.value = ''
  cargar()
})
watch(zonaId, cargar)
</script>

<template>
  <KmDrawer
    v-model="abierto"
    :titulo="insumo ? `Kardex · ${insumo.nombre}` : 'Kardex'"
    :subtitulo="
      insumo
        ? `Costo promedio ${formatearSoles(insumo.costoUnitario)} por ${etiquetaUnidad[insumo.unidad]}`
        : ''
    "
    ancho="lg"
  >
    <div v-if="insumo" class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2">
        <div
          v-for="e in insumo.existencias"
          :key="e.zonaId"
          class="rounded-card border border-linea px-3 py-2"
        >
          <p class="rs-etiqueta text-tenue">{{ nombreZona(e.zonaId) }}</p>
          <p class="rs-display text-lg font-semibold text-tinta tabular-nums">
            {{ formatearCantidad(e.cantidad, insumo.unidad) }}
          </p>
        </div>
      </div>

      <div class="w-56">
        <KmSelect v-model="zonaId" :opciones="opciones" etiqueta="Filtrar por zona" />
      </div>

      <KmEstado v-if="cargando" tipo="cargando" compacto />
      <KmEstado v-else-if="error" tipo="error" :mensaje="error" compacto />
      <KmEstado v-else-if="filas.length === 0" mensaje="Sin movimientos registrados." compacto />

      <div v-else class="overflow-x-auto rounded-card border border-linea">
        <table class="w-full min-w-[36rem] text-sm">
          <thead>
            <tr class="border-b border-linea bg-panel-2">
              <th class="rs-etiqueta px-3 py-2 text-left text-tenue">Fecha</th>
              <th class="rs-etiqueta px-3 py-2 text-left text-tenue">Movimiento</th>
              <th class="rs-etiqueta px-3 py-2 text-right text-tenue">Cantidad</th>
              <th class="rs-etiqueta px-3 py-2 text-right text-tenue">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filas" :key="f.id" class="border-b border-linea last:border-0">
              <td class="px-3 py-2 text-tenue tabular-nums whitespace-nowrap">
                {{ formatearFecha(f.fecha) }}
              </td>
              <td class="px-3 py-2">
                <KmBadge :tono="tonoMovimiento[f.tipo]">{{ etiquetaMovimiento[f.tipo] }}</KmBadge>
                <p class="mt-1 text-xs text-tenue">
                  {{ nombreZona(f.zonaId) }}<template v-if="f.motivo"> · {{ f.motivo }}</template>
                  <template v-if="f.referencia">
                    · <span class="font-mono">{{ f.referencia }}</span></template
                  >
                </p>
              </td>
              <td class="px-3 py-2 text-right font-medium tabular-nums">
                {{ signoMovimiento[f.tipo] }}{{ formatearCantidad(f.cantidad, insumo.unidad) }}
              </td>
              <td class="px-3 py-2 text-right text-tinta tabular-nums">
                {{ formatearCantidad(f.saldo, insumo.unidad) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </KmDrawer>
</template>
