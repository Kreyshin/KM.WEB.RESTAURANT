<script setup lang="ts">
import { computed } from 'vue'
import KmSwitch from './KmSwitch.vue'

const props = withDefaults(
  defineProps<{
    /** Estado con el que se abrió el formulario: si cambia, se avisa de la confirmación. */
    original: boolean
    textoActivo?: string
    textoInactivo?: string
    descripcion?: string
  }>(),
  {
    textoActivo: 'Activo',
    textoInactivo: 'Inactivo',
    descripcion: 'Los registros inactivos no se usan en la operación, pero conservan su historial.',
  },
)

const activo = defineModel<boolean>({ required: true })

const ayuda = computed(() =>
  activo.value !== props.original ? 'Se pedirá confirmación al guardar.' : props.descripcion,
)
</script>

<template>
  <section class="mt-2 flex flex-col gap-2 rounded-card border border-linea bg-panel-2 p-4">
    <h3 class="rs-etiqueta text-tenue">Estado</h3>
    <KmSwitch
      v-model="activo"
      :etiqueta="activo ? textoActivo : textoInactivo"
      :descripcion="ayuda"
    />
  </section>
</template>
