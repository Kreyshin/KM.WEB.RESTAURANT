<script setup lang="ts" generic="T extends { id: string; activo: boolean }">
import { copiar } from '@/utils/copiar'
import { computed, ref, shallowRef, useSlots, type Ref } from 'vue'
import KmBadge from './KmBadge.vue'
import KmBotonIcono from './KmBotonIcono.vue'
import KmBusqueda from './KmBusqueda.vue'
import KmCambioVista from './KmCambioVista.vue'
import KmButton from './KmButton.vue'
import KmCard from './KmCard.vue'
import KmConfirm from './KmConfirm.vue'
import KmConfirmarEstado from './KmConfirmarEstado.vue'
import KmDrawer from './KmDrawer.vue'
import KmExportar from './KmExportar.vue'
import KmOrigenErp from './KmOrigenErp.vue'
import KmPaginacion from './KmPaginacion.vue'
import KmSelect from './KmSelect.vue'
import KmCampoEstado from './KmCampoEstado.vue'
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
    /**
     * Qué provoca activar o desactivar este registro, para la confirmación.
     * Sin ella se muestra un texto genérico.
     */
    consecuenciasEstado?: (id: string, activar: boolean) => Promise<string[]>
    /** Datos del ERP: se consultan pero no se crean, editan ni eliminan. */
    soloLectura?: boolean
  }>(),
  { femenino: false, anchoDrawer: 'md', sinTarjeta: false, soloLectura: false },
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
  'acciones-fila'?(props: { fila: T }): unknown
  /** Con este slot aparece el interruptor Tabla / Tarjetas. */
  tarjeta?(props: { fila: T; editar: () => void; eliminar?: () => void }): unknown
}>()

const slots = useSlots()
const vista = ref<'tabla' | 'tarjetas'>('tabla')

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

/** Estado con el que se abrió la edición: cambiarlo exige confirmación. */
const activoOriginal = ref(true)
const confirmarEstadoAbierto = ref(false)
const consecuencias = ref<string[]>([])
let estadoConfirmado = false

function abrirNuevo() {
  editandoId.value = null
  borrador.value = { ...props.nuevo(), ...props.filtrosFijos } as Omit<T, 'id'>
  errores.value = {}
  drawerAbierto.value = true
}

function abrirEdicion(fila: T) {
  const { id, ...resto } = copiar(fila) as T
  editandoId.value = id
  borrador.value = resto
  activoOriginal.value = fila.activo
  estadoConfirmado = false
  errores.value = {}
  drawerAbierto.value = true
}

const activoBorrador = computed({
  get: () => (borrador.value as { activo?: boolean }).activo ?? true,
  set: (v: boolean) => ((borrador.value as { activo?: boolean }).activo = v),
})

async function guardar() {
  if (props.soloLectura) return
  errores.value = props.validar?.(borrador.value) ?? {}
  if (Object.keys(errores.value).length) return

  // Cambiar el estado afecta a otros registros: se explica antes de guardar.
  const cambiaEstado = !!editandoId.value && activoBorrador.value !== activoOriginal.value
  if (cambiaEstado && !estadoConfirmado) {
    guardando.value = true
    try {
      consecuencias.value = props.consecuenciasEstado
        ? await props.consecuenciasEstado(editandoId.value!, activoBorrador.value)
        : [
            activoBorrador.value
              ? 'Vuelve a estar disponible para usarse en la operación.'
              : 'Deja de estar disponible para usarse en la operación.',
          ]
    } catch {
      consecuencias.value = []
    } finally {
      guardando.value = false
    }
    confirmarEstadoAbierto.value = true
    return
  }

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
    estadoConfirmado = false
  }
}

