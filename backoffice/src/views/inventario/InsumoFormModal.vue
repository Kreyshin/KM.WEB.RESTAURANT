<script setup lang="ts">
import { ref, watch } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import type { ApiError, Insumo, NuevoInsumo } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaUnidad, unidadesMedida } from '@/utils/formato'

const props = defineProps<{
  /** Insumo a editar; `null` significa "crear nuevo". */
  insumo: Insumo | null
}>()

const abierto = defineModel<boolean>({ required: true })
const emit = defineEmits<{ guardado: [datos: NuevoInsumo, id?: string] }>()

const vacio = (): NuevoInsumo => ({
  nombre: '',
  unidad: 'kg',
  stock: 0,
  stockMinimo: 0,
  costoUnitario: 0,
  proveedor: '',
  activo: true,
})

const form = ref<NuevoInsumo>(vacio())
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

watch(abierto, (esta) => {
  if (!esta) return
  errores.value = {}
  guardando.value = false
  form.value = props.insumo ? { ...props.insumo } : vacio()
})

const opcionesUnidad: OpcionSelect[] = unidadesMedida.map((u) => ({
  valor: u,
  etiqueta: `${u} · ${etiquetaUnidad[u]}`,
}))

function validar() {
  errores.value = {}
  const f = form.value
  if (!f.nombre.trim()) errores.value.nombre = 'El nombre es obligatorio.'
  if (!Number.isFinite(Number(f.stock)) || Number(f.stock) < 0) {
    errores.value.stock = 'El stock no puede ser negativo.'
  }
  if (!Number.isFinite(Number(f.stockMinimo)) || Number(f.stockMinimo) < 0) {
    errores.value.stockMinimo = 'El mínimo no puede ser negativo.'
  }
  if (!Number.isFinite(Number(f.costoUnitario)) || Number(f.costoUnitario) < 0) {
    errores.value.costoUnitario = 'El costo no puede ser negativo.'
  }
  return Object.keys(errores.value).length === 0
}

function enviar() {
  if (!validar()) return
  guardando.value = true
  try {
    emit(
      'guardado',
      {
        ...form.value,
        stock: Number(form.value.stock),
        stockMinimo: Number(form.value.stockMinimo),
        costoUnitario: Number(form.value.costoUnitario),
      },
      props.insumo?.id,
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
  <KmModal v-model="abierto" :titulo="insumo ? `Editar ${insumo.nombre}` : 'Nuevo insumo'">
    <form id="form-insumo" class="grid gap-4 sm:grid-cols-2" @submit.prevent="enviar">
      <KmField
        v-slot="{ id, invalido }"
        class="sm:col-span-2"
        label="Nombre"
        :error="errores.nombre"
        requerido
      >
        <KmInput
          :id="id"
          v-model="form.nombre"
          placeholder="Ej. Lomo fino de res"
          :invalido="invalido"
        />
      </KmField>

      <KmField v-slot="{ id }" label="Unidad de medida">
        <KmSelect :id="id" v-model="form.unidad" :opciones="opcionesUnidad" />
      </KmField>

      <KmField v-slot="{ id }" label="Proveedor">
        <KmInput :id="id" v-model="form.proveedor" placeholder="Opcional" />
      </KmField>

      <KmField
        v-slot="{ id, invalido }"
        label="Stock actual"
        :error="errores.stock"
        :ayuda="insumo ? 'Para corregirlo, mejor registra un movimiento de ajuste.' : undefined"
      >
        <KmNumero :id="id" v-model="form.stock" :min="0" :invalido="invalido" :decimales="3" />
      </KmField>

      <KmField
        v-slot="{ id, invalido }"
        label="Stock mínimo"
        :error="errores.stockMinimo"
        ayuda="Por debajo de este valor se avisa."
      >
        <KmNumero
          :id="id"
          v-model="form.stockMinimo"
          :min="0"
          :invalido="invalido"
          :decimales="3"
        />
      </KmField>

      <KmField
        v-slot="{ id, invalido }"
        label="Costo por unidad"
        :error="errores.costoUnitario"
        ayuda="En soles. Se usa para el coste de las recetas."
      >
        <KmNumero
          :id="id"
          v-model="form.costoUnitario"
          :min="0"
          :invalido="invalido"
          prefijo="S/"
          :decimales="2"
        />
      </KmField>

      <div class="flex items-end pb-2">
        <label class="flex items-center gap-2.5">
          <input
            v-model="form.activo"
            type="checkbox"
            class="size-4 rounded border-linea accent-[var(--rs-accion)]"
          />
          <span class="text-sm text-tinta">Insumo en uso</span>
        </label>
      </div>
    </form>

    <template #footer>
      <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
      <KmButton type="submit" form="form-insumo" :cargando="guardando">
        {{ insumo ? 'Guardar cambios' : 'Crear insumo' }}
      </KmButton>
    </template>
  </KmModal>
</template>
