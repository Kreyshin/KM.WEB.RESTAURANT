<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import {
  PERMISO_AJUSTAR_CANTIDADES,
  alternosDe,
  consolidar,
  etiquetaEstadoRequerimiento,
  flujoRequerimiento,
  requerimientosService,
  simuladorErp,
  solicitudesService,
  unidadesDeCompra,
} from '@/services/compras.service'
import { modoIntegracion } from '@/services/integracion.service'
import { tienePermiso } from '@/services/parametros.service'
import { areasService } from '@/services/produccion.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  Area,
  EstadoRequerimiento,
  LineaRequerimiento,
  RequerimientoCompra,
  SolicitudCompra,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana, TonoMesa } from '@/types/ui'
import { etiquetaUnidad, formatearCantidad, formatearFecha } from '@/utils/formato'

/**
 * Requerimientos de compra (F4.4): el local consolida las solicitudes de sus
 * áreas, las traduce a artículos del ERP con su proveedor sugerido y las
 * envía. Aprobar, convertir en OC y despachar lo hace el ERP; aquí se sigue.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()
const catalogos = useCatalogos(['insumos', 'articulos', 'proveedores'])
const { insumos, insumo, articulo, proveedores, nombreProveedor } = catalogos

const requerimientos = shallowRef<RequerimientoCompra[]>([])
const solicitudes = shallowRef<SolicitudCompra[]>([])
const areas = shallowRef<Area[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  error.value = ''
  try {
    const [reqs, sols, todas] = await Promise.all([
      requerimientosService.listar(localStore.localId),
      solicitudesService.listar(localStore.localId),
      areasService.todos(),
      catalogos.recargar(),
    ])
    requerimientos.value = reqs
    solicitudes.value = sols
    areas.value = todas
  } catch (e) {
    error.value = (e as ApiError).mensaje ?? 'No se pudieron cargar los requerimientos.'
  } finally {
    cargando.value = false
  }
}

watch(() => localStore.localId, cargar, { immediate: true })

const puedeAjustar = computed(() => tienePermiso(auth.usuario?.id, PERMISO_AJUSTAR_CANTIDADES))

const nombreArea = (id: string) => areas.value.find((a) => a.id === id)?.nombre ?? '—'
const solicitud = (id: string) => solicitudes.value.find((s) => s.id === id)
const pendientes = computed(() =>
  solicitudes.value.filter((s) => s.estado === 'enviada' && !s.requerimientoId),
)

// ── Listado ──

const tonoEstado: Record<EstadoRequerimiento, TonoMesa> = {
  borrador: 'neutro',
  enviado: 'laton',
  aprobado: 'pizarra',
  convertido: 'pizarra',
  despachado: 'verde',
  recepcionado: 'verde',
  anulado: 'vino',
}

type Grupo = 'preparacion' | 'erp' | 'cerrados' | 'todos'
const pestana = ref<Grupo>('erp')
const busqueda = ref('')

const grupoDe: Record<EstadoRequerimiento, Grupo> = {
  borrador: 'preparacion',
  enviado: 'erp',
  aprobado: 'erp',
  convertido: 'erp',
  despachado: 'erp',
  recepcionado: 'cerrados',
  anulado: 'cerrados',
}

const pestanas = computed<Pestana[]>(() => {
  const contar = (g: Grupo) => requerimientos.value.filter((r) => grupoDe[r.estado] === g).length
  return [
    { valor: 'preparacion', etiqueta: 'En preparación', contador: contar('preparacion') },
    { valor: 'erp', etiqueta: 'En curso con el ERP', contador: contar('erp') },
    { valor: 'cerrados', etiqueta: 'Cerrados', contador: contar('cerrados') },
    { valor: 'todos', etiqueta: 'Todos', contador: requerimientos.value.length },
  ]
})

const filas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return requerimientos.value.filter(
    (r) =>
      (pestana.value === 'todos' || grupoDe[r.estado] === pestana.value) &&
      (!q ||
        r.numero.toLowerCase().includes(q) ||
        (r.ordenCompra?.toLowerCase().includes(q) ?? false) ||
        r.lineas.some((l) => articulo(l.articuloId)?.nombre.toLowerCase().includes(q))),
  )
})

const columnas: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Requerimiento', clase: 'w-44' },
  { clave: 'articulos', etiqueta: 'Artículos' },
  { clave: 'proveedores', etiqueta: 'Proveedores', clase: 'w-64' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-60' },
  { clave: 'acciones', etiqueta: '', clase: 'w-20 text-right' },
]

function resumenArticulos(r: RequerimientoCompra) {
  const nombres = r.lineas.map((l) => articulo(l.articuloId)?.nombre ?? '—')
  return nombres.length > 3
    ? `${nombres.slice(0, 3).join(', ')} y ${nombres.length - 3} más`
    : nombres.join(', ')
}

const proveedoresDe = (r: RequerimientoCompra) =>
  [...new Set(r.lineas.map((l) => l.proveedorId).filter(Boolean))]
    .map((id) => nombreProveedor(id))
    .join(', ') || '—'

const noDisponibles = (r: RequerimientoCompra) => r.lineas.filter((l) => l.noDisponible).length

// ── Editor (nuevo o borrador) ──

const editorAbierto = ref(false)
const editando = shallowRef<RequerimientoCompra | null>(null)
const seleccion = ref<string[]>([])
const lineas = ref<LineaRequerimiento[]>([])
const nota = ref('')
const guardando = ref(false)

/** Solicitudes que se pueden marcar: las pendientes y las que ya reserva este borrador. */
const solicitudesElegibles = computed(() =>
  solicitudes.value.filter(
    (s) =>
      s.estado === 'enviada' && (!s.requerimientoId || s.requerimientoId === editando.value?.id),
  ),
)