async function confirmarEstado() {
  estadoConfirmado = true
  confirmarEstadoAbierto.value = false
  await guardar()
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
      <KmOrigenErp v-if="soloLectura" />
      <KmExportar v-if="exportacion" :disabled="total === 0" @exportar="exportar" />
      <KmButton v-if="!soloLectura" tamano="sm" @click="abrirNuevo">
        {{ nuevoTxt }} {{ entidad }}
      </KmButton>
    </template>

    <div class="flex flex-wrap items-center gap-3 border-b border-linea px-6 py-3">
      <KmBusqueda v-model="consulta.buscar" :placeholder="`Buscar ${entidad}`" />
      <slot name="filtros" :consulta="consulta" />
      <div class="w-full sm:w-44">
        <KmSelect v-model="filtroEstado" :opciones="opcionesEstado" etiqueta="Filtrar por estado" />
      </div>
      <KmCambioVista v-if="slots.tarjeta" v-model="vista" :clave="entidad" class="ml-auto" />
      <template v-if="sinTarjeta">
        <div class="flex-1" />
        <KmOrigenErp v-if="soloLectura" />
        <KmExportar v-if="exportacion" :disabled="total === 0" @exportar="exportar" />
        <KmButton v-if="!soloLectura" tamano="sm" @click="abrirNuevo">
          {{ nuevoTxt }} {{ entidad }}
        </KmButton>
      </template>
    </div>

    <div v-if="slots.tarjeta && vista === 'tarjetas'" class="p-4">
      <div v-if="cargando" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div v-for="i in 8" :key="i" class="h-56 animate-pulse rounded-card bg-seleccion"></div>
      </div>
      <p v-else-if="items.length === 0" class="py-10 text-center text-sm text-tenue">
        {{
          hayCriterios
            ? 'Ningún registro coincide con la búsqueda o el filtro.'
            : 'Aún no hay registros.'
        }}
      </p>
      <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <template v-for="fila in items" :key="fila.id">
          <slot
            name="tarjeta"
            :fila="fila"
            :editar="() => abrirEdicion(fila)"
            :eliminar="servicio.eliminar ? () => pedirEliminar(fila) : undefined"
          />
        </template>
      </div>
    </div>

    <KmTable
      v-else
      v-model:orden="consulta.orden"
      :columnas="columnasTabla"
      :filas="items"
      :cargando="cargando"
      :error="error"
      :mensaje-vacio="
        hayCriterios
          ? `Ningún registro coincide con la búsqueda o el filtro.`
          : soloLectura
            ? 'Aún no llegan registros desde el ERP.'
            : `Aún no hay registros. Crea ${femenino ? 'la primera' : 'el primero'} con «${nuevoTxt} ${entidad}».`
      "
      @reintentar="recargar"
    >
      <template v-for="c in columnas" :key="c.clave" #[`col-${c.clave}`]="{ fila }">
        <slot :name="`col-${c.clave}`" :fila="fila">
          {{ valorDe(fila, c.clave) }}
        </slot>
      </template>

      <!-- Solo informa: el estado se cambia dentro de la edición, con confirmación. -->
      <template #col-activo="{ fila }">
        <KmBadge :tono="fila.activo ? 'verde' : 'neutro'" punto>
          {{ fila.activo ? (femenino ? 'Activa' : 'Activo') : femenino ? 'Inactiva' : 'Inactivo' }}
        </KmBadge>
      </template>

      <template #col-_acciones="{ fila }">
        <div class="flex justify-end gap-0.5">
          <slot name="acciones-fila" :fila="fila" />
          <KmBotonIcono
            v-if="soloLectura"
            icono="ver"
            etiqueta="Ver"
            :contexto="nombreDe(fila)"
            @click="abrirEdicion(fila)"
          />
          <KmBotonIcono
            v-else
            icono="editar"
            etiqueta="Editar"
            :contexto="nombreDe(fila)"
            @click="abrirEdicion(fila)"
          />
          <KmBotonIcono
            v-if="servicio.eliminar && !soloLectura"
            icono="eliminar"
            tono="peligro"
            etiqueta="Eliminar"
            :contexto="nombreDe(fila)"
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

    <KmDrawer
      v-model="drawerAbierto"
      :titulo="
        soloLectura
          ? `Detalle de ${entidad}`
          : editandoId
            ? `Editar ${entidad}`
            : `${nuevoTxt} ${entidad}`
      "
      :ancho="anchoDrawer"
    >
      <form
        :id="`form-${entidad}`"
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="guardar"
      >
        <KmOrigenErp v-if="soloLectura" detalle />
        <fieldset :disabled="soloLectura" class="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
          <slot
            name="formulario"
            :borrador="borrador"
            :errores="errores"
            :editando="!!editandoId"
          />
        </fieldset>

        <KmCampoEstado
          v-if="editandoId && !soloLectura"
          v-model="activoBorrador"
          :original="activoOriginal"
          :texto-activo="femenino ? 'Activa' : 'Activo'"
          :texto-inactivo="femenino ? 'Inactiva' : 'Inactivo'"
        />
      </form>
      <template #footer>
        <KmButton v-if="soloLectura" variante="secundario" @click="drawerAbierto = false">
          Cerrar
        </KmButton>
        <template v-else>
          <KmButton variante="secundario" :disabled="guardando" @click="drawerAbierto = false">
            Cancelar
          </KmButton>
          <KmButton type="submit" :form="`form-${entidad}`" :cargando="guardando">
            {{ editandoId ? 'Guardar cambios' : `Crear ${entidad}` }}
          </KmButton>
        </template>
      </template>
    </KmDrawer>

    <KmConfirmarEstado
      v-model="confirmarEstadoAbierto"
      :activar="activoBorrador"
      :nombre="editandoId ? nombreDe({ ...borrador, id: editandoId } as T) : ''"
      :consecuencias="consecuencias"
      :cargando="guardando"
      @confirmar="confirmarEstado"
    />

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

<style scoped>
/* En solo lectura no tiene sentido marcar campos obligatorios. */
fieldset:disabled :deep(label > span.text-vino) {
  display: none;
}
</style>
