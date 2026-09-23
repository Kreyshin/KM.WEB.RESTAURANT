<script setup lang="ts">
import { computed } from 'vue'
import KmButton from './KmButton.vue'
import KmModal from './KmModal.vue'

const props = withDefaults(
  defineProps<{
    /** `true` si se va a activar; `false` si se va a desactivar. */
    activar: boolean
    /** Nombre del registro: «Terraza». */
    nombre: string
    /** Qué ocurre al confirmar, una idea por línea. */
    consecuencias: string[]
    cargando?: boolean
  }>(),
  { cargando: false },
)

const abierto = defineModel<boolean>({ required: true })
const emit = defineEmits<{ confirmar: [] }>()

const verbo = computed(() => (props.activar ? 'Activar' : 'Desactivar'))
</script>

<template>
  <KmModal v-model="abierto" :titulo="`${verbo} «${nombre}»`" ancho="sm">
    <div class="flex flex-col gap-3">
      <p class="text-sm text-tinta">
        {{
          activar
            ? 'Al guardar, este registro vuelve a estar disponible:'
            : 'Al guardar, este registro deja de estar disponible:'
        }}
      </p>

      <ul
        class="flex flex-col gap-2 rounded-card border px-4 py-3 text-sm"
        :class="activar ? 'rs-tono rs-tono-verde' : 'rs-tono rs-tono-laton'"
      >
        <li v-for="c in consecuencias" :key="c" class="flex gap-2">
          <span aria-hidden="true">•</span>
          <span>{{ c }}</span>
        </li>
      </ul>

      <p v-if="!activar" class="text-xs text-tenue">
        No se borra nada: el historial se conserva y puedes volver a activarlo cuando quieras.
      </p>
    </div>

    <template #footer>
      <KmButton variante="secundario" :disabled="cargando" @click="abierto = false">
        Volver
      </KmButton>
      <KmButton
        :variante="activar ? 'primario' : 'peligro'"
        :cargando="cargando"
        @click="emit('confirmar')"
      >
        {{ verbo }} y guardar
      </KmButton>
    </template>
  </KmModal>
</template>