function abrirNuevo() {
  editando.value = null
  seleccion.value = pendientes.value.map((s) => s.id)
  lineas.value = consolidar(seleccion.value)
  nota.value = ''
  editorAbierto.value = true
}

function abrirBorrador(r: RequerimientoCompra) {
  editando.value = r
  seleccion.value = [...new Set(r.lineas.flatMap((l) => l.origen.map((o) => o.solicitudId)))]
  lineas.value = r.lineas.map((l) => ({ ...l, origen: [...l.origen] }))
  nota.value = r.nota ?? ''
  editorAbierto.value = true
}

/** Rehace las líneas consolidadas; las líneas directas se conservan. */
function alternarSolicitud(id: string, marcada: boolean) {
  seleccion.value = marcada ? [...seleccion.value, id] : seleccion.value.filter((x) => x !== id)
  const directas = lineas.value.filter((l) => l.origen.length === 0)
  const anteriores = lineas.value.filter((l) => l.origen.length > 0)
  const nuevas = consolidar(seleccion.value).map((n) => {
    // Si ya existía la línea, se respeta el proveedor elegido.
    const previa = anteriores.find(
      (p) => p.insumoId === n.insumoId && p.articuloId === n.articuloId,
    )
    return previa ? { ...n, id: previa.id, proveedorId: previa.proveedorId } : n
  })
  lineas.value = [...nuevas, ...directas]
}

function vinculo(l: LineaRequerimiento) {
  return alternosDe(l.insumoId).find((v) => v.articuloId === l.articuloId)
}

function opcionesArticulo(l: LineaRequerimiento): OpcionSelect[] {
  return alternosDe(l.insumoId).map((v) => ({
    valor: v.articuloId,
    etiqueta: `${v.articulo.nombre} · ${v.articulo.unidadCompra}${v.porDefecto ? ' (por defecto)' : ''}`,
  }))
}

const opcionesProveedor = computed<OpcionSelect[]>(() =>
  proveedores.value.filter((p) => p.activo).map((p) => ({ valor: p.id, etiqueta: p.razonSocial })),
)

function cambiarArticulo(l: LineaRequerimiento, articuloId: string) {
  l.articuloId = articuloId
  const v = vinculo(l)
  if (!v) return
  l.cantidad = unidadesDeCompra(l.cantidadInsumo, v.factor)
  l.proveedorId = v.articulo.proveedorId ?? l.proveedorId
}

