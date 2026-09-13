<script setup lang="ts">
import { copiar } from '@/utils/copiar'
import { computed, ref, watch } from 'vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import type { DiaSemana } from '@/types'
import { etiquetaDia } from '@/utils/configuracion'
import KmButton from '@/components/ui/KmButton.vue'
import KmCampoEstado from '@/components/ui/KmCampoEstado.vue'
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
    ? copiar({ ...props.categoria })
    : { nombre: '', descripcion: '', orden: props.ordenSugerido, activa: true }
})

const conHorario = computed({
  get: () => !!form.value.disponibilidad,
  set: (v: boolean) => {
    form.value.disponibilidad = v
      ? { dias: [0, 1, 2, 3, 4, 5, 6], desde: '12:00', hasta: '16:00' }
      : undefined
  },
})

const dias = [0, 1, 2, 3, 4, 5, 6] as DiaSemana[]

function alternarDia(dia: DiaSemana) {
  const d = form.value.disponibilidad
  if (!d) return
  d.dias = d.dias.includes(dia) ? d.dias.filter((x) => x !== dia) : [...d.dias, dia].sort()
}

function validar() {
  errores.value = {}
  if (!form.value.nombre.trim()) errores.value.nombre = 'El nombre es obligatorio.'
  const d = form.value.disponibilidad
  if (d && d.dias.length === 0) errores.value.disponibilidad = 'Elige al menos un día.'
  else if (d && (!d.desde || !d.hasta || d.desde === d.hasta)) {
    errores.value.disponibilidad = 'Indica una hora de inicio y de fin distintas.'
  }
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

      <section class="flex flex-col gap-3 rounded-card border border-linea p-4">
        <KmSwitch
          v-model="conHorario"
          etiqueta="Horario de disponibilidad"
          descripcion="Fuera de esta franja la categoría no se ofrece. Sin horario, se ofrece siempre."
        />
        <template v-if="form.disponibilidad">
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Días">
            <button
              v-for="d in dias"
              :key="d"
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
              :class="
                form.disponibilidad.dias.includes(d)
                  ? 'border-rail bg-rail text-rail-tinta'
                  : 'border-linea text-tenue hover:border-verde hover:text-tinta'
              "
              :aria-pressed="form.disponibilidad.dias.includes(d)"
              @click="alternarDia(d)"
            >
              {{ etiquetaDia[d].slice(0, 3) }}
            </button>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <input
              v-model="form.disponibilidad.desde"
              type="time"
              aria-label="Desde"
              class="rs-campo h-9 rounded-control border border-linea bg-panel px-2 text-tinta"
            />
            <span class="text-tenue">a</span>
            <input
              v-model="form.disponibilidad.hasta"
              type="time"
              aria-label="Hasta"
              class="rs-campo h-9 rounded-control border border-linea bg-panel px-2 text-tinta"
            />
          </div>
        </template>
        <p v-if="errores.disponibilidad" class="text-xs font-medium text-vino">
          {{ errores.disponibilidad }}
        </p>
      </section>

      <KmCampoEstado
        v-if="categoria"
        v-model="form.activa"
        :original="categoria.activa"
        texto-activo="Visible en la carta"
        texto-inactivo="Oculta de la carta"
        descripcion="Una categoría oculta esconde también sus productos."
      />
    </form>

    <template #footer>
      <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
      <KmButton type="submit" form="form-categoria" :cargando="guardando">
        {{ categoria ? 'Guardar cambios' : 'Crear categoría' }}
      </KmButton>
    </template>
  </KmModal>
</template>
