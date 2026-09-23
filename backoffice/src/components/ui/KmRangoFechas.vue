<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { es } from 'date-fns/locale'
import { useUiStore } from '@/stores/ui.store'
import type { RangoFechas } from '@/types/ui'
import {
  FORMATO_FECHA_MODELO,
  FORMATO_FECHA_VISIBLE,
  atajoDeRango,
  etiquetaAtajo,
  etiquetasCalendario,
  rangoDeAtajo,
  type AtajoRango,
} from '@/utils/fechas'

withDefaults(defineProps<{ atajos?: AtajoRango[]; id?: string; min?: string; max?: string }>(), {
  atajos: () => ['hoy', 'ayer', 'ultimos7', 'ultimos30', 'esteMes', 'mesAnterior'],
})

const rango = defineModel<RangoFechas>({ required: true })

const ui = useUiStore()

const SEPARADOR = ' – '

/** La librería trabaja con `[desde, hasta]`; el resto de la app, con `{ desde, hasta }`. */
const valor = computed<string[] | null>({
  get: () => [rango.value.desde, rango.value.hasta],
  set: (v) => {
    if (v?.[0] && v[1]) rango.value = { desde: v[0], hasta: v[1] }
  },
})

const atajoActivo = computed(() => atajoDeRango(rango.value))
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div class="w-full max-w-xs">
      <VueDatePicker
        v-model="valor"
        :range="{ partialRange: false }"
        :model-type="FORMATO_FECHA_MODELO"
        :formats="{ input: FORMATO_FECHA_VISIBLE }"
        :text-input="{
          format: FORMATO_FECHA_VISIBLE,
          rangeSeparator: SEPARADOR,
          openMenu: 'toggle',
          enterSubmit: true,
        }"
        :locale="es"
        :aria-labels="etiquetasCalendario"
        :week-start="1"
        :time-config="{ enableTimePicker: false }"
        :dark="ui.tema === 'oscuro'"
        :min-date="min"
        :max-date="max"
        :input-attrs="{ id, clearable: false }"
        placeholder="dd/mm/aaaa – dd/mm/aaaa"
        auto-apply
      />
    </div>

    <div class="flex flex-wrap gap-1.5" role="group" aria-label="Atajos de fecha">
      <button
        v-for="a in atajos"
        :key="a"
        type="button"
        class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
        :class="
          atajoActivo === a
            ? 'border-rail bg-rail text-rail-tinta'
            : 'border-linea text-tenue hover:border-verde hover:text-tinta'
        "
        :aria-pressed="atajoActivo === a"
        @click="rango = rangoDeAtajo(a)"
      >
        {{ etiquetaAtajo[a] }}
      </button>
    </div>
  </div>
</template>
