<script setup lang="ts">
import { computed } from 'vue'
import KmIcono from '@/components/ui/KmIcono.vue'

/**
 * Cómo lo que compra el ERP (sacos, cajas, balones) se vuelve stock en la
 * unidad del insumo: «2 Saco 50 kg → 100 kg de Arroz extra», con la regla
 * «1 Saco 50 kg = 50 kg» a la vista.
 */
const props = defineProps<{
  /** Unidades de compra. */
  cantidad: number
  unidadCompra: string
  factor: number
  /** Unidad del insumo ya legible: «kg», «u.». */
  unidadInsumo: string
  insumo: string
  /** Atenuado cuando no entra nada. */
  apagado?: boolean
}>()

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 }).format(Math.round(n * 1000) / 1000)

const entra = computed(() => props.cantidad * props.factor)
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-linea bg-panel-2 px-3 py-2.5"
    :class="apagado ? 'opacity-50' : ''"
  >
    <div class="flex items-center gap-2">
      <span class="grid size-9 place-items-center rounded-control bg-laton/15 text-laton-texto">
        <KmIcono nombre="caja" tamano="md" />
      </span>
      <div class="leading-tight">
        <p class="text-[11px] uppercase tracking-wide text-tenue">Compra</p>
        <p class="font-semibold whitespace-nowrap text-tinta tabular-nums">
          {{ fmt(cantidad) }} <span class="font-normal">{{ unidadCompra }}</span>
        </p>
      </div>
    </div>

    <div class="flex flex-col items-center px-1 text-tenue">
      <span class="text-[11px] whitespace-nowrap tabular-nums">× {{ fmt(factor) }}</span>
      <KmIcono nombre="flecha" tamano="md" />
    </div>

    <div class="flex items-center gap-2">
      <span class="grid size-9 place-items-center rounded-control bg-verde/15 text-verde">
        <KmIcono nombre="estante" tamano="md" />
      </span>
      <div class="leading-tight">
        <p class="text-[11px] uppercase tracking-wide text-tenue">Entra al stock</p>
        <p class="font-semibold whitespace-nowrap text-tinta tabular-nums">
          {{ fmt(entra) }} {{ unidadInsumo }}
          <span class="font-normal text-tenue">de {{ insumo }}</span>
        </p>
      </div>
    </div>

    <p
      class="ml-auto rounded-full border border-linea px-2.5 py-0.5 text-xs whitespace-nowrap text-tenue tabular-nums"
      title="Conversión del artículo del ERP al insumo"
    >
      1 {{ unidadCompra }} = {{ fmt(factor) }} {{ unidadInsumo }}
    </p>
  </div>
</template>
