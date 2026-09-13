<script setup lang="ts" generic="T extends { id: string; activo: boolean }">
import { computed, ref, shallowRef, type Ref } from 'vue'
import KmBadge from './KmBadge.vue'
import KmBusqueda from './KmBusqueda.vue'
import KmButton from './KmButton.vue'
import KmCard from './KmCard.vue'
import KmConfirm from './KmConfirm.vue'
import KmDrawer from './KmDrawer.vue'
import KmExportar from './KmExportar.vue'
import KmPaginacion from './KmPaginacion.vue'
import KmSelect from './KmSelect.vue'
import KmTable from './KmTable.vue'
import { useListado } from '@/composables/useListado'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Consulta, Orden, Paginado } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { exportarCsv, exportarExcel, type ColumnaExportable } from '@/utils/exportar'

/**
 * Pantalla de mantenimiento completa para catálogos simples: búsqueda, filtro
 * de estado, tabla ordenable, paginación, exportación y un drawer de alta y
 * edición con confirmación de borrado. La vista solo aporta columnas, el
 * formulario y el servicio.
 */

export interface ServicioCatalogo<I> {
  consultar(consulta: Consulta): Promise<Paginado<I>>
  crear(datos: Omit<I, 'id'>): Promise<I>
  actualizar(id: string, datos: Partial<Omit<I, 'id'>>): Promise<I>
  eliminar?(id: string): Promise<void>
}

const props = withDefaults(
  defineProps<{
    titulo: string
    subtitulo?: string
    /** Nombre en singular y en minúscula: «medio de pago». */
    entidad: string
    /** Género gramatical para los textos: «Nuevo medio» / «Nueva serie». */
    femenino?: boolean
    servicio: ServicioCatalogo<T>
    columnas: ColumnaTabla[]
    /** Registro vacío para el alta. */
    nuevo: () => Omit<T, 'id'>
    /** Texto que identifica un registro en confirmaciones y avisos. */
    nombreDe: (item: T) => string
    /** Validación en el cliente; devuelve errores por campo. */
    validar?: (borrador: Omit<T, 'id'>) => Record<string, string>
    /** Filtros fijos de esta pantalla (p. ej. el tipo de motivo). */
    filtrosFijos?: Consulta['filtros']
    orden?: Orden
    exportacion?: ColumnaExportable<T>[]
    /** Nombre base del archivo exportado. */
    archivo?: string
    anchoDrawer?: 'sm' | 'md' | 'lg'
    sinTarjeta?: boolean
  }>(),
  { femenino: false, anchoDrawer: 'md', sinTarjeta: false },
)

defineSlots<{
  [key: `col-${string}`]: (props: { fila: T }) => unknown
  formulario(props: {
    borrador: Omit<T, 'id'>
    errores: Record<string, string>
    editando: boolean
  }): unknown
  filtros?(props: { consulta: Consulta }): unknown
  acciones?(): unknown
}>()

const ui = useUiStore()

const listado = useListado((c) => props.servicio.consultar(c), {
  orden: props.orden,
  filtros: { ...props.filtrosFijos },
})
const { consulta, items, total, cargando, error, recargar } = listado

const nuevoTxt = computed(() => (props.femenino ? 'Nueva' : 'Nuevo'))
const entidadCap = computed(() => props.entidad[0]!.toUpperCase() + props.entidad.slice(1))

// ── Filtro de estado ──
const opcionesEstado: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los estados' },
  { valor: 'activo', etiqueta: props.femenino ? 'Activas' : 'Activos' },
  { valor: 'inactivo', etiqueta: props.femenino ? 'Inactivas' : 'Inactivos' },
]

const filtroEstado = computed({
  get: () => {
    const activo = consulta.filtros?.activo
    return activo === undefined ? '' : activo ? 'activo' : 'inactivo'
  },
  set: (v: string | number | undefined) => {
    consulta.filtros = {
      ...consulta.filtros,
      activo: v === '' || v === undefined ? undefined : v === 'activo',
    }
  },
})

