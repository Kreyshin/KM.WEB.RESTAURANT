<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import KmField from '@/components/ui/KmField.vue'
import KmRangoFechas from '@/components/ui/KmRangoFechas.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { canalesService } from '@/services/comercial.service'
import { reportesService } from '@/services/reportes.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  CanalVenta,
  ConsumoInsumo,
  RentabilidadPlato,
  ResumenConsumo,
  ResumenPlatos,
  ResumenVentas,
  VentasPorDia,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana, RangoFechas } from '@/types/ui'
import { exportarCsv, exportarExcel, type ColumnaExportable } from '@/utils/exportar'
import { etiquetaUnidad, formatearSoles } from '@/utils/formato'

/**
 * Reportes (F9, D-014). Cada cifra dice de dónde sale: la venta anulada no
 * existe, el ingreso se mide neto, la propina y el recargo al consumo van
 * aparte, y la comisión de las apps se enseña sin restarla de la venta.
 */

const ui = useUiStore()
const localStore = useLocalStore()

const hoy = new Date()
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const rango = ref<RangoFechas>({
  desde: iso(new Date(hoy.getTime() - 13 * 86_400_000)),
  hasta: iso(hoy),
})
const canalId = ref('')
const canales = shallowRef<CanalVenta[]>([])
const ventas = shallowRef<ResumenVentas | null>(null)
const platos = shallowRef<ResumenPlatos | null>(null)
const consumo = shallowRef<ResumenConsumo | null>(null)
const cargando = ref(false)

const filtro = computed(() => ({
  localId: localStore.localId ?? undefined,
  desde: rango.value.desde,
  hasta: rango.value.hasta,
  canalId: canalId.value || undefined,
}))

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  try {
    const [v, p, c, cs] = await Promise.all([
      reportesService.ventas(filtro.value),
      reportesService.platos(filtro.value),
      reportesService.consumo(filtro.value),
      canalesService.todos(),
    ])
    ventas.value = v
    platos.value = p
    consumo.value = c
    canales.value = cs
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron calcular los reportes.')
  } finally {
    cargando.value = false
  }
}
watch([() => localStore.localId, rango, canalId], cargar, { immediate: true, deep: true })

const pestana = ref<'ventas' | 'platos' | 'consumo'>('ventas')
const pestanas = computed<Pestana[]>(() => [
  { valor: 'ventas', etiqueta: 'Ventas', contador: ventas.value?.cuentas },
  { valor: 'platos', etiqueta: 'Rentabilidad por plato', contador: platos.value?.platos.length },
  { valor: 'consumo', etiqueta: 'Consumo y mermas', contador: consumo.value?.insumos.length },
])

const opcionesCanal = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los canales' },
  ...canales.value.filter((c) => c.activo).map((c) => ({ valor: c.id, etiqueta: c.nombre })),
])

/** Barra proporcional para leer el día o la hora de un vistazo. */
const proporcion = (valor: number, maximo: number) => (maximo ? (valor / maximo) * 100 : 0)
const maxDia = computed(() => Math.max(1, ...(ventas.value?.porDia.map((d) => d.total) ?? [1])))
const maxHora = computed(() => Math.max(1, ...(ventas.value?.porHora.map((h) => h.total) ?? [1])))

const columnasDia: ColumnaTabla[] = [
  { clave: 'fecha', etiqueta: 'Día', ordenable: true },
  { clave: 'cuentas', etiqueta: 'Cuentas', clase: 'text-right' },
  { clave: 'neto', etiqueta: 'Ingreso neto', clase: 'text-right' },
  { clave: 'recargoConsumo', etiqueta: 'Recargo', clase: 'text-right' },
  { clave: 'propinas', etiqueta: 'Propinas', clase: 'text-right' },
  { clave: 'total', etiqueta: 'Cobrado', clase: 'text-right' },
]

const columnasPlato: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Plato' },
  { clave: 'unidades', etiqueta: 'Unidades', clase: 'text-right' },
  { clave: 'ingresoNeto', etiqueta: 'Ingreso neto', clase: 'text-right' },
  { clave: 'costo', etiqueta: 'Costo', clase: 'text-right' },
  { clave: 'margen', etiqueta: 'Margen', clase: 'text-right' },
  { clave: 'foodCostReal', etiqueta: 'Food cost', clase: 'text-right' },
]

const columnasConsumo: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Insumo' },
  { clave: 'teorico', etiqueta: 'Según recetas', clase: 'text-right' },
  { clave: 'real', etiqueta: 'Salió del almacén', clase: 'text-right' },
  { clave: 'merma', etiqueta: 'Merma', clase: 'text-right' },
  { clave: 'diferencia', etiqueta: 'Diferencia', clase: 'text-right' },
  { clave: 'costoDiferencia', etiqueta: 'Cuánto cuesta', clase: 'text-right' },
]

