<script setup lang="ts">
import KmButton from './KmButton.vue'
import KmModal from './KmModal.vue'

withDefaults(
  defineProps<{
    titulo?: string
    mensaje: string
    textoConfirmar?: string
    peligroso?: boolean
    cargando?: boolean
  }>(),
  { titulo: '¿Confirmar acción?', textoConfirmar: 'Confirmar', peligroso: false, cargando: false },
)

const abierto = defineModel<boolean>({ required: true })
const emit = defineEmits<{ confirmar: [] }>()
</script>

<template>
  <KmModal v-model="abierto" :titulo="titulo" ancho="sm">
    <p class="text-sm text-ink-600">{{ mensaje }}</p>

    <template #footer>
      <KmButton variante="secundario" :disabled="cargando" @click="abierto = false"
        >Cancelar</KmButton
      >
      <KmButton
        :variante="peligroso ? 'peligro' : 'primario'"
        :cargando="cargando"
        @click="emit('confirmar')"
      >
        {{ textoConfirmar }}
      </KmButton>
    </template>
  </KmModal>
</template>