const hayCriterios = computed(
  () =>
    !!consulta.buscar ||
    Object.entries(consulta.filtros ?? {}).some(
      ([k, v]) => v !== undefined && v !== '' && !(k in (props.filtrosFijos ?? {})),
    ),
)

// ── Alta y edición ──
const drawerAbierto = ref(false)
const editandoId = ref<string | null>(null)
const borrador = ref({}) as unknown as Ref<Omit<T, 'id'>>
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

function abrirNuevo() {
  editandoId.value = null
  borrador.value = { ...props.nuevo(), ...props.filtrosFijos } as Omit<T, 'id'>
  errores.value = {}
  drawerAbierto.value = true
}

function abrirEdicion(fila: T) {
  const { id, ...resto } = structuredClone(JSON.parse(JSON.stringify(fila))) as T
  editandoId.value = id
  borrador.value = resto
  errores.value = {}
  drawerAbierto.value = true
}

async function guardar() {
  errores.value = props.validar?.(borrador.value) ?? {}
  if (Object.keys(errores.value).length) return
  guardando.value = true
  try {
    if (editandoId.value) {
      await props.servicio.actualizar(editandoId.value, borrador.value)
      ui.exito(`${entidadCap.value} actualizad${props.femenino ? 'a' : 'o'}.`)
    } else {
      await props.servicio.crear(borrador.value)
      ui.exito(`${entidadCap.value} cread${props.femenino ? 'a' : 'o'}.`)
    }
    drawerAbierto.value = false
    await recargar()
    emit('cambio')
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar.')
  } finally {
    guardando.value = false
  }
}

async function alternarActivo(fila: T) {
  try {
    await props.servicio.actualizar(fila.id, { activo: !fila.activo } as Partial<Omit<T, 'id'>>)
    await recargar()
    emit('cambio')
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar el estado.')
  }
}

// ── Eliminación ──
const confirmAbierto = ref(false)
const aEliminar = shallowRef<T | null>(null)
const eliminando = ref(false)

function pedirEliminar(fila: T) {
  aEliminar.value = fila
  confirmAbierto.value = true
}

async function eliminar() {
  if (!aEliminar.value || !props.servicio.eliminar) return
  eliminando.value = true
  try {
    await props.servicio.eliminar(aEliminar.value.id)
    ui.exito(`${entidadCap.value} eliminad${props.femenino ? 'a' : 'o'}.`)
    confirmAbierto.value = false
    await recargar()
    emit('cambio')
  } catch (e) {
    confirmAbierto.value = false
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  } finally {
    eliminando.value = false
  }
}

// ── Exportación ──
async function exportar(formato: 'csv' | 'excel') {
  if (!props.exportacion) return
  try {
    const r = await props.servicio.consultar({ ...consulta, pagina: 1, porPagina: 10_000 })
    const base = props.archivo ?? props.titulo.toLowerCase().replace(/\s+/g, '-')
    if (formato === 'csv') exportarCsv(base, r.items, props.exportacion)
    else exportarExcel(base, r.items, props.exportacion)
    ui.exito(`Exportados ${r.items.length} registros.`)
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo exportar.')
  }
}

const columnasTabla = computed<ColumnaTabla[]>(() => [
  ...props.columnas,
  { clave: 'activo', etiqueta: 'Estado', clase: 'w-28', ordenable: true },
  { clave: '_acciones', etiqueta: '', clase: 'w-36 text-right' },
])

const emit = defineEmits<{ cambio: [] }>()

/** Fuera de la plantilla: el `<` de un genérico en una interpolación confunde al formateador. */
function valorDe(fila: T, clave: string) {
  return (fila as Record<string, unknown>)[clave]
}

defineExpose({ recargar, abrirNuevo })
</script>

