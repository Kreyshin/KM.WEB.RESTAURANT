<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import KmField from '@/components/ui/KmField.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import {
  codigoUbicacion,
  stockDetalleService,
  valoresParametros,
  type FilaStockDetalle,
} from '@/services/abastecimiento.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Insumo } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { exportarCsv, exportarExcel, type ColumnaExportable } from '@/utils/exportar'
import { formatearCantidad } from '@/utils/formato'

/**
 * Stock detallado (F4.3, D-004): insumo × almacén × lote × ubicación. Solo lo
 * llevan los insumos que controlan lote o ubicación; el resto vive con el
 * stock principal y aquí no aparece.
 *
 * La pantalla es de consulta: el detalle lo mueve la recepción (F4.5). Lo que
 * sí hace es avisar de lo que vence y de los descuadres contra el principal,
 * que son el síntoma de un movimiento registrado sin su detalle.
 */

const ui = useUiStore()
const catalogos = useCatalogos(['insumos', 'almacenes', 'locales'])
const { insumo, nombreAlmacen, opcionesAlmacen } = catalogos

type Descuadre = { insumo: Insumo; almacenId: string; principal: number; detallado: number }

const filas = shallowRef<FilaStockDetalle[]>([])
const descuadres = shallowRef<Descuadre[]>([])
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const almacenId = ref('')
const filtro = ref<'' | 'porVencer' | 'vencido'>('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    await catalogos.recargar()
    const [pagina, sinCuadrar] = await Promise.all([
      stockDetalleService.consultar({ porPagina: 500 }),
      stockDetalleService.descuadres(),
    ])
    filas.value = pagina.items
    descuadres.value = sinCuadrar
  } catch (e) {
    error.value = (e as ApiError).mensaje ?? 'No se pudo cargar el stock detallado.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

const columnas: ColumnaTabla[] = [
  { clave: 'insumo', etiqueta: 'Insumo' },
  { clave: 'almacen', etiqueta: 'Almacén', clase: 'w-48' },
  { clave: 'lote', etiqueta: 'Lote', clase: 'w-44' },
  { clave: 'ubicacion', etiqueta: 'Ubicación', clase: 'w-40' },
  { clave: 'cantidad', etiqueta: 'Cantidad', clase: 'w-32 text-right' },
]

const opcionesAlmacenFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los almacenes' },
  ...opcionesAlmacen.value,
])

const visibles = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return filas.value.filter((f) => {
    if (almacenId.value && f.almacenId !== almacenId.value) return false
    if (filtro.value === 'vencido' && !f.vencido) return false
    if (filtro.value === 'porVencer' && !f.porVencer) return false
    if (!texto) return true
    const nombre = insumo(f.insumoId)?.nombre.toLowerCase() ?? ''
    return nombre.includes(texto) || (f.lote?.codigo.toLowerCase().includes(texto) ?? false)
  })
})

const resumen = computed(() => ({
  vencidos: filas.value.filter((f) => f.vencido).length,
  porVencer: filas.value.filter((f) => f.porVencer).length,
}))

const cantidad = (f: FilaStockDetalle) => {
  const i = insumo(f.insumoId)
  return i ? formatearCantidad(f.cantidad, i.unidad) : `${f.cantidad}`
}

/** Qué controla el insumo en ese almacén, para explicar por qué lleva detalle. */
function controles(f: FilaStockDetalle) {
  const p = valoresParametros({ insumoId: f.insumoId, almacenId: f.almacenId })
  return [p.controlaLote && 'lote', p.controlaVencimiento && 'vencimiento', p.fefo && 'FEFO']
    .filter(Boolean)
    .join(' · ')
}

const columnasExport: ColumnaExportable<FilaStockDetalle>[] = [
  { etiqueta: 'Insumo', valor: (f) => insumo(f.insumoId)?.nombre ?? '' },
  { etiqueta: 'Almacén', valor: (f) => nombreAlmacen(f.almacenId) },
  { etiqueta: 'Lote', valor: (f) => f.lote?.codigo ?? '' },
  { etiqueta: 'Vence', valor: (f) => f.lote?.vencimiento ?? '' },
  { etiqueta: 'Días para vencer', valor: (f) => f.diasParaVencer ?? '' },
  { etiqueta: 'Ubicación', valor: (f) => (f.ubicacion ? codigoUbicacion(f.ubicacion) : '') },
  { etiqueta: 'Cantidad', valor: (f) => f.cantidad },
]

function exportar(formato: 'csv' | 'excel') {
  if (formato === 'csv') exportarCsv('stock-detallado', visibles.value, columnasExport)
  else exportarExcel('stock-detallado', visibles.value, columnasExport)
}

