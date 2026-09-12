<script setup lang="ts">
import { ref, watch } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import type { ApiError, Mesa, NuevaMesa, Salon, Usuario } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { estadosMesa, etiquetaEstado, etiquetaForma } from '@/utils/mesas'

const props = defineProps<{
  /** Mesa a editar; `null` significa "crear nueva". */
  mesa: Mesa | null
  salones: Salon[]
  meseros: Usuario[]
  /** Salón preseleccionado al crear. */
  salonPorDefecto?: string
}>()

const abierto = defineModel<boolean>({ required: true })
const emit = defineEmits<{ guardado: [datos: NuevaMesa, id?: string] }>()

const vacia = (): NuevaMesa => ({
  salonId: props.salonPorDefecto ?? props.salones[0]?.id ?? '',
  codigo: '',
  capacidad: 4,
  forma: 'cuadrada',
  estado: 'libre',
  meseroId: undefined,
  // Las mesas nuevas aparecen en el centro del plano, listas para reposicionar.
  posX: 45,
  posY: 45,
})

const form = ref<NuevaMesa>(vacia())
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

watch(abierto, (esta) => {
  if (!esta) return
  errores.value = {}
  guardando.value = false
  form.value = props.mesa ? { ...props.mesa } : vacia()
})

const opcionesSalon = (): OpcionSelect[] =>
  props.salones.map((s) => ({
    valor: s.id,
    etiqueta: s.activo ? s.nombre : `${s.nombre} (inactivo)`,
  }))

const opcionesForma: OpcionSelect[] = (['cuadrada', 'redonda', 'rectangular'] as const).map(
  (f) => ({
    valor: f,
    etiqueta: etiquetaForma[f],
  }),
)

const opcionesEstado: OpcionSelect[] = estadosMesa.map((e) => ({
  valor: e,
  etiqueta: etiquetaEstado[e],
}))

const opcionesMesero = (): OpcionSelect[] => [
  { valor: '', etiqueta: 'Sin asignar' },
  ...props.meseros.map((m) => ({ valor: m.id, etiqueta: m.nombre })),
]

function validar() {
  errores.value = {}
  if (!form.value.salonId) errores.value.salonId = 'Selecciona un salón.'
  if (!form.value.codigo.trim()) errores.value.codigo = 'El código es obligatorio.'
  const cap = Number(form.value.capacidad)
  if (!Number.isInteger(cap) || cap < 1 || cap > 30) {
    errores.value.capacidad = 'La capacidad debe estar entre 1 y 30.'
  }
  return Object.keys(errores.value).length === 0
}

async function enviar() {
  if (!validar()) return
  guardando.value = true
  try {
    emit(
      'guardado',
      {
        ...form.value,
        capacidad: Number(form.value.capacidad),
        // El select devuelve '' para "sin asignar"; el modelo espera undefined.
        meseroId: form.value.meseroId || undefined,
      },
      props.mesa?.id,
    )
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
  <KmModal v-model="abierto" :titulo="mesa ? `Editar mesa ${mesa.codigo}` : 'Nueva mesa'">
    <form id="form-mesa" class="grid gap-4 sm:grid-cols-2" @submit.prevent="enviar">
      <KmField v-slot="{ id, invalido }" label="Salón" :error="errores.salonId" requerido>
        <KmSelect
          :id="id"
          v-model="form.salonId"
          :opciones="opcionesSalon()"
          :invalido="invalido"
        />
      </KmField>

      <KmField
        v-slot="{ id, invalido }"
        label="Código"
        :error="errores.codigo"
        ayuda="Único dentro del salón."
        requerido
      >
        <KmInput :id="id" v-model="form.codigo" placeholder="M-01" :invalido="invalido" />
      </KmField>

      <KmField v-slot="{ id, invalido }" label="Capacidad" :error="errores.capacidad" requerido>
        <KmInput
          :id="id"
          v-model="form.capacidad"
          type="number"
          min="1"
          max="30"
          :invalido="invalido"
        />
      </KmField>

      <KmField v-slot="{ id }" label="Forma">
        <KmSelect :id="id" v-model="form.forma" :opciones="opcionesForma" />
      </KmField>

      <KmField v-slot="{ id }" label="Estado">
        <KmSelect :id="id" v-model="form.estado" :opciones="opcionesEstado" />
      </KmField>

      <KmField v-slot="{ id }" label="Mesero asignado">
        <KmSelect :id="id" v-model="form.meseroId" :opciones="opcionesMesero()" />
      </KmField>
    </form>

    <template #footer>
      <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
      <KmButton type="submit" form="form-mesa" :cargando="guardando">
        {{ mesa ? 'Guardar cambios' : 'Crear mesa' }}
      </KmButton>
    </template>
  </KmModal>
</template>
