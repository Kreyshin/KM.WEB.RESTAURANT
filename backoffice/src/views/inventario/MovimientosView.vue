<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import KmPaginacion from '@/components/ui/KmPaginacion.vue'
import KmRangoFechas from '@/components/ui/KmRangoFechas.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { useListado } from '@/composables/useListado'
import { inventarioService } from '@/services/inventario.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Movimiento, TipoMovimiento } from '@/types'
import type { ColumnaTabla, OpcionSelect, RangoFechas } from '@/types/ui'
import { exportarCsv, exportarExcel, type ColumnaExportable } from '@/utils/exportar'
import { rangoDeAtajo } from '@/utils/fechas'
import {
  etiquetaMovimiento,
  formatearCantidad,
  formatearFecha,
  formatearSoles,
  signoMovimiento,
  signoNumerico,
  tonoMovimiento,
} from '@/utils/formato'

const ui = useUiStore()
const catalogos = useCatalogos(['almacenes', 'insumos', 'locales'])
const { insumo, nombreAlmacen } = catalogos

const rango = ref<RangoFechas>(rangoDeAtajo('ultimos7'))

const { consulta, items, total, cargando, error, recargar } = useListado(
  (c) => inventarioService.consultarMovimientos(c),
  { porPagina: 20, filtros: { desde: rango.value.desde, hasta: rango.value.hasta } },
)

watch(rango, (r) => (consulta.filtros = { ...consulta.filtros, desde: r.desde, hasta: r.hasta }))

function filtrar(campo: string, valor: string | number | undefined) {
  consulta.filtros = { ...consulta.filtros, [campo]: valor || undefined }
}

const columnas: ColumnaTabla[] = [
  { clave: 'fecha', etiqueta: 'Fecha', clase: 'w-36', ordenable: true },
  { clave: 'insumoId', etiqueta: 'Insumo' },
  { clave: 'tipo', etiqueta: 'Movimiento', clase: 'w-44', ordenable: true },
  { clave: 'almacenId', etiqueta: 'Almacén', clase: 'w-40' },
  { clave: 'cantidad', etiqueta: 'Cantidad', clase: 'w-32 text-right' },
  { clave: 'valor', etiqueta: 'Valor', clase: 'w-28 text-right' },
]

const opcionesTipo: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los tipos' },
  ...(Object.keys(etiquetaMovimiento) as TipoMovimiento[]).map((t) => ({
    valor: t,
    etiqueta: etiquetaMovimiento[t],
  })),
]
const opcionesAlmacen = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los almacenes' },
  ...catalogos.opcionesAlmacen.value,
])
const opcionesInsumo = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los insumos' },
  ...catalogos.opcionesInsumo.value,
])

const valor = (m: Movimiento) => signoNumerico[m.tipo] * m.cantidad * (m.costoUnitario ?? 0)

const columnasExport: ColumnaExportable<Movimiento>[] = [
  { etiqueta: 'Fecha', valor: (m) => formatearFecha(m.fecha) },
  { etiqueta: 'Insumo', valor: (m) => insumo(m.insumoId)?.nombre },
  { etiqueta: 'Tipo', valor: (m) => etiquetaMovimiento[m.tipo] },
  { etiqueta: 'Almacén', valor: (m) => nombreAlmacen(m.almacenId) },
  { etiqueta: 'Cantidad', valor: (m) => signoNumerico[m.tipo] * m.cantidad },
  { etiqueta: 'Unidad', valor: (m) => insumo(m.insumoId)?.unidad },
  { etiqueta: 'Costo unitario', valor: (m) => m.costoUnitario },
  { etiqueta: 'Valor', valor: (m) => Math.round(valor(m) * 100) / 100 },
  { etiqueta: 'Motivo', valor: (m) => m.motivo },
  { etiqueta: 'Referencia', valor: (m) => m.referencia },
]

