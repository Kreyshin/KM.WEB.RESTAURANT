<script setup lang="ts">
import KmHora from '@/components/ui/KmHora.vue'
import { copiar } from '@/utils/copiar'
import { computed, ref, watch } from 'vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import type { DiaSemana } from '@/types'
import { etiquetaDia } from '@/utils/configuracion'
import KmButton from '@/components/ui/KmButton.vue'
import KmCampoEstado from '@/components/ui/KmCampoEstado.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useLocales } from '@/composables/useLocales'
import { canalesService } from '@/services/comercial.service'
import type { ApiError, CanalVenta, Categoria, NuevaCategoria } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { onMounted, shallowRef } from 'vue'

const props = defineProps<{
  /** Categoría a editar; `null` significa "crear nueva". */
  categoria: Categoria | null
  ordenSugerido: number
  categorias: Categoria[]
}>()

const { locales } = useLocales()
const canales = shallowRef<CanalVenta[]>([])
onMounted(async () => {
  canales.value = await canalesService.todos()
})

/** Solo agrupa en un nivel: la sección no puede estar dentro de otra ni ser esta misma. */
const agrupaOtras = computed(
  () => !!props.categoria && props.categorias.some((c) => c.seccionId === props.categoria!.id),
)
const opcionesSeccion = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'No está dentro de una sección' },
  ...props.categorias
    .filter((c) => c.id !== props.categoria?.id && !c.seccionId)
    .map((c) => ({ valor: c.id, etiqueta: c.nombre })),
])

function alternar(campo: 'localIds' | 'canalIds', id: string, marcado: boolean) {
  const actual = form.value[campo] ?? []
  form.value[campo] = marcado ? [...actual, id] : actual.filter((x) => x !== id)
}

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
    const datos: NuevaCategoria = {
      ...form.value,
      orden: Number(form.value.orden),
      seccionId: form.value.seccionId || undefined,
      localIds: form.value.localIds?.length ? form.value.localIds : undefined,
      canalIds: form.value.canalIds?.length ? form.value.canalIds : undefined,
      foodCostObjetivo: form.value.foodCostObjetivo ?? undefined,
    }
    emit('guardado', datos, props.categoria?.id)
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

      <KmField
        v-slot="{ id }"
        label="Sección"
        :error="errores.seccionId"
        :ayuda="
          agrupaOtras
            ? 'Esta categoría ya agrupa a otras: es una sección.'
            : 'Agrupa categorías en la carta: «Fondos» reúne criollos y marinos.'
        "
      >
        <KmSelect
          :id="id"
          :model-value="form.seccionId ?? ''"
          :opciones="opcionesSeccion"
          :disabled="agrupaOtras"
          @update:model-value="form.seccionId = String($event ?? '') || undefined"
        />
      </KmField>

      <section class="grid gap-4 rounded-card border border-linea p-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Locales</p>
          <p class="text-xs text-tenue">Sin marcar ninguno: todos.</p>
          <KmCheckbox
            v-for="l in locales"
            :key="l.id"
            :model-value="!!form.localIds?.includes(l.id)"
            @update:model-value="alternar('localIds', l.id, $event)"
          >
            {{ l.nombre }}
          </KmCheckbox>
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Canales</p>
          <p class="text-xs text-tenue">Incluye apps externas. Sin marcar: todos.</p>
          <KmCheckbox
            v-for="c in canales"
            :key="c.id"
            :model-value="!!form.canalIds?.includes(c.id)"
            @update:model-value="alternar('canalIds', c.id, $event)"
          >
            {{ c.nombre }}
          </KmCheckbox>
        </div>
      </section>

      <KmField
        v-slot="{ id }"
        label="Objetivo de food cost"
        :error="errores.foodCostObjetivo"
        ayuda="Sin valor usa el de su sección o el de la configuración. Una presentación puede fijar el suyo."
      >
        <KmNumero
          :id="id"
          :model-value="form.foodCostObjetivo ?? null"
          :min="1"
          :max="99"
          :decimales="1"
          sufijo="%"
          @update:model-value="form.foodCostObjetivo = $event ?? undefined"
        />
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
            <KmHora v-model="form.disponibilidad.desde" etiqueta="Desde" />
            <span class="text-tenue">a</span>
            <KmHora v-model="form.disponibilidad.hasta" etiqueta="Hasta" />
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
