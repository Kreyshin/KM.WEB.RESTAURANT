<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { es } from 'date-fns/locale'
import { useUiStore } from '@/stores/ui.store'
import { FORMATO_FECHA_VISIBLE, FORMATO_FECHA_MODELO, etiquetasCalendario } from '@/utils/fechas'

withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    invalido?: boolean
    disabled?: boolean
    /** Límites en `YYYY-MM-DD`. */
    min?: string
    max?: string
    limpiable?: boolean
  }>(),
  { placeholder: 'dd/mm/aaaa', invalido: false, disabled: false, limpiable: true },
)

/** Fecha en `YYYY-MM-DD`: el mismo formato que viajará a la API. */
const fecha = defineModel<string | null>()

const ui = useUiStore()
</script>

<template>
  <!--
    Clic en el mes o en el año de la cabecera abre su selector; el campo admite
    escribir la fecha a mano (01/08/2026 o 01082026).
  -->
  <VueDatePicker
    v-model="fecha"
    :model-type="FORMATO_FECHA_MODELO"
    :formats="{ input: FORMATO_FECHA_VISIBLE }"
    :text-input="{
      format: [FORMATO_FECHA_VISIBLE, 'ddMMyyyy'],
      openMenu: 'toggle',
      enterSubmit: true,
    }"
    :locale="es"
    :aria-labels="etiquetasCalendario"
    :week-start="1"
    :time-config="{ enableTimePicker: false }"
    :dark="ui.tema === 'oscuro'"
    :placeholder="placeholder"
    :min-date="min"
    :max-date="max"
    :disabled="disabled"
    :input-attrs="{ id, clearable: limpiable, state: invalido ? false : undefined }"
    auto-apply
  />
</template>