<template>
  <component
    :is="sinTarjeta ? 'div' : KmCard"
    v-bind="
      sinTarjeta
        ? { class: 'overflow-hidden rounded-card border border-linea bg-panel' }
        : { titulo, subtitulo, sinPadding: true }
    "
  >
    <template v-if="!sinTarjeta" #acciones>
      <slot name="acciones" />
      <KmExportar v-if="exportacion" :disabled="total === 0" @exportar="exportar" />
      <KmButton tamano="sm" @click="abrirNuevo">{{ nuevoTxt }} {{ entidad }}</KmButton>
    </template>

    <div class="flex flex-wrap items-center gap-3 border-b border-linea px-6 py-3">
      <KmBusqueda v-model="consulta.buscar" :placeholder="`Buscar ${entidad}`" />
      <slot name="filtros" :consulta="consulta" />
      <div class="w-full sm:w-44">
        <KmSelect v-model="filtroEstado" :opciones="opcionesEstado" etiqueta="Filtrar por estado" />
      </div>
      <template v-if="sinTarjeta">
        <div class="flex-1" />
        <KmExportar v-if="exportacion" :disabled="total === 0" @exportar="exportar" />
        <KmButton tamano="sm" @click="abrirNuevo">{{ nuevoTxt }} {{ entidad }}</KmButton>
      </template>
    </div>

    <KmTable
      v-model:orden="consulta.orden"
      :columnas="columnasTabla"
      :filas="items"
      :cargando="cargando"
      :error="error"
      :mensaje-vacio="
        hayCriterios
          ? `Ningún registro coincide con la búsqueda o el filtro.`
          : `Aún no hay registros. Crea ${femenino ? 'la primera' : 'el primero'} con «${nuevoTxt} ${entidad}».`
      "
      @reintentar="recargar"
    >
      <template v-for="c in columnas" :key="c.clave" #[`col-${c.clave}`]="{ fila }">
        <slot :name="`col-${c.clave}`" :fila="fila">
          {{ valorDe(fila, c.clave) }}
        </slot>
      </template>

      <template #col-activo="{ fila }">
        <button type="button" title="Cambiar estado" @click="alternarActivo(fila)">
          <KmBadge :tono="fila.activo ? 'verde' : 'neutro'" punto>
            {{
              fila.activo ? (femenino ? 'Activa' : 'Activo') : femenino ? 'Inactiva' : 'Inactivo'
            }}
          </KmBadge>
        </button>
      </template>

      <template #col-_acciones="{ fila }">
        <div class="flex justify-end gap-1">
          <KmButton variante="fantasma" tamano="sm" @click="abrirEdicion(fila)">Editar</KmButton>
          <KmButton
            v-if="servicio.eliminar"
            variante="fantasma"
            tamano="sm"
            @click="pedirEliminar(fila)"
          >
            <span class="text-vino">Eliminar</span>
          </KmButton>
        </div>
      </template>
    </KmTable>

    <KmPaginacion
      v-if="!error"
      v-model:pagina="consulta.pagina"
      v-model:por-pagina="consulta.porPagina"
      :total="total"
    />

    <KmDrawer
      v-model="drawerAbierto"
      :titulo="editandoId ? `Editar ${entidad}` : `${nuevoTxt} ${entidad}`"
      :ancho="anchoDrawer"
    >
      <form
        :id="`form-${entidad}`"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="guardar"
      >
        <slot name="formulario" :borrador="borrador" :errores="errores" :editando="!!editandoId" />
      </form>
      <template #footer>
        <KmButton variante="secundario" :disabled="guardando" @click="drawerAbierto = false">
          Cancelar
        </KmButton>
        <KmButton type="submit" :form="`form-${entidad}`" :cargando="guardando">
          {{ editandoId ? 'Guardar cambios' : `Crear ${entidad}` }}
        </KmButton>
      </template>
    </KmDrawer>

    <KmConfirm
      v-model="confirmAbierto"
      :titulo="`Eliminar ${entidad}`"
      :mensaje="`¿Eliminar «${aEliminar ? nombreDe(aEliminar) : ''}»? Esta acción no se puede deshacer.`"
      texto-confirmar="Eliminar"
      peligroso
      :cargando="eliminando"
      @confirmar="eliminar"
    />
  </component>
</template>
