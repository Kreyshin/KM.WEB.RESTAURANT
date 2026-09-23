<script setup lang="ts">
import { ref, watch } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCampoEstado from '@/components/ui/KmCampoEstado.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmModal from '@/components/ui/KmModal.vue'
import { useLocalStore } from '@/stores/local.store'
import type { ApiError, NuevoSalon, Salon } from '@/types'

const props = defineProps<{
  /** Salón a editar; `null` significa "crear nuevo". */
  salon: Salon | null
  /** Orden sugerido para un salón nuevo. */
  ordenSugerido: number
}>()

const abierto = defineModel<boolean>({ required: true })
const emit = defineEmits<{ guardado: [datos: NuevoSalon, id?: string] }>()

const localStore = useLocalStore()
const form = ref<NuevoSalon>({ nombre: '', localId: '', descripcion: '', orden: 1, activo: true })
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

// Al abrir, el formulario se rellena con el salón en edición o se limpia.
watch(abierto, (esta) => {
  if (!esta) return
  errores.value = {}
  guardando.value = false
  form.value = props.salon
    ? { ...props.salon }
    : {
        nombre: '',
        localId: localStore.localId ?? '',
        descripcion: '',
        orden: props.ordenSugerido,
        activo: true,
      }
})

function validar() {
  errores.value = {}
  if (!form.value.nombre.trim()) errores.value.nombre = 'El nombre es obligatorio.'
  if (!Number.isFinite(Number(form.value.orden)) || Number(form.value.orden) < 1) {
    errores.value.orden = 'El orden debe ser un número mayor o igual a 1.'
  }
  return Object.keys(errores.value).length === 0
}

async function enviar() {
  if (!validar()) return
  guardando.value = true
  try {
    emit('guardado', { ...form.value, orden: Number(form.value.orden) }, props.salon?.id)
  } finally {
    guardando.value = false
  }
}

/** El padre reporta errores de servidor (ej. nombre duplicado). */
function mostrarError(e: ApiError) {
  errores.value = e.campos ?? {}
}

defineExpose({ mostrarError })
</script>

<template>
  <KmModal v-model="abierto" :titulo="salon ? 'Editar salón' : 'Nuevo salón'">
    <form id="form-salon" class="flex flex-col gap-4" @submit.prevent="enviar">
      <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
        <KmInput :id="id" v-model="form.nombre" placeholder="Ej. Terraza" :invalido="invalido" />
      </KmField>

      <KmField v-slot="{ id }" label="Descripción" ayuda="Referencia interna, opcional.">
        <KmInput :id="id" v-model="form.descripcion" placeholder="Ej. Al aire libre, techada" />
      </KmField>

      <KmField
        v-slot="{ id, invalido }"
        label="Orden"
        :error="errores.orden"
        ayuda="Define la posición en el selector de salones."
        requerido
      >
        <KmNumero :id="id" v-model="form.orden" :min="1" :invalido="invalido" />
      </KmField>

      <KmCampoEstado v-if="salon" v-model="form.activo" :original="salon.activo" />
    </form>

    <template #footer>
      <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
      <KmButton type="submit" form="form-salon" :cargando="guardando">
        {{ salon ? 'Guardar cambios' : 'Crear salón' }}
      </KmButton>
    </template>
  </KmModal>
</template>