/** Se exporta lo que se está mirando, con las columnas de esa pestaña. */
const columnasDiaExport: ColumnaExportable<VentasPorDia>[] = [
  { etiqueta: 'Día', valor: (d) => d.fecha },
  { etiqueta: 'Cuentas', valor: (d) => d.cuentas },
  { etiqueta: 'Comensales', valor: (d) => d.comensales },
  { etiqueta: 'Ingreso neto', valor: (d) => d.neto },
  { etiqueta: 'IGV', valor: (d) => d.igv },
  { etiqueta: 'Recargo al consumo', valor: (d) => d.recargoConsumo },
  { etiqueta: 'Propinas', valor: (d) => d.propinas },
  { etiqueta: 'Descuentos', valor: (d) => d.descuentos },
  { etiqueta: 'Cobrado', valor: (d) => d.total },
]

const columnasPlatoExport: ColumnaExportable<RentabilidadPlato>[] = [
  { etiqueta: 'Plato', valor: (p) => p.nombre },
  { etiqueta: 'Categoría', valor: (p) => p.categoria },
  { etiqueta: 'Clase', valor: (p) => p.clase },
  { etiqueta: 'Unidades', valor: (p) => p.unidades },
  { etiqueta: 'Ingreso neto', valor: (p) => p.ingresoNeto },
  { etiqueta: 'Costo', valor: (p) => (p.sinReceta ? '' : p.costo) },
  { etiqueta: 'Margen', valor: (p) => p.margen },
  { etiqueta: 'Food cost %', valor: (p) => (p.sinReceta ? '' : p.foodCostReal) },
  { etiqueta: 'Objetivo %', valor: (p) => p.objetivo },
]

const columnasConsumoExport: ColumnaExportable<ConsumoInsumo>[] = [
  { etiqueta: 'Insumo', valor: (i) => i.nombre },
  { etiqueta: 'Unidad', valor: (i) => i.unidad },
  { etiqueta: 'Según recetas', valor: (i) => i.teorico },
  { etiqueta: 'Salió del almacén', valor: (i) => i.real },
  { etiqueta: 'Merma', valor: (i) => i.merma },
  { etiqueta: 'Diferencia', valor: (i) => i.diferencia },
  { etiqueta: 'Costo de la diferencia', valor: (i) => i.costoDiferencia },
]

