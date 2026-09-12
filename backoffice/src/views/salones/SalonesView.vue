<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmTable from '@/components/ui/KmTable.vue'
import SalonFormModal from './SalonFormModal.vue'
import { mesasService } from '@/services/mesas.service'
import { salonesService } from '@/services/salones.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Mesa, NuevoSalon, Salon } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

const ui = useUiStore()

const salones = ref<Salon[]>([])
const mesas = ref<Mesa[]>([])
const cargando = ref(true)

const modalAbierto = ref(false)
const salonEnEdicion = ref<Salon | null>(null)
const formRef = ref<InstanceType<typeof SalonFormModal> | null>(null)

const confirmAbierto = ref(false)
const salonAEliminar = ref<Salon | null>(null)
const eliminando = ref(false)

const columnas: ColumnaTabla[] = [
  { clave: 'orden', etiqueta: '#', clase: 'w-16' },
  { clave: 'nombre', etiqueta: 'Salón' },
  { clave: 'mesas', etiqueta: 'Mesas', clase: 'w-28' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-32' },
  { clave: 'acciones', etiqueta: '', clase: 'w-32 text-right' },
]

const ordenSugerido = computed(() => Math.max(0, ...salones.value.map((s) => s.orden)) + 1)

function mesasDe(salonId: string) {
  return mesas.value.filter((m) => m.salonId === salonId).length
}

async function cargar() {
  cargando.value = true
  try {
    ;[salones.value, mesas.value] = await Promise.all([
      salonesService.listar(),
      mesasService.listar(),
    ])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar los salones.')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function abrirNuevo() {
  salonEnEdicion.value = null
  modalAbierto.value = true
}

function abrirEdicion(salon: Salon) {
  salonEnEdicion.value = salon
  modalAbierto.value = true
}

async function guardar(datos: NuevoSalon, id?: string) {
  try {
    if (id) {
      await salonesService.actualizar(id, datos)
      ui.exito('Salón actualizado.')
    } else {
      await salonesService.crear(datos)
      ui.exito('Salón creado.')
    }
    modalAbierto.value = false
    await cargar()
  } catch (e) {
    const err = e as ApiError
    ui.error(err.mensaje ?? 'No se pudo guardar el salón.')
    formRef.value?.mostrarError(err)
  }
}

function pedirEliminar(salon: Salon) {
  salonAEliminar.value = salon
  confirmAbierto.value = true
}

async function eliminar() {
  if (!salonAEliminar.value) return
  eliminando.value = true
  try {
    await salonesService.eliminar(salonAEliminar.value.id)
    ui.exito('Salón eliminado.')
    confirmAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar el salón.')
  } finally {
    eliminando.value = false
  }
}

async function alternarActivo(salon: Salon) {
  try {
    await salonesService.actualizar(salon.id, { activo: !salon.activo })
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar el estado.')
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCard
      titulo="Salones"
      subtitulo="Zonas físicas del restaurante donde se distribuyen las mesas."
      sin-padding
    >
      <template #acciones>
        <KmButton tamano="sm" @click="abrirNuevo">Nuevo salón</KmButton>
      </template>

      <KmTable
        :columnas="columnas"
        :filas="salones"
        :cargando="cargando"
        mensaje-vacio="Aún no hay salones. Crea el primero para empezar a configurar mesas."
      >
        <template #col-orden="{ fila }">
          <span class="text-tenue tabular-nums">{{ fila.orden }}</span>
        </template>

        <template #col-nombre="{ fila }">
          <p class="font-medium text-tinta">{{ fila.nombre }}</p>
          <p v-if="fila.descripcion" class="text-xs text-tenue">{{ fila.descripcion }}</p>
        </template>

        <template #col-mesas="{ fila }">
          <span class="tabular-nums">{{ mesasDe(fila.id) }}</span>
        </template>

        <template #col-estado="{ fila }">
          <button type="button" title="Cambiar estado" @click="alternarActivo(fila)">
            <KmBadge :tono="fila.activo ? 'verde' : 'neutro'" punto>
              {{ fila.activo ? 'Activo' : 'Inactivo' }}
            </KmBadge>
          </button>
        </template>

        <template #col-acciones="{ fila }">
          <div class="flex justify-end gap-1">
            <KmButton variante="fantasma" tamano="sm" @click="abrirEdicion(fila)">Editar</KmButton>
            <KmButton variante="fantasma" tamano="sm" @click="pedirEliminar(fila)">
              <span class="text-vino">Eliminar</span>
            </KmButton>
          </div>
        </template>
      </KmTable>
    </KmCard>

    <SalonFormModal
      ref="formRef"
      v-model="modalAbierto"
      :salon="salonEnEdicion"
      :orden-sugerido="ordenSugerido"
      @guardado="guardar"
    />

    <KmConfirm
      v-model="confirmAbierto"
      titulo="Eliminar salón"
      :mensaje="`¿Eliminar «${salonAEliminar?.nombre}»? Esta acción no se puede deshacer.`"
      texto-confirmar="Eliminar"
      peligroso
      :cargando="eliminando"
      @confirmar="eliminar"
    />
  </div>
</template>