/** Lo que cubren las unidades de compra, en unidad de uso. */
function cubre(l: LineaRequerimiento) {
  const i = insumo(l.insumoId)
  const v = vinculo(l)
  return i && v ? formatearCantidad(l.cantidad * v.factor, i.unidad) : '—'
}

function cantidadEditable(l: LineaRequerimiento) {
  return l.origen.length === 0 || puedeAjustar.value
}

function ajustada(l: LineaRequerimiento) {
  const v = vinculo(l)
  return l.origen.length > 0 && v && l.cantidad !== unidadesDeCompra(l.cantidadInsumo, v.factor)
}

function areasDeLinea(l: LineaRequerimiento) {
  return [...new Set(l.origen.map((o) => solicitud(o.solicitudId)?.areaId).filter(Boolean))]
    .map((id) => nombreArea(id!))
    .join(', ')
}

// Línea directa: insumo y cantidad de uso, el resto se deduce.
const directaInsumo = ref('')
const directaCantidad = ref<number | null>(null)

const opcionesInsumo = computed<OpcionSelect[]>(() =>
  insumos.value
    .filter((i) => i.activo && alternosDe(i.id).length > 0)
    .map((i) => ({ valor: i.id, etiqueta: `${i.nombre} (${etiquetaUnidad[i.unidad]})` })),
)

function agregarDirecta() {
  const v = alternosDe(directaInsumo.value)[0]
  if (!v || !directaCantidad.value) return
  lineas.value.push({
    id: `nueva-${Date.now()}`,
    insumoId: directaInsumo.value,
    articuloId: v.articuloId,
    cantidadInsumo: directaCantidad.value,
    cantidad: unidadesDeCompra(directaCantidad.value, v.factor),
    proveedorId: v.articulo.proveedorId,
    origen: [],
  })
  directaInsumo.value = ''
  directaCantidad.value = null
}

async function guardar(enviar: boolean) {
  guardando.value = true
  const datos = {
    localId: localStore.localId!,
    nota: nota.value.trim() || undefined,
    lineas: lineas.value,
  }
  try {
    let r = editando.value
      ? await requerimientosService.actualizar(editando.value.id, datos, auth.usuario!.id)
      : await requerimientosService.crear(datos, auth.usuario!.id)
    if (enviar) r = await requerimientosService.enviar(r.id, auth.usuario!.id)
    ui.exito(enviar ? `${r.numero} enviado al ERP.` : `${r.numero} guardado en borrador.`)
    editorAbierto.value = false
    pestana.value = enviar ? 'erp' : 'preparacion'
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar el requerimiento.')
  } finally {
    guardando.value = false
  }
}

// ── Detalle y seguimiento ──

const detalleAbierto = ref(false)
const detalle = shallowRef<RequerimientoCompra | null>(null)

function abrir(r: RequerimientoCompra) {
  if (r.estado === 'borrador') return abrirBorrador(r)
  detalle.value = r
  reemplazos.value = {}
  lineaNoDisponible.value = ''
  detalleAbierto.value = true
}

async function refrescarDetalle(r: RequerimientoCompra) {
  detalle.value = r
  await cargar()
}

function fechaDe(estado: EstadoRequerimiento) {
  const evento = [...(detalle.value?.historial ?? [])].reverse().find((h) => h.estado === estado)
  return evento ? formatearFecha(evento.fecha) : ''
}

function alcanzado(estado: EstadoRequerimiento) {
  if (!detalle.value) return false
  return flujoRequerimiento.indexOf(estado) <= flujoRequerimiento.indexOf(detalle.value.estado)
}

function conversion(l: LineaRequerimiento) {
  if (l.cantidadConvertida === undefined) return null
  return l.cantidadConvertida >= l.cantidad ? 'total' : 'parcial'
}

const reemplazos = ref<Record<string, string>>({})

function opcionesAlterno(l: LineaRequerimiento): OpcionSelect[] {
  return alternosDe(l.insumoId)
    .filter((v) => v.articuloId !== l.articuloId)
    .map((v) => ({
      valor: v.articuloId,
      etiqueta: `${v.articulo.nombre} · ${v.articulo.unidadCompra}`,
    }))
}