function exportar(formato: 'csv' | 'excel') {
  const salida = <T,>(nombre: string, filas: readonly T[], columnas: ColumnaExportable<T>[]) => {
    if (!filas.length) {
      ui.error('No hay nada que exportar en este periodo.')
      return
    }
    if (formato === 'csv') exportarCsv(nombre, filas, columnas)
    else exportarExcel(nombre, filas, columnas)
    ui.exito(`Exportadas ${filas.length} fila(s).`)
  }

  if (pestana.value === 'ventas')
    salida('ventas-por-dia', ventas.value?.porDia ?? [], columnasDiaExport)
  else if (pestana.value === 'platos')
    salida('rentabilidad-por-plato', platos.value?.platos ?? [], columnasPlatoExport)
  else salida('consumo-y-mermas', consumo.value?.insumos ?? [], columnasConsumoExport)
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <p class="rs-etiqueta text-laton-texto">Qué dejó el servicio</p>
          <h2 class="rs-titulo-seccion mt-1 text-tinta">Reportes</h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            La venta anulada no cuenta, el ingreso se mide sin IGV —que es lo comparable con el
            costo— y la propina no es ingreso del restaurante: va en su columna.
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <KmField label="Periodo">
            <KmRangoFechas v-model="rango" />
          </KmField>
          <KmField v-slot="{ id }" label="Canal">
            <KmSelect :id="id" v-model="canalId" :opciones="opcionesCanal" />
          </KmField>
          <KmExportar :disabled="cargando" @exportar="exportar" />
        </div>
      </div>

      <div class="px-6 pt-4 pb-6">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Reportes">
          <!-- ── Ventas ── -->
          <div v-if="pestana === 'ventas' && ventas" class="flex flex-col gap-5">
            <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Ingreso neto</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ formatearSoles(ventas.neto) }}
                </dd>
                <p class="text-xs text-tenue">
                  Cobrado {{ formatearSoles(ventas.total) }} · IGV {{ formatearSoles(ventas.igv) }}
                </p>
              </div>
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Cuentas</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ ventas.cuentas }}
                </dd>
                <p class="text-xs text-tenue">
                  Ticket medio {{ formatearSoles(ventas.ticketMedio) }}
                  <template v-if="ventas.gastoPorComensal">
                    · {{ formatearSoles(ventas.gastoPorComensal) }} por comensal
                  </template>
                </p>
              </div>
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">No es ingreso</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ formatearSoles(ventas.recargoConsumo + ventas.propinas) }}
                </dd>
                <p class="text-xs text-tenue">
                  Recargo {{ formatearSoles(ventas.recargoConsumo) }} · propinas
                  {{ formatearSoles(ventas.propinas) }}
                </p>
              </div>
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Descuentos y anulaciones</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ formatearSoles(ventas.descuentos) }}
                </dd>
                <p class="text-xs text-tenue">
                  {{ ventas.anuladas }} venta(s) anulada(s), fuera del reporte
                </p>
              </div>
            </dl>

            <div class="grid gap-5 xl:grid-cols-2">
              <div class="rounded-card border border-linea p-4">
                <h3 class="rs-etiqueta text-tenue">Por canal</h3>
                <ul class="mt-3 flex flex-col gap-2">
                  <li v-for="c in ventas.porCanal" :key="c.canalId" class="flex flex-col gap-1">
                    <div class="flex items-baseline justify-between gap-2 text-sm">
                      <span class="text-tinta">{{ c.nombre }}</span>
                      <span class="tabular-nums text-tenue">
                        {{ formatearSoles(c.total) }} · {{ c.participacion }} %
                      </span>
                    </div>
                    <div class="h-1.5 w-full rounded-full bg-linea">
                      <div
                        class="h-1.5 rounded-full bg-accion"
                        :style="{ width: `${c.participacion}%` }"
                      />
                    </div>
                    <span v-if="c.comision" class="text-xs text-vino-texto">
                      Comisión del canal: {{ formatearSoles(c.comision) }} (gasto, no menor venta)
                    </span>
                  </li>
                </ul>
              </div>

              <div class="rounded-card border border-linea p-4">
                <h3 class="rs-etiqueta text-tenue">Por hora</h3>
                <ul class="mt-3 flex flex-col gap-1.5">
                  <li
                    v-for="h in ventas.porHora"
                    :key="h.hora"
                    class="flex items-center gap-3 text-sm"
                  >
                    <span class="w-12 shrink-0 text-tenue tabular-nums">
                      {{ String(h.hora).padStart(2, '0') }}:00
                    </span>
                    <div class="h-1.5 flex-1 rounded-full bg-linea">
                      <div
                        class="h-1.5 rounded-full bg-accion"
                        :style="{ width: `${proporcion(h.total, maxHora)}%` }"
                      />
                    </div>
                    <span class="w-24 shrink-0 text-right text-tenue tabular-nums">
                      {{ formatearSoles(h.total) }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <KmTable
              :columnas="columnasDia"
              :filas="ventas.porDia.map((d) => ({ ...d, id: d.fecha }))"
              :cargando="cargando"
              mensaje-vacio="No hubo ventas en este periodo."
            >
              <template #col-fecha="{ fila }">
                <div class="flex items-center gap-3">
                  <span class="w-24 shrink-0 tabular-nums">{{ fila.fecha }}</span>
                  <div class="h-1.5 w-24 rounded-full bg-linea">
                    <div
                      class="h-1.5 rounded-full bg-accion"
                      :style="{ width: `${proporcion(fila.total, maxDia)}%` }"
                    />
                  </div>
                </div>
              </template>
              <template #col-cuentas="{ fila }">
                <span class="tabular-nums">{{ fila.cuentas }}</span>
              </template>
              <template #col-neto="{ fila }">
                <span class="tabular-nums">{{ formatearSoles(fila.neto) }}</span>
              </template>
              <template #col-recargoConsumo="{ fila }">
                <span class="tabular-nums text-tenue">
                  {{ formatearSoles(fila.recargoConsumo) }}
                </span>
              </template>
              <template #col-propinas="{ fila }">
                <span class="tabular-nums text-tenue">{{ formatearSoles(fila.propinas) }}</span>
              </template>
              <template #col-total="{ fila }">
                <span class="font-semibold tabular-nums">{{ formatearSoles(fila.total) }}</span>
              </template>
            </KmTable>
          </div>

          <!-- ── Platos ── -->
          <div v-else-if="pestana === 'platos' && platos" class="flex flex-col gap-4">
            <dl class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Margen de contribución</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ formatearSoles(platos.margen) }}
                </dd>
                <p class="text-xs text-tenue">
                  Sobre {{ formatearSoles(platos.ingresoNeto) }} de ingreso neto
                </p>
              </div>
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Food cost real</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ platos.foodCostReal }} %
                </dd>
                <p class="text-xs text-tenue">Costo de lo vendido entre su ingreso neto</p>
              </div>
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Unidades vendidas</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ platos.unidades }}
                </dd>
                <p v-if="platos.sinReceta" class="text-xs text-laton-texto">
                  {{ platos.sinReceta }} plato(s) sin receta: su costo no entra
                </p>
              </div>
            </dl>

            <p class="text-xs text-tenue">
              El costo es el de la receta vigente hoy, no el del día de la venta: con precios de
              insumo movidos, el margen histórico se desvía.
            </p>

            <KmTable
              :columnas="columnasPlato"
              :filas="platos.platos.map((p) => ({ ...p, id: p.vendibleId }))"
              :cargando="cargando"
              mensaje-vacio="No se vendió nada en este periodo."
            >
              <template #col-nombre="{ fila }">
                <div class="flex flex-col gap-1">
                  <span class="text-tinta">{{ fila.nombre }}</span>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <KmBadge
                      :tono="fila.clase === 'A' ? 'verde' : fila.clase === 'B' ? 'laton' : 'neutro'"
                    >
                      {{ fila.clase }}
                    </KmBadge>
                    <span class="text-xs text-tenue">{{ fila.categoria }}</span>
                    <KmBadge v-if="fila.sinReceta" tono="vino">Sin receta</KmBadge>
                  </div>
                </div>
              </template>
              <template #col-unidades="{ fila }">
                <span class="tabular-nums">{{ fila.unidades }}</span>
              </template>
              <template #col-ingresoNeto="{ fila }">
                <span class="tabular-nums">{{ formatearSoles(fila.ingresoNeto) }}</span>
              </template>
              <template #col-costo="{ fila }">
                <span class="tabular-nums text-tenue">
                  {{ fila.sinReceta ? '—' : formatearSoles(fila.costo) }}
                </span>
              </template>
              <template #col-margen="{ fila }">
                <span class="font-semibold tabular-nums">{{ formatearSoles(fila.margen) }}</span>
              </template>
              <template #col-foodCostReal="{ fila }">
                <span
                  v-if="!fila.sinReceta"
                  class="tabular-nums"
                  :class="fila.foodCostReal > fila.objetivo ? 'text-vino-texto' : 'text-verde'"
                >
                  {{ fila.foodCostReal }} % / {{ fila.objetivo }} %
                </span>
                <span v-else class="text-tenue">—</span>
              </template>
            </KmTable>
          </div>

          <!-- ── Consumo ── -->
          <div v-else-if="consumo" class="flex flex-col gap-4">
            <dl class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Según las recetas</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ formatearSoles(consumo.costoTeorico) }}
                </dd>
              </div>
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Salió del almacén</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ formatearSoles(consumo.costoReal) }}
                </dd>
              </div>
              <div class="rounded-card border border-linea p-4">
                <dt class="rs-etiqueta text-tenue">Mermas registradas</dt>
                <dd class="mt-1 text-2xl font-semibold text-tinta tabular-nums">
                  {{ formatearSoles(consumo.costoMerma) }}
                </dd>
              </div>
            </dl>

            <p class="text-xs text-tenue">
              La diferencia entre lo teórico y lo real es la que hay que explicar: merma sin
              registrar, porciones generosas o recetas mal escritas. El reporte la enseña, no la
              juzga.
            </p>

            <KmTable
              :columnas="columnasConsumo"
              :filas="consumo.insumos.map((i) => ({ ...i, id: i.insumoId }))"
              :cargando="cargando"
              mensaje-vacio="No hay consumo registrado en este periodo."
            >
              <template #col-teorico="{ fila }">
                <span class="tabular-nums">
                  {{ fila.teorico }} {{ etiquetaUnidad[fila.unidad] }}
                </span>
              </template>
              <template #col-real="{ fila }">
                <span class="tabular-nums">{{ fila.real }} {{ etiquetaUnidad[fila.unidad] }}</span>
              </template>
              <template #col-merma="{ fila }">
                <span class="tabular-nums text-tenue">{{ fila.merma || '—' }}</span>
              </template>
              <template #col-diferencia="{ fila }">
                <span
                  class="tabular-nums"
                  :class="fila.diferencia > 0 ? 'text-vino-texto' : 'text-tenue'"
                >
                  {{ fila.diferencia > 0 ? '+' : '' }}{{ fila.diferencia }}
                </span>
              </template>
              <template #col-costoDiferencia="{ fila }">
                <span
                  class="font-semibold tabular-nums"
                  :class="fila.costoDiferencia > 0 ? 'text-vino-texto' : 'text-tenue'"
                >
                  {{ formatearSoles(fila.costoDiferencia) }}
                </span>
              </template>
            </KmTable>
          </div>
        </KmTabs>
      </div>
    </KmCard>
  </div>
</template>
