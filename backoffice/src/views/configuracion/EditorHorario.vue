<script setup lang="ts">
import { computed } from 'vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import type { HorarioDia } from '@/types'
import { etiquetaDia } from '@/utils/configuracion'
import { duracionTurno, validarHorario } from '@/utils/validaciones'

const horario = defineModel<HorarioDia[]>({ required: true })

const errores = computed(() => validarHorario(horario.value))

function copiarATodos(origen: HorarioDia) {
  horario.value = horario.value.map((d) => ({
    ...d,
    abierto: origen.abierto,
    apertura: origen.apertura,
    cierre: origen.cierre,
  }))
}

function horas(d: HorarioDia) {
  if (!d.abierto || errores.value[d.dia]) return ''
  const min = duracionTurno(d.apertura, d.cierre)
  const texto = `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`
  return d.cierre < d.apertura ? `${texto} · cierra al día siguiente` : texto
}

const campo =
  'h-9 w-28 rounded-control border border-linea bg-panel px-2 text-sm text-tinta tabular-nums focus:border-verde disabled:opacity-40'
</script>

<template>
  <fieldset class="flex flex-col gap-1">
    <legend class="mb-2 text-sm font-semibold text-tinta">Horario de atención</legend>

    <div
      v-for="d in horario"
      :key="d.dia"
      class="grid grid-cols-[6.5rem_auto_1fr] items-center gap-x-3 gap-y-1 rounded-control px-2 py-2 odd:bg-panel-2"
    >
      <span class="text-sm font-medium text-tinta">{{ etiquetaDia[d.dia] }}</span>
      <KmSwitch v-model="d.abierto" :aria-label="`Abierto el ${etiquetaDia[d.dia]}`" />

      <div class="flex flex-wrap items-center gap-2">
        <template v-if="d.abierto">
          <input
            v-model="d.apertura"
            type="time"
            :class="campo"
            :aria-label="`Apertura del ${etiquetaDia[d.dia]}`"
          />
          <span class="text-tenue">a</span>
          <input
            v-model="d.cierre"
            type="time"
            :class="campo"
            :aria-label="`Cierre del ${etiquetaDia[d.dia]}`"
          />
          <button
            v-if="d.dia === 0"
            type="button"
            class="text-xs font-semibold text-verde hover:underline"
            @click="copiarATodos(d)"
          >
            Copiar a todos
          </button>
        </template>
        <span v-else class="text-sm text-tenue">Cerrado</span>
      </div>

      <p
        v-if="errores[d.dia] || horas(d)"
        class="col-start-3 text-xs"
        :class="errores[d.dia] ? 'text-vino' : 'text-tenue'"
      >
        {{ errores[d.dia] ?? horas(d) }}
      </p>
    </div>
  </fieldset>
</template>