function avisarDescuadre() {
  ui.error(
    'Un descuadre viene de un movimiento registrado sin su detalle. Se corrige al recepcionar (F4.5).',
  )
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Filas con detalle</p>
        <p class="text-2xl font-semibold text-tinta tabular-nums">{{ filas.length }}</p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Por vencer</p>
        <p class="text-2xl font-semibold text-laton tabular-nums">{{ resumen.porVencer }}</p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Vencidos</p>
        <p class="text-2xl font-semibold text-vino tabular-nums">{{ resumen.vencidos }}</p>
      </div>
    </div>

    <div
      v-if="descuadres.length"
      class="rs-tono rs-tono-vino flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border px-4 py-3 text-sm"
      role="status"
    >
      <strong>{{ descuadres.length }} descuadres entre stock principal y detallado:</strong>
      <span>
        {{
          descuadres
            .slice(0, 3)
            .map(
              (d) =>
                `${d.insumo.nombre} en ${nombreAlmacen(d.almacenId)} (${d.principal} vs ${d.detallado})`,
            )
            .join(' · ')
        }}{{ descuadres.length > 3 ? '…' : '' }}
      </span>
      <KmButton tamano="sm" variante="secundario" @click="avisarDescuadre">Qué significa</KmButton>
    </div>

    <KmCard
      titulo="Lotes y stock detallado"
      subtitulo="Dónde y en qué lote está cada cosa. Solo aparecen los insumos que controlan lote o ubicación en ese almacén."
    >
      <div class="mb-3 flex flex-wrap items-end gap-3">
        <KmBusqueda v-model="busqueda" placeholder="Buscar insumo o lote" />
        <div class="w-full sm:w-56">
          <KmField v-slot="{ id }" label="Almacén">
            <KmSelect :id="id" v-model="almacenId" :opciones="opcionesAlmacenFiltro" />
          </KmField>
        </div>
        <div class="w-full sm:w-44">
          <KmField v-slot="{ id }" label="Vencimiento">
            <KmSelect
              :id="id"
              v-model="filtro"
              :opciones="[
                { valor: '', etiqueta: 'Todo' },
                { valor: 'porVencer', etiqueta: 'Por vencer' },
                { valor: 'vencido', etiqueta: 'Vencido' },
              ]"
            />
          </KmField>
        </div>
        <div class="flex-1" />
        <KmExportar :disabled="visibles.length === 0" @exportar="exportar" />
      </div>

      <div class="overflow-hidden rounded-card border border-linea">
        <KmTable
          :columnas="columnas"
          :filas="visibles"
          :cargando="cargando"
          :error="error || null"
          mensaje-vacio="No hay stock detallado con esos filtros."
        >
          <template #col-insumo="{ fila }">
            <p class="font-medium text-tinta">{{ insumo(fila.insumoId)?.nombre ?? '—' }}</p>
            <p v-if="controles(fila)" class="text-xs text-tenue">Controla {{ controles(fila) }}</p>
          </template>
          <template #col-almacen="{ fila }">{{ nombreAlmacen(fila.almacenId) }}</template>
          <template #col-lote="{ fila }">
            <template v-if="fila.lote">
              <p class="text-tinta tabular-nums">{{ fila.lote.codigo }}</p>
              <KmBadge v-if="fila.vencido" tono="vino" punto>
                Vencido hace {{ -(fila.diasParaVencer ?? 0) }} d
              </KmBadge>
              <KmBadge v-else-if="fila.porVencer" tono="laton" punto>
                Vence en {{ fila.diasParaVencer }} d
              </KmBadge>
              <span v-else-if="fila.lote.vencimiento" class="text-xs text-tenue">
                Vence {{ fila.lote.vencimiento }}
              </span>
            </template>
            <span v-else class="text-tenue">Sin lote</span>
          </template>
          <template #col-ubicacion="{ fila }">
            <span v-if="fila.ubicacion" class="tabular-nums">{{
              codigoUbicacion(fila.ubicacion)
            }}</span>
            <span v-else class="text-tenue">Sin ubicación</span>
          </template>
          <template #col-cantidad="{ fila }">
            <span class="font-semibold text-tinta tabular-nums">{{ cantidad(fila) }}</span>
          </template>
          <template #vacio>
            <KmEstado
              tipo="vacio"
              mensaje="Ningún insumo controla lote ni ubicación con estos filtros."
            />
          </template>
        </KmTable>
      </div>
    </KmCard>
  </div>
</template>
