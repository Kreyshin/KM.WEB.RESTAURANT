<script setup lang="ts">
import { computed } from 'vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import type { IngredienteReceta, Insumo } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaUnidad, formatearSoles } from '@/utils/formato'

const props = defineProps<{
  insumos: Insumo[]
  /** Insumo que no puede usarse (la propia preparación). */
  excluir?: string
}>()

const ingredientes = defineModel<IngredienteReceta[]>({ required: true })

const insumo = (id: string) => props.insumos.find((i) => i.id === id)

const opciones = computed<OpcionSelect[]>(() =>
  props.insumos
    .filter((i) => i.activo && i.id !== props.excluir)
    .map((i) => ({
      valor: i.id,
      etiqueta: `${i.nombre} · ${formatearSoles(i.costoUnitario)}/${etiquetaUnidad[i.unidad]}`,
    })),
)

const costoLinea = (g: IngredienteReceta) =>
  (insumo(g.insumoId)?.costoUnitario ?? 0) * (Number(g.cantidad) || 0)
const total = computed(() => ingredientes.value.reduce((t, g) => t + costoLinea(g), 0))

defineExpose({ total })
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="hidden grid-cols-[1fr_9rem_6rem_2.25rem] gap-2 px-1 sm:grid">
      <span class="rs-etiqueta text-tenue">Insumo</span>
      <span class="rs-etiqueta text-tenue">Cantidad</span>
      <span class="rs-etiqueta text-right text-tenue">Costo</span>
    </div>

    <div
      v-for="(g, i) in ingredientes"
      :key="i"
      class="grid grid-cols-[1fr_9rem_6rem_2.25rem] items-center gap-2"
    >
      <KmSelect
        v-model="g.insumoId"
        placeholder="Elige un insumo"
        :opciones="
          opciones.filter(
            (o) => o.valor === g.insumoId || !ingredientes.some((x) => x.insumoId === o.valor),
          )
        "
        etiqueta="Insumo"
      />
      <KmNumero
        v-model="g.cantidad"
        :min="0"
        :decimales="3"
        :controles="false"
        :sufijo="insumo(g.insumoId) ? etiquetaUnidad[insumo(g.insumoId)!.unidad] : ''"
      />
      <span class="text-right text-sm text-tenue tabular-nums">{{
        formatearSoles(costoLinea(g))
      }}</span>
      <KmBotonIcono
        icono="eliminar"
        tono="peligro"
        etiqueta="Quitar"
        :contexto="insumo(g.insumoId)?.nombre"
        @click="ingredientes.splice(i, 1)"
      />
    </div>

    <div class="flex items-center justify-between gap-3 pt-1">
      <KmButton
        variante="secundario"
        tamano="sm"
        @click="ingredientes.push({ insumoId: '', cantidad: 0 })"
      >
        Añadir ingrediente
      </KmButton>
      <p class="text-sm">
        <span class="text-tenue">Costo total</span>
        <strong class="rs-display ml-2 text-base text-tinta tabular-nums">{{
          formatearSoles(total)
        }}</strong>
      </p>
    </div>
  </div>
</template>