async function reemplazar(l: LineaRequerimiento) {
  if (!detalle.value || !reemplazos.value[l.id]) return
  try {
    const r = await requerimientosService.reemplazar(
      detalle.value.id,
      l.id,
      reemplazos.value[l.id]!,
      auth.usuario!.id,
    )
    ui.exito('Artículo reemplazado.')
    await refrescarDetalle(r)
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo reemplazar.')
  }
}

// Anular
const modalAnular = ref(false)
const motivoAnular = ref('')
const porAnular = shallowRef<RequerimientoCompra | null>(null)

function pedirAnular(r: RequerimientoCompra) {
  porAnular.value = r
  motivoAnular.value = ''
  modalAnular.value = true
}

async function anular() {
  if (!porAnular.value) return
  try {
    const r = await requerimientosService.anular(
      porAnular.value.id,
      auth.usuario!.id,
      motivoAnular.value,
    )
    ui.exito(`${r.numero} anulado. Sus solicitudes vuelven a estar pendientes.`)
    modalAnular.value = false
    editorAbierto.value = false
    if (detalleAbierto.value) detalle.value = r
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo anular.')
  }
}

// Simulador del ERP (solo datos de ejemplo)
const lineaNoDisponible = ref('')

async function simular(accion: 'aprobar' | 'convertir' | 'despachar' | 'noDisponible') {
  if (!detalle.value) return
  try {
    const id = detalle.value.id
    const r =
      accion === 'noDisponible'
        ? await simuladorErp.marcarNoDisponible(id, lineaNoDisponible.value)
        : await simuladorErp[accion](id)
    lineaNoDisponible.value = ''
    await refrescarDetalle(r)
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'El ERP no aceptó la acción.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <p
      v-if="modoIntegracion('compras', localStore.localId ?? undefined) === 'autonomo'"
      class="rs-tono rs-tono-laton rounded-card border px-4 py-3 text-sm"
    >
      Compras trabaja en modo autónomo en este local: los requerimientos quedan registrados en la
      vertical y no se envían al ERP.
    </p>
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <h2 class="rs-titulo-seccion text-tinta">
            Requerimientos de {{ localStore.local?.nombre }}
          </h2>
          <p class="mt-1 text-sm text-tenue">
            El local junta lo que pidieron sus áreas, lo traduce a artículos del ERP y lo envía. La
            aprobación, la orden de compra y el despacho llegan del ERP.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="pendientes.length" class="text-sm text-laton-texto">
            {{ pendientes.length }}
            {{ pendientes.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes' }}
          </span>
          <KmButton @click="abrirNuevo">Nuevo requerimiento</KmButton>
        </div>
      </div>

      <div class="px-6 pt-4">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Etapa de los requerimientos">
          <KmBusqueda v-model="busqueda" placeholder="Buscar n.°, OC o artículo" />
        </KmTabs>
      </div>

      <div class="mt-4 border-t border-linea">
        <KmTable
          :columnas="columnas"
          :filas="filas"
          :cargando="cargando"
          :error="error || null"
          mensaje-vacio="No hay requerimientos en esta etapa."
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
          <template #col-articulos="{ fila }">
            <p class="text-sm text-tinta">{{ resumenArticulos(fila) }}</p>
            <p v-if="noDisponibles(fila)" class="text-xs font-semibold text-vino">
              {{ noDisponibles(fila) }} no disponible{{ noDisponibles(fila) > 1 ? 's' : '' }}:
              reemplazar
            </p>
            <p v-else class="text-xs text-tenue">{{ fila.lineas.length }} líneas</p>
          </template>
          <template #col-proveedores="{ fila }">
            <span class="text-sm">{{ proveedoresDe(fila) }}</span>
          </template>
          <template #col-estado="{ fila }">
            <KmBadge :tono="tonoEstado[fila.estado]" punto>
              {{ etiquetaEstadoRequerimiento[fila.estado] }}
            </KmBadge>
            <p v-if="fila.ordenCompra" class="mt-1 text-xs text-tenue tabular-nums">
              {{ fila.ordenCompra }}
            </p>
          </template>
          <template #col-acciones="{ fila }">
            <div class="flex justify-end">
              <KmBotonIcono
                :icono="fila.estado === 'borrador' ? 'editar' : 'ver'"
                :etiqueta="fila.estado === 'borrador' ? 'Editar' : 'Seguimiento'"
                :contexto="fila.numero"
                @click="abrir(fila)"
              />
            </div>
          </template>
        </KmTable>
      </div>
    </KmCard>

    <!-- Editor: consolidar solicitudes y ajustar líneas -->
    <KmDrawer
      v-model="editorAbierto"
      :titulo="editando ? `${editando.numero} · borrador` : 'Nuevo requerimiento'"
      subtitulo="Marca las solicitudes a consolidar y revisa cómo se compra cada insumo."
      ancho="xl"
    >
      <div class="flex flex-col gap-6">
        <section>
          <p class="rs-etiqueta mb-2 text-laton-texto">1 · Solicitudes a consolidar</p>
          <p v-if="!solicitudesElegibles.length" class="text-sm text-tenue">
            No hay solicitudes enviadas pendientes. Puedes crear el requerimiento con líneas
            directas.
          </p>
          <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <label
              v-for="s in solicitudesElegibles"
              :key="s.id"
              class="flex cursor-pointer gap-3 rounded-card border px-3 py-2.5 transition-colors"
              :class="seleccion.includes(s.id) ? 'border-verde bg-seleccion' : 'border-linea'"
            >
              <KmCheckbox
                :model-value="seleccion.includes(s.id)"
                @update:model-value="alternarSolicitud(s.id, $event)"
              />
              <span class="min-w-0 flex-1">
                <span class="flex justify-between gap-2 text-sm">
                  <strong class="text-tinta tabular-nums">{{ s.numero }}</strong>
                  <span class="text-xs text-tenue">{{ formatearFecha(s.fecha) }}</span>
                </span>
                <span class="block text-xs text-tenue">{{ nombreArea(s.areaId) }}</span>
                <span class="mt-1 block truncate text-xs text-tinta">
                  {{
                    s.lineas
                      .map((l) =>
                        insumo(l.insumoId)
                          ? `${insumo(l.insumoId)!.nombre} ${formatearCantidad(l.cantidad, insumo(l.insumoId)!.unidad)}`
                          : '',
                      )
                      .join(' · ')
                  }}
                </span>
              </span>
            </label>
          </div>
        </section>

        <section>
          <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
            <p class="rs-etiqueta text-laton-texto">2 · Líneas del requerimiento</p>
            <p v-if="!puedeAjustar" class="text-xs text-tenue">
              Sin permiso para ajustar cantidades pedidas por las áreas.
            </p>
          </div>
          <div class="overflow-x-auto rounded-card border border-linea">
            <table class="w-full min-w-[960px] text-sm">
              <thead>
                <tr class="border-b border-linea text-left text-xs text-tenue">
                  <th class="px-3 py-2.5 font-medium">Insumo</th>
                  <th class="px-3 py-2.5 font-medium">Pedido</th>
                  <th class="w-72 px-3 py-2.5 font-medium">Artículo del ERP</th>
                  <th class="w-40 px-3 py-2.5 font-medium">Cantidad a comprar</th>
                  <th class="w-64 px-3 py-2.5 font-medium">Proveedor</th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(l, i) in lineas"
                  :key="l.id"
                  class="border-b border-linea last:border-0"
                >
                  <td class="px-3 py-2.5 align-top">
                    <p class="font-medium text-tinta">{{ insumo(l.insumoId)?.nombre }}</p>
                    <p class="text-xs text-tenue">
                      {{ l.origen.length ? areasDeLinea(l) : 'Línea directa' }}
                    </p>
                  </td>
                  <td class="px-3 py-2.5 align-top tabular-nums">
                    {{
                      insumo(l.insumoId)
                        ? formatearCantidad(l.cantidadInsumo, insumo(l.insumoId)!.unidad)
                        : '—'
                    }}
                  </td>
                  <td class="px-3 py-2.5 align-top">
                    <KmSelect
                      :model-value="l.articuloId"
                      :opciones="opcionesArticulo(l)"
                      etiqueta="Artículo"
                      @update:model-value="cambiarArticulo(l, $event as string)"
                    />
                  </td>
                  <td class="px-3 py-2.5 align-top">
                    <KmNumero
                      v-model="l.cantidad"
                      :min="1"
                      :disabled="!cantidadEditable(l)"
                      :sufijo="articulo(l.articuloId)?.unidadCompra"
                      :aria-label="`Cantidad de ${articulo(l.articuloId)?.nombre}`"
                    />
                    <p
                      class="mt-1 text-xs"
                      :class="ajustada(l) ? 'text-laton-texto' : 'text-tenue'"
                    >
                      Cubre {{ cubre(l) }}{{ ajustada(l) ? ' · ajustada' : '' }}
                    </p>
                  </td>
                  <td class="px-3 py-2.5 align-top">
                    <KmSelect
                      :model-value="l.proveedorId ?? ''"
                      :opciones="opcionesProveedor"
                      placeholder="Elegir proveedor"
                      etiqueta="Proveedor"
                      :invalido="!l.proveedorId"
                      @update:model-value="l.proveedorId = ($event as string) || undefined"
                    />
                    <p
                      v-if="l.proveedorId && l.proveedorId === articulo(l.articuloId)?.proveedorId"
                      class="mt-1 text-xs text-tenue"
                    >
                      Proveedor habitual
                    </p>
                  </td>
                  <td class="px-2 py-2.5 align-top">
                    <KmBotonIcono
                      v-if="l.origen.length === 0"
                      icono="eliminar"
                      tono="peligro"
                      etiqueta="Quitar"
                      :contexto="insumo(l.insumoId)?.nombre"
                      @click="lineas.splice(i, 1)"
                    />
                  </td>
                </tr>
                <tr v-if="!lineas.length">
                  <td colspan="6" class="px-3 py-6 text-center text-sm text-tenue">
                    Marca solicitudes o añade una línea directa.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-3 flex flex-wrap items-end gap-2">
            <div class="w-full sm:w-72">
              <KmField v-slot="{ id }" label="Añadir insumo directo">
                <KmSelect
                  :id="id"
                  v-model="directaInsumo"
                  placeholder="Elegir insumo"
                  :opciones="opcionesInsumo"
                />
              </KmField>
            </div>
            <div class="w-40">
              <KmNumero
                v-model="directaCantidad"
                :min="0"
                :decimales="3"
                :controles="false"
                :sufijo="insumo(directaInsumo) ? etiquetaUnidad[insumo(directaInsumo)!.unidad] : ''"
                aria-label="Cantidad del insumo directo"
              />
            </div>
            <KmButton
              variante="secundario"
              :disabled="!directaInsumo || !directaCantidad"
              @click="agregarDirecta"
            >
              Añadir
            </KmButton>
          </div>
        </section>

        <KmField v-slot="{ id }" label="Nota para compras">
          <KmInput :id="id" v-model="nota" placeholder="Opcional" />
        </KmField>
      </div>

      <template #footer>
        <KmButton
          v-if="editando"
          variante="fantasma"
          class="mr-auto text-vino"
          @click="pedirAnular(editando)"
        >
          Anular
        </KmButton>
        <KmButton
          variante="secundario"
          :disabled="guardando || !lineas.length"
          @click="guardar(false)"
        >
          Guardar borrador
        </KmButton>
        <KmButton :cargando="guardando" :disabled="!lineas.length" @click="guardar(true)">
          Enviar al ERP
        </KmButton>
      </template>
    </KmDrawer>

    <!-- Seguimiento -->
    <KmDrawer
      v-model="detalleAbierto"
      :titulo="detalle?.numero ?? 'Requerimiento'"
      :subtitulo="
        detalle
          ? `${etiquetaEstadoRequerimiento[detalle.estado]}${detalle.ordenCompra ? ` · ${detalle.ordenCompra}` : ''}`
          : ''
      "
      ancho="xl"
    >
      <div v-if="detalle" class="flex flex-col gap-6">
        <!-- Avance -->
        <ol
          v-if="detalle.estado !== 'anulado'"
          class="grid grid-cols-3 gap-2 md:grid-cols-6"
          aria-label="Avance del requerimiento"
        >
          <li
            v-for="e in flujoRequerimiento"
            :key="e"
            class="rounded-card border px-3 py-2"
            :class="
              e === detalle.estado
                ? 'border-verde bg-seleccion'
                : alcanzado(e)
                  ? 'border-linea'
                  : 'border-dashed border-linea opacity-60'
            "
            :aria-current="e === detalle.estado ? 'step' : undefined"
          >
            <p class="text-xs font-semibold text-tinta">{{ etiquetaEstadoRequerimiento[e] }}</p>
            <p class="text-[11px] text-tenue">
              {{ alcanzado(e) ? fechaDe(e) : e === 'recepcionado' ? 'F4.5' : 'Pendiente' }}
            </p>
          </li>
        </ol>
        <p v-else class="rs-tono rs-tono-vino rounded-card border px-4 py-3 text-sm">
          <strong>Anulado:</strong> {{ detalle.historial.at(-1)?.nota }}
        </p>

        <!-- Líneas -->
        <div class="overflow-x-auto rounded-card border border-linea">
          <table class="w-full min-w-[860px] text-sm">
            <thead>
              <tr class="border-b border-linea text-left text-xs text-tenue">
                <th class="px-3 py-2.5 font-medium">Artículo</th>
                <th class="px-3 py-2.5 font-medium">Insumo</th>
                <th class="px-3 py-2.5 font-medium">Proveedor</th>
                <th class="px-3 py-2.5 text-right font-medium">Pedido</th>
                <th class="px-3 py-2.5 font-medium">Orden de compra</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="l in detalle.lineas" :key="l.id">
                <tr class="border-b border-linea" :class="l.noDisponible ? 'bg-vino/5' : ''">
                  <td class="px-3 py-2.5">
                    <p class="font-medium text-tinta">{{ articulo(l.articuloId)?.nombre }}</p>
                    <p v-if="l.reemplazoDe" class="text-xs text-tenue">
                      Reemplaza a {{ articulo(l.reemplazoDe)?.nombre }}
                    </p>
                  </td>
                  <td class="px-3 py-2.5 text-tenue">{{ insumo(l.insumoId)?.nombre }}</td>
                  <td class="px-3 py-2.5">{{ nombreProveedor(l.proveedorId) }}</td>
                  <td class="px-3 py-2.5 text-right tabular-nums">
                    {{ l.cantidad }} {{ articulo(l.articuloId)?.unidadCompra }}
                  </td>
                  <td class="px-3 py-2.5">
                    <KmBadge v-if="l.noDisponible" tono="vino" punto>No disponible</KmBadge>
                    <template v-else-if="conversion(l)">
                      <KmBadge :tono="conversion(l) === 'total' ? 'verde' : 'laton'" punto>
                        {{ conversion(l) === 'total' ? 'Total' : 'Parcial' }}
                      </KmBadge>
                      <span class="ml-2 text-xs text-tenue tabular-nums">
                        {{ l.cantidadConvertida }} de {{ l.cantidad }}
                      </span>
                    </template>
                    <span v-else class="text-xs text-tenue">Sin convertir</span>
                  </td>
                </tr>
                <tr v-if="l.noDisponible" class="border-b border-linea bg-vino/5">
                  <td colspan="5" class="px-3 pb-3">
                    <div class="flex flex-wrap items-end gap-2">
                      <p class="mr-2 text-sm text-vino">
                        El ERP no puede comprar este artículo. Elige un alterno del mismo insumo:
                      </p>
                      <div class="w-72">
                        <KmSelect
                          v-model="reemplazos[l.id]"
                          :opciones="opcionesAlterno(l)"
                          :placeholder="
                            opcionesAlterno(l).length ? 'Elegir alterno' : 'Sin alternos vinculados'
                          "
                          etiqueta="Artículo alterno"
                          :disabled="!opcionesAlterno(l).length"
                        />
                      </div>
                      <KmButton tamano="sm" :disabled="!reemplazos[l.id]" @click="reemplazar(l)">
                        Reemplazar
                      </KmButton>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <!-- Historial -->
          <section>
            <p class="rs-etiqueta mb-2 text-laton-texto">Historial</p>
            <ol class="flex flex-col gap-2">
              <li
                v-for="(h, i) in [...detalle.historial].reverse()"
                :key="i"
                class="flex gap-3 text-sm"
              >
                <span class="w-28 shrink-0 text-xs text-tenue tabular-nums">
                  {{ formatearFecha(h.fecha) }}
                </span>
                <span>
                  <strong class="text-tinta">{{ etiquetaEstadoRequerimiento[h.estado] }}</strong>
                  <span class="text-tenue"> · {{ h.autor }}</span>
                  <span v-if="h.nota" class="block text-xs text-tenue">{{ h.nota }}</span>
                </span>
              </li>
            </ol>
          </section>

          <!-- Simulador del ERP -->
          <section
            v-if="['enviado', 'aprobado', 'convertido'].includes(detalle.estado)"
            class="rounded-card border border-dashed border-laton/60 p-4"
          >
            <p class="rs-etiqueta text-laton-texto">Simular respuesta del ERP</p>
            <p class="mt-1 mb-3 text-xs text-tenue">
              Solo con datos de ejemplo: con integración, estos cambios llegan del ERP.
            </p>
            <div class="flex flex-col gap-2">
              <KmButton
                v-if="detalle.estado === 'enviado'"
                variante="secundario"
                tamano="sm"
                @click="simular('aprobar')"
              >
                Aprobar
              </KmButton>
              <KmButton
                v-if="detalle.estado === 'aprobado'"
                variante="secundario"
                tamano="sm"
                @click="simular('convertir')"
              >
                Convertir en orden de compra
              </KmButton>
              <KmButton
                v-if="detalle.estado === 'convertido'"
                variante="secundario"
                tamano="sm"
                @click="simular('despachar')"
              >
                Marcar despachado
              </KmButton>
              <div
                v-if="detalle.estado === 'enviado' || detalle.estado === 'aprobado'"
                class="flex items-end gap-2"
              >
                <div class="min-w-0 flex-1">
                  <KmSelect
                    v-model="lineaNoDisponible"
                    placeholder="Línea no disponible…"
                    etiqueta="Línea no disponible"
                    :opciones="
                      detalle.lineas
                        .filter((l) => !l.noDisponible)
                        .map((l) => ({
                          valor: l.id,
                          etiqueta: articulo(l.articuloId)?.nombre ?? '',
                        }))
                    "
                  />
                </div>
                <KmButton
                  variante="secundario"
                  tamano="sm"
                  :disabled="!lineaNoDisponible"
                  @click="simular('noDisponible')"
                >
                  Marcar
                </KmButton>
              </div>
            </div>
          </section>
        </div>
      </div>

      <template #footer>
        <KmButton
          v-if="detalle?.estado === 'enviado'"
          variante="peligro"
          class="mr-auto"
          @click="pedirAnular(detalle)"
        >
          Anular
        </KmButton>
        <KmButton variante="secundario" @click="detalleAbierto = false">Cerrar</KmButton>
      </template>
    </KmDrawer>

    <KmModal v-model="modalAnular" :titulo="`Anular ${porAnular?.numero ?? ''}`" ancho="sm">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-tenue">
          Sus solicitudes vuelven a quedar pendientes para otro requerimiento.
        </p>
        <KmField v-slot="{ id }" label="Motivo" requerido>
          <KmInput :id="id" v-model="motivoAnular" placeholder="Por ejemplo: pedido duplicado" />
        </KmField>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="modalAnular = false">Cancelar</KmButton>
        <KmButton variante="peligro" :disabled="!motivoAnular.trim()" @click="anular">
          Anular
        </KmButton>
      </template>
    </KmModal>
  </div>
</template>
