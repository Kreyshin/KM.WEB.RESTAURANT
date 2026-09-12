<script setup lang="ts">
import { ref, watch } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import type { ApiError, Categoria, NuevaCategoria } from '@/types'

const props = defineProps<{
  /** Categoría a editar; `null` significa "crear nueva". */
  categoria: Categoria | null
  ordenSugerido: number
}>()

const abierto = defineModel<boolean>({ required: true })
const emit = defineEmits<{ guardado: [datos: NuevaCategoria, id?: string] }>()

const form = ref<NuevaCategoria>({ nombre: '', descripcion: '', orden: 1, activa: true })
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

watch(abierto, (esta) => {
  if (!esta) return
  errores.value = {}
  guardando.value = false
  form.value = props.categoria
    ? { ...props.categoria }
    : { nombre: '', descripcion: '', orden: props.ordenSugerido, activa: true }
})

function validar() {
  errores.value = {}
  if (!form.value.nombre.trim()) errores.value.nombre = 'El nombre es obligatorio.'
  return Object.keys(errores.value).length === 0
}

function enviar() {
  if (!validar()) return
  guardando.value = true
  try {
    emit('guardado', { ...form.value, orden: Number(form.value.orden) }, props.categoria?.id)
  } finally {
    guardando.value = false
  }
}

function mostrarError(e: ApiError) {
  errores.value = e.campos ?? {}
}

defineExpose({ mostrarError })
</script>

<template>
  <KmModal v-model="abierto" :titulo="categoria ? 'Editar categoría' : 'Nueva categoría'">
    <form id="form-categoria" class="flex flex-col gap-4" @submit.prevent="enviar">
      <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
        <KmInput :id="id" v-model="form.nombre" placeholder="Ej. Entradas" :invalido="invalido" />
      </KmField>

      <KmField v-slot="{ id }" label="Descripción" ayuda="Aparece bajo el nombre en la carta.">
        <KmInput :id="id" v-model="form.descripcion" placeholder="Ej. Para empezar" />
      </KmField>

      <label class="flex items-center gap-2.5">
        <input
          v-model="form.activa"
          type="checkbox"
          class="size-4 rounded border-linea accent-[var(--rs-accion)]"
        />
        <span class="text-sm text-tinta">Categoría visible en la carta</span>
      </label>
    </form>

    <template #footer>
      <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
      <KmButton type="submit" form="form-categoria" :cargando="guardando">
        {{ categoria ? 'Guardar cambios' : 'Crear categoría' }}
      </KmButton>
    </template>
  </KmModal>
</template>