async function exportar(formato: 'csv' | 'excel') {
  try {
    const r = await inventarioService.consultarMovimientos({
      ...consulta,
      pagina: 1,
      porPagina: 10_000,
    })
    if (formato === 'csv') exportarCsv('movimientos', r.items, columnasExport)
    else exportarExcel('movimientos', r.items, columnasExport)
    ui.exito(`Exportados ${r.items.length} movimientos.`)
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo exportar.')
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
    <KmCard
      titulo="Movimientos"
      subtitulo="Todo lo que entra y sale de los almacenes: compras, consumos, mermas, traslados y ajustes."
      sin-padding
    >
      <template #acciones>
        <KmExportar :disabled="total === 0" @exportar="exportar" />
      </template>

      <div class="flex flex-wrap items-start gap-3 border-b border-linea px-6 py-3">
        <KmRangoFechas v-model="rango" :atajos="['hoy', 'ultimos7', 'ultimos30', 'esteMes']" />
        <div class="flex flex-wrap gap-3">
          <div class="w-full sm:w-52">
            <KmSelect
              :model-value="(consulta.filtros?.insumoId as string) ?? ''"
              :opciones="opcionesInsumo"
              etiqueta="Filtrar por insumo"
              @update:model-value="filtrar('insumoId', $event)"
            />
          </div>
          <div class="w-full sm:w-44">
            <KmSelect
              :model-value="(consulta.filtros?.tipo as string) ?? ''"
              :opciones="opcionesTipo"
              etiqueta="Filtrar por tipo"
              @update:model-value="filtrar('tipo', $event)"
            />
          </div>
          <div class="w-full sm:w-48">
            <KmSelect
              :model-value="(consulta.filtros?.almacenId as string) ?? ''"
              :opciones="opcionesAlmacen"
              etiqueta="Filtrar por almacén"
              @update:model-value="filtrar('almacenId', $event)"
            />
          </div>
        </div>
      </div>

      <KmTable
        v-model:orden="consulta.orden"
        :columnas="columnas"
        :filas="items"
        :cargando="cargando"
        :error="error"
        mensaje-vacio="No hay movimientos en este rango con estos filtros."
        @reintentar="recargar"
      >
        <template #col-fecha="{ fila }">
          <span class="text-tenue tabular-nums">{{ formatearFecha(fila.fecha) }}</span>
        </template>
        <template #col-insumoId="{ fila }">
          <p class="font-medium text-tinta">{{ insumo(fila.insumoId)?.nombre ?? '—' }}</p>
          <p v-if="fila.motivo || fila.referencia" class="text-xs text-tenue">
            {{ fila.motivo
            }}<template v-if="fila.referencia">
              · <span class="font-mono">{{ fila.referencia }}</span></template
            >
          </p>
        </template>
        <template #col-tipo="{ fila }">
          <KmBadge :tono="tonoMovimiento[fila.tipo]">{{ etiquetaMovimiento[fila.tipo] }}</KmBadge>
        </template>
        <template #col-almacenId="{ fila }">{{ nombreAlmacen(fila.almacenId) }}</template>
        <template #col-cantidad="{ fila }">
          <span
            class="font-medium tabular-nums"
            :class="signoNumerico[fila.tipo] > 0 ? 'text-verde' : 'text-tinta'"
          >
            {{ signoMovimiento[fila.tipo]
            }}{{
              insumo(fila.insumoId)
                ? formatearCantidad(fila.cantidad, insumo(fila.insumoId)!.unidad)
                : fila.cantidad
            }}
          </span>
        </template>
        <template #col-valor="{ fila }">
          <span class="text-tenue tabular-nums">{{ formatearSoles(Math.abs(valor(fila))) }}</span>
        </template>
      </KmTable>

      <KmPaginacion
        v-if="!error"
        v-model:pagina="consulta.pagina"
        v-model:por-pagina="consulta.porPagina"
        :total="total"
        :opciones-por-pagina="[20, 50, 100]"
      />
    </KmCard>
  </div>
</template>
