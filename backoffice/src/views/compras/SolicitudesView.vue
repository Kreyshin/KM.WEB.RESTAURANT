<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { etiquetaEstadoSolicitud, solicitudesService } from '@/services/compras.service'
import { marcasService } from '@/services/erp.service'
import { areasService } from '@/services/produccion.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  Area,
  EstadoSolicitud,
  LineaSolicitud,
  Marca,
  RequerimientoCompra,
  SolicitudCompra,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana, TonoMesa } from '@/types/ui'
import { etiquetaUnidad, formatearCantidad, formatearFecha } from '@/utils/formato'
import { requerimientosService } from '@/services/compras.service'

/**
 * Solicitudes de compra (F4.4): lo que pide cada área del local, en insumos.
 * Se arma en borrador, se envía y el local la consolida en un requerimiento
 * (queda «Atendida») o la rechaza con un motivo.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()
const catalogos = useCatalogos(['insumos', 'articulos'])
const { insumos, insumo, articulo } = catalogos

const solicitudes = shallowRef<SolicitudCompra[]>([])
const requerimientos = shallowRef<RequerimientoCompra[]>([])
const areas = shallowRef<Area[]>([])
const marcas = shallowRef<Marca[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  error.value = ''
  try {
    const [lista, reqs, todasAreas, todasMarcas] = await Promise.all([
      solicitudesService.listar(localStore.localId),
      requerimientosService.listar(localStore.localId),
      areasService.todos(),
      marcasService.todos(),
      catalogos.recargar(),
    ])
    solicitudes.value = lista
    requerimientos.value = reqs
    areas.value = todasAreas.filter((a) => a.localId === localStore.localId && a.activo)
    marcas.value = todasMarcas
  } catch (e) {
    error.value = (e as ApiError).mensaje ?? 'No se pudieron cargar las solicitudes.'
  } finally {
    cargando.value = false
  }
}

watch(() => localStore.localId, cargar, { immediate: true })

// ── Listado ──

const tonoEstado: Record<EstadoSolicitud, TonoMesa> = {
  borrador: 'neutro',
  enviada: 'laton',
  atendida: 'verde',
  rechazada: 'vino',
}

const pestana = ref<EstadoSolicitud | 'todas'>('enviada')
const busqueda = ref('')
const areaFiltro = ref('')

const pestanas = computed<Pestana[]>(() => [
  ...(['borrador', 'enviada', 'atendida', 'rechazada'] as EstadoSolicitud[]).map((e) => ({
    valor: e,
    etiqueta: etiquetaEstadoSolicitud[e] + (e === 'borrador' ? 'es' : 's'),
    contador: solicitudes.value.filter((s) => s.estado === e).length,
  })),
  { valor: 'todas', etiqueta: 'Todas', contador: solicitudes.value.length },
])

const nombreArea = (id: string) => areas.value.find((a) => a.id === id)?.nombre ?? '—'
const numeroRequerimiento = (id?: string) => requerimientos.value.find((r) => r.id === id)?.numero

const filas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return solicitudes.value.filter(
    (s) =>
      (pestana.value === 'todas' || s.estado === pestana.value) &&
      (!areaFiltro.value || s.areaId === areaFiltro.value) &&
      (!q ||
        s.numero.toLowerCase().includes(q) ||
        s.lineas.some((l) => insumo(l.insumoId)?.nombre.toLowerCase().includes(q))),
  )
})

const columnas: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Solicitud', clase: 'w-44' },
  { clave: 'area', etiqueta: 'Área', clase: 'w-56' },
  { clave: 'insumos', etiqueta: 'Insumos' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-56' },
  { clave: 'acciones', etiqueta: '', clase: 'w-28 text-right' },
]

const opcionesArea = computed<OpcionSelect[]>(() =>
  areas.value.map((a) => ({ valor: a.id, etiqueta: a.nombre })),
)
const opcionesAreaFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todas las áreas' },
  ...opcionesArea.value,
])

function resumenInsumos(s: SolicitudCompra) {
  const nombres = s.lineas.map((l) => insumo(l.insumoId)?.nombre ?? '—')
  return nombres.length > 3
    ? `${nombres.slice(0, 3).join(', ')} y ${nombres.length - 3} más`
    : nombres.join(', ')
}

// ── Editor ──

const abierto = ref(false)
const editando = shallowRef<SolicitudCompra | null>(null)
const areaId = ref('')
const nota = ref('')
const lineas = ref<LineaSolicitud[]>([])
const guardando = ref(false)

const editable = computed(() => !editando.value || editando.value.estado === 'borrador')

const opcionesInsumo = computed<OpcionSelect[]>(() =>
  insumos.value
    // Sin artículos del ERP no hay nada que comprar.
    .filter((i) => i.activo && i.articulos.length > 0)
    .map((i) => ({ valor: i.id, etiqueta: `${i.nombre} (${etiquetaUnidad[i.unidad]})` })),
)

function opcionesMarca(insumoId: string): OpcionSelect[] {
  const ids = new Set(
    (insumo(insumoId)?.articulos ?? [])
      .map((v) => articulo(v.articuloId))
      .filter((a) => a?.activo)
      .map((a) => a!.marcaId),
  )
  return [
    { valor: '', etiqueta: 'Cualquier marca' },
    ...marcas.value.filter((m) => ids.has(m.id)).map((m) => ({ valor: m.id, etiqueta: m.nombre })),
  ]
}

function nuevaLinea(): LineaSolicitud {
  return { id: '', insumoId: '', cantidad: 0 }
}

function abrirNueva() {
  editando.value = null
  areaId.value = (opcionesArea.value[0]?.valor as string) ?? ''
  nota.value = ''
  lineas.value = [nuevaLinea()]
  abierto.value = true
}

function abrir(s: SolicitudCompra) {
  editando.value = s
  areaId.value = s.areaId
  nota.value = s.nota ?? ''
  lineas.value = s.lineas.map((l) => ({ ...l }))
  abierto.value = true
}

function datos() {
  return {
    localId: localStore.localId!,
    areaId: areaId.value,
    nota: nota.value.trim() || undefined,
    lineas: lineas.value.map((l) => ({ ...l, marcaId: l.marcaId || undefined })),
  }
}

async function guardar(enviar: boolean) {
  guardando.value = true
  try {
    let s = editando.value
      ? await solicitudesService.actualizar(editando.value.id, datos())
      : await solicitudesService.crear(datos(), auth.usuario!.id)
    if (enviar) s = await solicitudesService.enviar(s.id)
    ui.exito(enviar ? `${s.numero} enviada.` : `${s.numero} guardada en borrador.`)
    abierto.value = false
    if (enviar) pestana.value = 'enviada'
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar la solicitud.')
  } finally {
    guardando.value = false
  }
}

// ── Eliminar y rechazar ──

const porEliminar = shallowRef<SolicitudCompra | null>(null)
const confirmarEliminar = ref(false)

function pedirEliminar(s: SolicitudCompra) {
  porEliminar.value = s
  confirmarEliminar.value = true
}

async function eliminar() {
  if (!porEliminar.value) return
  try {
    await solicitudesService.eliminar(porEliminar.value.id)
    ui.exito(`${porEliminar.value.numero} eliminada.`)
    confirmarEliminar.value = false
    abierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  }
}

const rechazando = shallowRef<SolicitudCompra | null>(null)
const modalRechazo = ref(false)
const motivo = ref('')

function pedirRechazo(s: SolicitudCompra) {
  rechazando.value = s
  motivo.value = ''
  modalRechazo.value = true
}

async function rechazar() {
  if (!rechazando.value) return
  try {
    const s = await solicitudesService.rechazar(rechazando.value.id, motivo.value)
    ui.exito(`${s.numero} rechazada.`)
    modalRechazo.value = false
    abierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo rechazar.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <h2 class="rs-titulo-seccion text-tinta">
            Solicitudes de {{ localStore.local?.nombre }}
          </h2>
          <p class="mt-1 text-sm text-tenue">
            Cada área pide los insumos que necesita. El local las consolida en un requerimiento de
            compra.
          </p>
        </div>
        <KmButton :disabled="!opcionesArea.length" @click="abrirNueva">Nueva solicitud</KmButton>
      </div>

      <div class="px-6 pt-4">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Estado de las solicitudes">
          <div class="flex flex-wrap items-end gap-3">
            <KmBusqueda v-model="busqueda" placeholder="Buscar n.° o insumo" />
            <div class="w-full sm:w-64">
              <KmSelect v-model="areaFiltro" :opciones="opcionesAreaFiltro" etiqueta="Área" />
            </div>
          </div>
        </KmTabs>
      </div>

      <div class="mt-4 border-t border-linea">
        <KmTable
          :columnas="columnas"
          :filas="filas"
          :cargando="cargando"
          :error="error || null"
          mensaje-vacio="No hay solicitudes con esos filtros."
        >
          <template #col-numero="{ fila }">
            <button
              type="button"
              class="text-left font-semibold text-tinta tabular-nums hover:text-verde"
              @click="abrir(fila)"
            >
              {{ fila.numero }}
            </button>
            <p class="text-xs text-tenue">{{ formatearFecha(fila.fecha) }}</p>
          </template>
          <template #col-area="{ fila }">{{ nombreArea(fila.areaId) }}</template>
          <template #col-insumos="{ fila }">
            <p class="text-sm text-tinta">{{ resumenInsumos(fila) }}</p>
            <p class="text-xs text-tenue">
              {{ fila.lineas.length }} {{ fila.lineas.length === 1 ? 'línea' : 'líneas' }}
            </p>
          </template>
          <template #col-estado="{ fila }">
            <KmBadge :tono="tonoEstado[fila.estado]" punto>
              {{ etiquetaEstadoSolicitud[fila.estado] }}
            </KmBadge>
            <p v-if="fila.requerimientoId" class="mt-1 text-xs text-tenue">
              {{ fila.estado === 'enviada' ? 'Reservada en' : 'En' }}
              {{ numeroRequerimiento(fila.requerimientoId) }}
            </p>
            <p v-else-if="fila.motivoRechazo" class="mt-1 text-xs text-vino">
              {{ fila.motivoRechazo }}
            </p>
          </template>
          <template #col-acciones="{ fila }">
            <div class="flex justify-end gap-1">
              <KmBotonIcono
                :icono="fila.estado === 'borrador' ? 'editar' : 'ver'"
                :etiqueta="fila.estado === 'borrador' ? 'Editar' : 'Ver'"
                :contexto="fila.numero"
                @click="abrir(fila)"
              />
              <KmBotonIcono
                v-if="fila.estado === 'borrador'"
                icono="eliminar"
                tono="peligro"
                etiqueta="Eliminar"
                :contexto="fila.numero"
                @click="pedirEliminar(fila)"
              />
            </div>
          </template>
        </KmTable>
      </div>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? editando.numero : 'Nueva solicitud'"
      :subtitulo="
        editando
          ? `${etiquetaEstadoSolicitud[editando.estado]} · ${formatearFecha(editando.fecha)}`
          : 'Los insumos que necesita el área, en su unidad de uso.'
      "
      ancho="lg"
    >
      <div class="flex flex-col gap-5">
        <p
          v-if="editando?.motivoRechazo"
          class="rs-tono rs-tono-vino rounded-card border px-4 py-3 text-sm"
        >
          <strong>Rechazada:</strong> {{ editando.motivoRechazo }}
        </p>
        <p
          v-else-if="editando?.requerimientoId"
          class="rs-tono rs-tono-verde rounded-card border px-4 py-3 text-sm"
        >
          Consolidada en <strong>{{ numeroRequerimiento(editando.requerimientoId) }}</strong
          >.
        </p>

        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Área que pide" requerido>
            <KmSelect :id="id" v-model="areaId" :opciones="opcionesArea" :disabled="!editable" />
          </KmField>
          <KmField v-slot="{ id }" label="Nota">
            <KmInput :id="id" v-model="nota" placeholder="Opcional" :disabled="!editable" />
          </KmField>
        </div>

        <div class="flex flex-col gap-2">
          <div
            class="hidden grid-cols-[minmax(0,1fr)_9rem_11rem_2.25rem] gap-2 px-1 text-xs text-tenue sm:grid"
          >
            <span>Insumo</span><span>Cantidad</span><span>Marca preferida</span>
          </div>
          <div
            v-for="(l, i) in lineas"
            :key="l.id || i"
            class="grid grid-cols-1 items-center gap-2 rounded-card border border-linea p-2 sm:grid-cols-[minmax(0,1fr)_9rem_11rem_2.25rem] sm:border-0 sm:p-0"
          >
            <KmSelect
              v-model="l.insumoId"
              placeholder="Elige un insumo"
              :opciones="opcionesInsumo"
              etiqueta="Insumo"
              :disabled="!editable"
              @update:model-value="l.marcaId = undefined"
            />
            <KmNumero
              v-model="l.cantidad"
              :min="0"
              :decimales="3"
              :controles="false"
              :sufijo="insumo(l.insumoId) ? etiquetaUnidad[insumo(l.insumoId)!.unidad] : ''"
              :disabled="!editable"
            />
            <KmSelect
              :model-value="l.marcaId ?? ''"
              :opciones="opcionesMarca(l.insumoId)"
              etiqueta="Marca preferida"
              :disabled="!editable || !l.insumoId"
              @update:model-value="l.marcaId = ($event as string) || undefined"
            />
            <KmBotonIcono
              v-if="editable"
              icono="eliminar"
              tono="peligro"
              etiqueta="Quitar"
              :contexto="insumo(l.insumoId)?.nombre"
              :disabled="lineas.length === 1"
              @click="lineas.splice(i, 1)"
            />
          </div>
          <div v-if="editable">
            <KmButton variante="secundario" tamano="sm" @click="lineas.push(nuevaLinea())">
              Añadir insumo
            </KmButton>
          </div>
          <p v-if="!editable" class="text-xs text-tenue">
            Total pedido:
            {{
              lineas
                .map((l) =>
                  insumo(l.insumoId)
                    ? formatearCantidad(l.cantidad, insumo(l.insumoId)!.unidad)
                    : '',
                )
                .join(' · ')
            }}
          </p>
        </div>
      </div>

      <template #footer>
        <template v-if="editable">
          <KmButton
            v-if="editando"
            variante="fantasma"
            class="mr-auto text-vino"
            @click="pedirEliminar(editando)"
          >
            Eliminar
          </KmButton>
          <KmButton variante="secundario" :disabled="guardando" @click="guardar(false)">
            Guardar borrador
          </KmButton>
          <KmButton :cargando="guardando" @click="guardar(true)">Enviar</KmButton>
        </template>
        <template v-else>
          <KmButton
            v-if="editando?.estado === 'enviada' && !editando.requerimientoId"
            variante="peligro"
            class="mr-auto"
            @click="pedirRechazo(editando)"
          >
            Rechazar
          </KmButton>
          <KmButton variante="secundario" @click="abierto = false">Cerrar</KmButton>
        </template>
      </template>
    </KmDrawer>

    <KmConfirm
      v-model="confirmarEliminar"
      titulo="¿Eliminar borrador?"
      :mensaje="`Se eliminará ${porEliminar?.numero ?? 'la solicitud'}. No se puede deshacer.`"
      texto-confirmar="Eliminar"
      peligroso
      @confirmar="eliminar"
    />

    <KmModal v-model="modalRechazo" :titulo="`Rechazar ${rechazando?.numero ?? ''}`" ancho="sm">
      <KmField v-slot="{ id }" label="Motivo" requerido ayuda="El área lo verá en su solicitud.">
        <KmInput :id="id" v-model="motivo" placeholder="Por ejemplo: hay stock suficiente" />
      </KmField>
      <template #footer>
        <KmButton variante="secundario" @click="modalRechazo = false">Cancelar</KmButton>
        <KmButton variante="peligro" :disabled="!motivo.trim()" @click="rechazar">
          Rechazar
        </KmButton>
      </template>
    </KmModal>
  </div>
</template>
