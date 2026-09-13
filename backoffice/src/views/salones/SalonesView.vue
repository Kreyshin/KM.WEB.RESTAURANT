<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmConfirmarEstado from '@/components/ui/KmConfirmarEstado.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import KmPaginacion from '@/components/ui/KmPaginacion.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import SalonFormModal from './SalonFormModal.vue'
import { useConfirmarEstado } from '@/composables/useConfirmarEstado'
import { useListado } from '@/composables/useListado'
import { dependenciasService } from '@/services/dependencias.service'
import { mesasService } from '@/services/mesas.service'
import { salonesService } from '@/services/salones.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Mesa, NuevoSalon, Salon } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { exportarCsv, exportarExcel, type ColumnaExportable } from '@/utils/exportar'

const ui = useUiStore()

const listado = useListado((consulta) => salonesService.consultar(consulta))
const { consulta, items, total, cargando, error } = listado

/** Catálogo completo: alimenta el recuento de mesas y el orden sugerido. */
const todos = ref<Salon[]>([])
const mesas = ref<Mesa[]>([])

const modalAbierto = ref(false)
const salonEnEdicion = ref<Salon | null>(null)
const formRef = ref<InstanceType<typeof SalonFormModal> | null>(null)

const confirmAbierto = ref(false)
const salonAEliminar = ref<Salon | null>(null)
const eliminando = ref(false)

const columnas: ColumnaTabla[] = [
  { clave: 'orden', etiqueta: '#', clase: 'w-16', ordenable: true },
  { clave: 'nombre', etiqueta: 'Salón', ordenable: true },
  { clave: 'mesas', etiqueta: 'Mesas', clase: 'w-28' },
  { clave: 'activo', etiqueta: 'Estado', clase: 'w-32', ordenable: true },
  { clave: 'acciones', etiqueta: '', clase: 'w-32 text-right' },
]

const opcionesEstado: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los estados' },
  { valor: 'activo', etiqueta: 'Activos' },
  { valor: 'inactivo', etiqueta: 'Inactivos' },
]

/** El select trabaja con texto; el filtro del servicio espera booleano. */
const filtroEstado = computed({
  get: () => {
    const activo = consulta.filtros?.activo
    return activo === undefined ? '' : activo ? 'activo' : 'inactivo'
  },
  set: (valor: string | number | undefined) => {
    consulta.filtros = {
      ...consulta.filtros,
      activo: valor === '' || valor === undefined ? undefined : valor === 'activo',
    }
  },
})

const hayCriterios = computed(() => !!consulta.buscar || consulta.filtros?.activo !== undefined)

const ordenSugerido = computed(() => Math.max(0, ...todos.value.map((s) => s.orden)) + 1)

function mesasDe(salonId: string) {
  return mesas.value.filter((m) => m.salonId === salonId).length
}

async function cargarCatalogo() {
  try {
    ;[todos.value, mesas.value] = await Promise.all([
      salonesService.listar(),
      mesasService.listar(),
    ])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar las mesas.')
  }
}

async function recargar() {
  await Promise.all([listado.recargar(), cargarCatalogo()])
}

onMounted(cargarCatalogo)

const columnasExport: ColumnaExportable<Salon>[] = [
  { etiqueta: 'Orden', valor: (s) => s.orden },
  { etiqueta: 'Salón', valor: (s) => s.nombre },
  { etiqueta: 'Descripción', valor: (s) => s.descripcion },
  { etiqueta: 'Mesas', valor: (s) => mesasDe(s.id) },
  { etiqueta: 'Activo', valor: (s) => s.activo },
]

/** Exporta todo lo que coincide con búsqueda y filtros, no solo la página visible. */
async function exportar(formato: 'csv' | 'excel') {
  try {
    const r = await salonesService.consultar({ ...consulta, pagina: 1, porPagina: 10_000 })
    if (formato === 'csv') exportarCsv('salones', r.items, columnasExport)
    else exportarExcel('salones', r.items, columnasExport)
    ui.exito(`Exportados ${r.items.length} salones.`)
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo exportar.')
  }
}

function abrirNuevo() {
  salonEnEdicion.value = null
  modalAbierto.value = true
}

function abrirEdicion(salon: Salon) {
  salonEnEdicion.value = salon
  modalAbierto.value = true
}

const estado = useConfirmarEstado()

async function guardar(datos: NuevoSalon, id?: string, confirmado = false): Promise<void> {
  const original = salonEnEdicion.value
  if (id && original && original.activo !== datos.activo && !confirmado) {
    return estado.pedir({
      nombre: datos.nombre,
      activar: datos.activo,
      consecuencias: () => dependenciasService.salon(id, datos.activo),
      continuar: () => guardar(datos, id, true),
    })
  }
  try {
    if (id) {
      await salonesService.actualizar(id, datos)
      ui.exito('Salón actualizado.')
    } else {
      await salonesService.crear(datos)
      ui.exito('Salón creado.')
    }
    modalAbierto.value = false
    await recargar()
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
    await recargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar el salón.')
  } finally {
    eliminando.value = false
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
        <KmExportar :disabled="total === 0" @exportar="exportar" />
        <KmButton tamano="sm" @click="abrirNuevo">Nuevo salón</KmButton>
      </template>

      <div class="flex flex-wrap items-center gap-3 border-b border-linea px-6 py-3">
        <KmBusqueda v-model="consulta.buscar" placeholder="Buscar salón" />
        <div class="w-full sm:w-48">
          <KmSelect
            v-model="filtroEstado"
            :opciones="opcionesEstado"
            etiqueta="Filtrar por estado"
          />
        </div>
      </div>

      <KmTable
        v-model:orden="consulta.orden"
        :columnas="columnas"
        :filas="items"
        :cargando="cargando"
        :error="error"
        :mensaje-vacio="
          hayCriterios
            ? 'Ningún salón coincide con la búsqueda o el filtro.'
            : 'Aún no hay salones. Crea el primero para empezar a configurar mesas.'
        "
        @reintentar="recargar"
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

        <template #col-activo="{ fila }">
          <KmBadge :tono="fila.activo ? 'verde' : 'neutro'" punto>
            {{ fila.activo ? 'Activo' : 'Inactivo' }}
          </KmBadge>
        </template>

        <template #col-acciones="{ fila }">
          <div class="flex justify-end gap-0.5">
            <KmBotonIcono
              icono="editar"
              :etiqueta="`Editar ${fila.nombre}`"
              @click="abrirEdicion(fila)"
            />
            <KmBotonIcono
              icono="eliminar"
              tono="peligro"
              :etiqueta="`Eliminar ${fila.nombre}`"
              @click="pedirEliminar(fila)"
            />
          </div>
        </template>
      </KmTable>

      <KmPaginacion
        v-if="!error"
        v-model:pagina="consulta.pagina"
        v-model:por-pagina="consulta.porPagina"
        :total="total"
      />
    </KmCard>

    <SalonFormModal
      ref="formRef"
      v-model="modalAbierto"
      :salon="salonEnEdicion"
      :orden-sugerido="ordenSugerido"
      @guardado="guardar"
    />

    <KmConfirmarEstado
      v-model="estado.abierto.value"
      :activar="estado.activar.value"
      :nombre="estado.nombre.value"
      :consecuencias="estado.consecuencias.value"
      :cargando="estado.cargando.value"
      @confirmar="estado.confirmar"
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
