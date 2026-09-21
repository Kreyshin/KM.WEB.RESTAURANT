<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useAccesoZonas } from '@/composables/useAccesoZonas'
import { useCatalogos } from '@/composables/useCatalogos'
import {
  codigoUbicacion,
  ubicacionesService,
  valoresParametros,
} from '@/services/abastecimiento.service'
import { etiquetaEstadoRequerimiento } from '@/services/compras.service'
import { tienePermiso, valorConfig } from '@/services/parametros.service'
import { recepcionService, type LineaPorRecibir } from '@/services/recepcion.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  ComprobanteIngreso,
  EstadoRecepcion,
  LineaRecepcion,
  Recepcion,
  RequerimientoCompra,
  TipoComprobanteIngreso,
  Ubicacion,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana, TonoMesa } from '@/types/ui'
import { etiquetaUnidad, formatearCantidad, formatearFecha, formatearSoles } from '@/utils/formato'

/**
 * Recepción (F4.5): lo que llega contra una orden de compra del ERP y, si el
 * local lo permite, lo que se compra sin OC. Lote, vencimiento y ubicación se
 * piden solo cuando el insumo los controla en la zona donde entra.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()
const catalogos = useCatalogos(['insumos', 'articulos', 'zonas', 'proveedores'])
const { insumos, insumo, articulo, zonas, nombreZona, nombreProveedor, proveedores } = catalogos
const acceso = useAccesoZonas(zonas)

const porRecibir = shallowRef<{ requerimiento: RequerimientoCompra; lineas: LineaPorRecibir[] }[]>(
  [],
)
const recepciones = shallowRef<Recepcion[]>([])
const ubicaciones = shallowRef<Ubicacion[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  error.value = ''
  try {
    const [pendientes, lista, ubis] = await Promise.all([
      recepcionService.porRecibir(localStore.localId),
      recepcionService.listar(localStore.localId),
      ubicacionesService.todos(),
      catalogos.recargar(),
    ])
    porRecibir.value = pendientes
    recepciones.value = lista
    ubicaciones.value = ubis
  } catch (e) {
    error.value = (e as ApiError).mensaje ?? 'No se pudo cargar la recepción.'
  } finally {
    cargando.value = false
  }
}
watch(() => localStore.localId, cargar, { immediate: true })

const zonasGestion = computed<OpcionSelect[]>(() =>
  acceso.permitidos.value
    .filter((a) => acceso.puedeGestionar(a.id))
    .map((a) => ({ valor: a.id, etiqueta: a.nombre })),
)
const sinOcPermitido = computed(
  () =>
    !!localStore.localId && valorConfig<boolean>('recepcion.sinOc.permitido', localStore.localId),
)
const puedeRegularizar = computed(() =>
  tienePermiso(auth.usuario?.id, 'compras.regularizarIngresos'),
)

// ── Pestañas ──

type Pestanya = 'recibir' | 'regularizar' | 'historial'
const pestana = ref<Pestanya>('recibir')
const pendientesRegularizar = computed(() =>
  recepciones.value.filter((r) => r.estado === 'pendienteRegularizar'),
)
const pestanas = computed<Pestana[]>(() => [
  { valor: 'recibir', etiqueta: 'Por recibir', contador: porRecibir.value.length },
  {
    valor: 'regularizar',
    etiqueta: 'Sin OC por regularizar',
    contador: pendientesRegularizar.value.length,
  },
  { valor: 'historial', etiqueta: 'Recepciones', contador: recepciones.value.length },
])

const tonoEstado: Record<EstadoRecepcion, TonoMesa> = {
  registrada: 'verde',
  pendienteRegularizar: 'laton',
  regularizada: 'pizarra',
}
const etiquetaEstado: Record<EstadoRecepcion, string> = {
  registrada: 'Registrada',
  pendienteRegularizar: 'Pendiente de regularizar',
  regularizada: 'Regularizada',
}

const columnas: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Recepción', clase: 'w-44' },
  { clave: 'origen', etiqueta: 'Origen' },
  { clave: 'zona', etiqueta: 'Zona', clase: 'w-48' },
  { clave: 'total', etiqueta: 'Costo neto', clase: 'w-32 text-right' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-56' },
  { clave: 'acciones', etiqueta: '', clase: 'w-36 text-right' },
]

const filasTabla = computed(() =>
  pestana.value === 'regularizar' ? pendientesRegularizar.value : recepciones.value,
)

const totalRecepcion = (r: Recepcion) =>
  r.lineas.reduce((t, l) => t + l.costoUnitario * l.partes.reduce((s, p) => s + p.cantidad, 0), 0)

async function regularizar(r: Recepcion) {
  try {
    await recepcionService.regularizar(r.id, auth.usuario!.id)
    ui.exito(`${r.numero} regularizada.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo regularizar.')
  }
}

// ── Utilidades de líneas ──

function parametros(insumoId: string, zonaId: string) {
  return valoresParametros({ insumoId, zonaId })
}

function opcionesUbicacion(zonaId: string): OpcionSelect[] {
  return ubicaciones.value
    .filter((u) => u.zonaId === zonaId && u.activo)
    .map((u) => ({
      valor: u.id,
      etiqueta: `${codigoUbicacion(u)}${u.porDefecto ? ' (por defecto)' : ''}`,
    }))
}

/** Precio anterior por unidad del insumo y variación, para ver alzas de un vistazo. */
function variacion(l: LineaRecepcion) {
  const anterior = recepcionService.historialPrecios(l.insumoId)[0]
  if (!anterior || !anterior.costo || !l.costoUnitario) return null
  return ((l.costoUnitario - anterior.costo) / anterior.costo) * 100
}

function totalLinea(l: LineaRecepcion) {
  return Math.round((l.cantidadCompra ?? 0) * l.factor * 1000) / 1000
}

/** En «total» hay una sola parte que siempre suma lo recibido. */
function sincronizarTotal(l: LineaRecepcion) {
  if (l.modo === 'total' || l.partes.length === 1) l.partes[0]!.cantidad = totalLinea(l)
}

function sumaPartes(l: LineaRecepcion) {
  return Math.round(l.partes.reduce((t, p) => t + (p.cantidad || 0), 0) * 1000) / 1000
}

// ── Recibir contra OC ──

const recibirAbierto = ref(false)
const actual = shallowRef<{ requerimiento: RequerimientoCompra; lineas: LineaPorRecibir[] } | null>(
  null,
)
const zonaId = ref('')
const lineas = ref<LineaRecepcion[]>([])
const guardando = ref(false)

function abrirRecibir(item: { requerimiento: RequerimientoCompra; lineas: LineaPorRecibir[] }) {
  actual.value = item
  zonaId.value = (zonasGestion.value[0]?.valor as string) ?? ''
  lineas.value = recepcionService.preparar(item.requerimiento.id, zonaId.value)
  recibirAbierto.value = true
}

watch(zonaId, (id) => {
  if (actual.value && id)
    lineas.value = recepcionService.preparar(actual.value.requerimiento.id, id)
})

const pendienteDe = (lineaId?: string) =>
  actual.value?.lineas.find((l) => l.lineaId === lineaId)?.pendiente ?? 0

async function registrarRecepcion() {
  if (!actual.value) return
  guardando.value = true
  try {
    const r = await recepcionService.recibir(
      {
        localId: localStore.localId!,
        requerimientoId: actual.value.requerimiento.id,
        zonaId: zonaId.value,
        lineas: lineas.value,
      },
      auth.usuario!.id,
    )
    const procesar = r.lineas.filter((l) => l.porProcesar).length
    ui.exito(
      `${r.numero} registrada${procesar ? `: ${procesar} ${procesar === 1 ? 'línea queda' : 'líneas quedan'} por procesar` : ''}.`,
    )
    recibirAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo registrar la recepción.')
  } finally {
    guardando.value = false
  }
}

// ── Ingreso sin OC ──

const sinOcAbierto = ref(false)
const sinOcZona = ref('')
const motivo = ref('')
const comprobante = ref<ComprobanteIngreso>({ tipo: 'boleta', serie: '', numero: '', monto: 0 })
const proveedorModo = ref<'erp' | 'ocasional'>('ocasional')
const lineasSinOc = ref<LineaRecepcion[]>([])

const opcionesComprobante: { valor: TipoComprobanteIngreso; etiqueta: string }[] = [
  { valor: 'boleta', etiqueta: 'Boleta' },
  { valor: 'factura', etiqueta: 'Factura' },
  { valor: 'ticket', etiqueta: 'Ticket' },
  { valor: 'recibo', etiqueta: 'Recibo por honorarios' },
]
const tope = computed(() =>
  localStore.localId ? valorConfig<number>('recepcion.sinOc.tope', localStore.localId) : 0,
)
const exigeComprobante = computed(
  () =>
    !!localStore.localId && valorConfig<boolean>('recepcion.sinOc.comprobante', localStore.localId),
)

function lineaVacia(): LineaRecepcion {
  return {
    id: `n${Date.now()}${Math.random()}`,
    insumoId: '',
    factor: 1,
    costoUnitario: 0,
    modo: 'total',
    partes: [{ cantidad: 0 }],
    porProcesar: false,
  }
}

function abrirSinOc() {
  sinOcZona.value = (zonasGestion.value[0]?.valor as string) ?? ''
  motivo.value = ''
  comprobante.value = { tipo: 'boleta', serie: '', numero: '', monto: 0 }
  proveedorModo.value = 'ocasional'
  lineasSinOc.value = [lineaVacia()]
  sinOcAbierto.value = true
}

const opcionesInsumo = computed<OpcionSelect[]>(() =>
  insumos.value
    .filter((i) => i.activo && i.abastecimiento !== 'transformacion')
    .map((i) => ({ valor: i.id, etiqueta: `${i.nombre} (${etiquetaUnidad[i.unidad]})` })),
)
const opcionesProveedor = computed<OpcionSelect[]>(() =>
  proveedores.value.filter((p) => p.activo).map((p) => ({ valor: p.id, etiqueta: p.razonSocial })),
)

function alElegirInsumo(l: LineaRecepcion) {
  const i = insumo(l.insumoId)
  l.costoUnitario = i?.costoUnitario ?? 0
  l.porProcesar = !!i?.articulos.find((v) => v.porDefecto)?.procesar
  l.partes[0]!.ubicacionId = ubicaciones.value.find(
    (u) => u.zonaId === sinOcZona.value && u.porDefecto,
  )?.id
}

const totalSinOc = computed(() =>
  lineasSinOc.value.reduce((t, l) => t + l.costoUnitario * (l.partes[0]?.cantidad ?? 0), 0),
)

async function registrarSinOc() {
  guardando.value = true
  try {
    const c = { ...comprobante.value }
    if (proveedorModo.value === 'erp') delete c.proveedorOcasional
    else delete c.proveedorId
    const r = await recepcionService.ingresoSinOc(
      {
        localId: localStore.localId!,
        zonaId: sinOcZona.value,
        motivo: motivo.value,
        comprobante: exigeComprobante.value || c.serie ? c : undefined,
        lineas: lineasSinOc.value,
      },
      auth.usuario!.id,
    )
    ui.exito(`${r.numero} registrada: el stock ya entró y queda pendiente de regularizar.`)
    sinOcAbierto.value = false
    pestana.value = 'regularizar'
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo registrar el ingreso.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <h2 class="rs-titulo-seccion text-tinta">Recepción en {{ localStore.local?.nombre }}</h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            Lo que llega contra las órdenes de compra del ERP entra al stock convertido a la unidad
            del insumo. Lote, vencimiento y ubicación se piden solo donde el insumo los controla.
          </p>
        </div>
        <KmButton
          v-if="sinOcPermitido"
          variante="secundario"
          :disabled="!zonasGestion.length"
          @click="abrirSinOc"
        >
          Ingreso sin OC
        </KmButton>
      </div>

      <div class="px-6 pt-4">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Recepción">
          <span />
        </KmTabs>
      </div>

      <!-- Por recibir -->
      <div v-if="pestana === 'recibir'" class="border-t border-linea p-6">
        <KmEstado v-if="cargando" tipo="cargando" compacto />
        <KmEstado
          v-else-if="!porRecibir.length"
          tipo="vacio"
          titulo="Nada por recibir"
          mensaje="Aquí aparecen los requerimientos que el ERP ya convirtió en orden de compra."
        />
        <ul v-else class="grid gap-3 xl:grid-cols-2">
          <li
            v-for="item in porRecibir"
            :key="item.requerimiento.id"
            class="flex flex-col gap-3 rounded-card border border-linea bg-panel p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-tinta tabular-nums">
                  {{ item.requerimiento.ordenCompra }}
                  <span class="font-normal text-tenue">· {{ item.requerimiento.numero }}</span>
                </p>
                <p class="text-xs text-tenue">
                  {{
                    [
                      ...new Set(
                        item.requerimiento.lineas.map((l) => nombreProveedor(l.proveedorId)),
                      ),
                    ].join(', ')
                  }}
                </p>
              </div>
              <KmBadge
                :tono="item.requerimiento.estado === 'despachado' ? 'verde' : 'pizarra'"
                punto
              >
                {{ etiquetaEstadoRequerimiento[item.requerimiento.estado] }}
              </KmBadge>
            </div>
            <ul class="flex flex-col gap-1 text-sm">
              <li v-for="l in item.lineas" :key="l.lineaId" class="flex justify-between gap-3">
                <span class="truncate text-tinta">
                  {{ articulo(l.articuloId)?.nombre }}
                  <KmBadge v-if="l.procesar" tono="laton">Por procesar</KmBadge>
                </span>
                <span class="shrink-0 text-tenue tabular-nums">
                  {{ l.pendiente }} {{ articulo(l.articuloId)?.unidadCompra }}
                </span>
              </li>
            </ul>
            <div class="flex justify-end">
              <KmButton tamano="sm" :disabled="!zonasGestion.length" @click="abrirRecibir(item)">
                Recibir
              </KmButton>
            </div>
          </li>
        </ul>
        <p v-if="!zonasGestion.length && !cargando" class="mt-3 text-sm text-vino">
          No tienes zonas de este local donde registrar movimientos (acceso del ERP).
        </p>
      </div>

      <!-- Historial y por regularizar -->
      <div v-else class="mt-4 border-t border-linea">
        <KmTable
          :columnas="columnas"
          :filas="filasTabla"
          :cargando="cargando"
          :error="error || null"
          :mensaje-vacio="
            pestana === 'regularizar'
              ? 'No hay ingresos sin OC pendientes.'
              : 'Todavía no hay recepciones.'
          "
        >
          <template #col-numero="{ fila }">
            <p class="font-semibold text-tinta tabular-nums">{{ fila.numero }}</p>
            <p class="text-xs text-tenue">{{ formatearFecha(fila.fecha) }}</p>
          </template>
          <template #col-origen="{ fila }">
            <template v-if="fila.ordenCompra">
              <p class="text-sm text-tinta tabular-nums">{{ fila.ordenCompra }}</p>
            </template>
            <template v-else>
              <p class="text-sm text-tinta">
                Sin OC
                <span v-if="fila.comprobante" class="text-tenue tabular-nums">
                  · {{ fila.comprobante.serie }}-{{ fila.comprobante.numero }} ·
                  {{ formatearSoles(fila.comprobante.monto) }}
                </span>
              </p>
              <p class="text-xs text-tenue">{{ fila.motivo }}</p>
            </template>
            <p class="text-xs text-tenue">
              {{ fila.lineas.map((l) => insumo(l.insumoId)?.nombre).join(', ') }}
            </p>
          </template>
          <template #col-zona="{ fila }">{{ nombreZona(fila.zonaId) }}</template>
          <template #col-total="{ fila }">
            <span class="tabular-nums">{{ formatearSoles(totalRecepcion(fila)) }}</span>
          </template>
          <template #col-estado="{ fila }">
            <KmBadge :tono="tonoEstado[fila.estado]" punto>
              {{ etiquetaEstado[fila.estado] }}
            </KmBadge>
            <p v-if="fila.regularizadaPor" class="mt-1 text-xs text-tenue">
              por {{ fila.regularizadaPor }}
            </p>
          </template>
          <template #col-acciones="{ fila }">
            <KmButton
              v-if="fila.estado === 'pendienteRegularizar' && puedeRegularizar"
              tamano="sm"
              variante="secundario"
              @click="regularizar(fila)"
            >
              Regularizar
            </KmButton>
          </template>
        </KmTable>
      </div>
    </KmCard>

    <!-- Recibir contra OC -->
    <KmDrawer
      v-model="recibirAbierto"
      :titulo="actual ? `Recibir ${actual.requerimiento.ordenCompra}` : 'Recibir'"
      subtitulo="Ajusta lo que llegó realmente. Se puede recibir parcial y completar después."
      ancho="xl"
    >
      <div v-if="actual" class="flex flex-col gap-5">
        <div class="w-full sm:w-72">
          <KmField v-slot="{ id }" label="Zona donde entra" requerido>
            <KmSelect :id="id" v-model="zonaId" :opciones="zonasGestion" />
          </KmField>
        </div>

        <article
          v-for="l in lineas"
          :key="l.id"
          class="flex flex-col gap-3 rounded-card border border-linea p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-tinta">{{ articulo(l.articuloId)?.nombre }}</p>
              <p class="text-xs text-tenue">
                Entra como {{ insumo(l.insumoId)?.nombre }} · 1
                {{ articulo(l.articuloId)?.unidadCompra }} = {{ l.factor }}
                {{ insumo(l.insumoId) ? etiquetaUnidad[insumo(l.insumoId)!.unidad] : '' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <KmBadge v-if="parametros(l.insumoId, zonaId).controlaLote" tono="laton"
                >Lote</KmBadge
              >
              <KmBadge
                v-if="
                  parametros(l.insumoId, zonaId).controlaLote &&
                  parametros(l.insumoId, zonaId).controlaVencimiento
                "
                tono="laton"
              >
                Vencimiento
              </KmBadge>
              <KmBadge v-if="parametros(l.insumoId, zonaId).controlaUbicacion" tono="pizarra">
                Ubicación
              </KmBadge>
              <KmBadge v-if="l.porProcesar" tono="vino" punto>Quedará por procesar</KmBadge>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-[12rem_1fr_1fr_auto] sm:items-end">
            <KmField
              v-slot="{ id }"
              :label="`Recibe (pendiente ${pendienteDe(l.lineaRequerimientoId)})`"
            >
              <KmNumero
                :id="id"
                v-model="l.cantidadCompra"
                :min="0"
                :max="pendienteDe(l.lineaRequerimientoId)"
                :decimales="3"
                :sufijo="articulo(l.articuloId)?.unidadCompra"
                @update:model-value="sincronizarTotal(l)"
              />
            </KmField>
            <div class="text-sm">
              <p class="text-xs text-tenue">Entra al stock</p>
              <p class="font-semibold text-tinta tabular-nums">
                {{
                  insumo(l.insumoId)
                    ? formatearCantidad(totalLinea(l), insumo(l.insumoId)!.unidad)
                    : '—'
                }}
              </p>
            </div>
            <div class="text-sm">
              <p class="text-xs text-tenue">Costo neto por unidad</p>
              <p class="text-tinta tabular-nums">
                {{ formatearSoles(l.costoUnitario) }}
                <span
                  v-if="variacion(l) !== null && Math.abs(variacion(l)!) >= 0.5"
                  class="ml-1 text-xs"
                  :class="variacion(l)! > 0 ? 'text-vino' : 'text-verde'"
                >
                  {{ variacion(l)! > 0 ? '+' : '' }}{{ variacion(l)!.toFixed(1) }} % vs anterior
                </span>
              </p>
            </div>
            <div
              v-if="parametros(l.insumoId, zonaId).tipoRecepcion === 'ambos'"
              class="inline-flex h-10 rounded-control border border-linea p-0.5"
              role="radiogroup"
              aria-label="Tipo de recepción"
            >
              <button
                v-for="m in ['total', 'detalle'] as const"
                :key="m"
                type="button"
                role="radio"
                :aria-checked="l.modo === m"
                class="rounded-[6px] px-3 text-sm font-medium"
                :class="l.modo === m ? 'bg-accion text-white' : 'text-tenue hover:text-tinta'"
                @click="
                  () => {
                    l.modo = m
                    if (m === 'total') {
                      l.partes = [l.partes[0]!]
                      sincronizarTotal(l)
                    }
                  }
                "
              >
                {{ m === 'total' ? 'Total' : 'A detalle' }}
              </button>
            </div>
            <KmBadge v-else tono="neutro">{{ l.modo === 'total' ? 'Total' : 'A detalle' }}</KmBadge>
          </div>

          <!-- Partes: lote, vencimiento y ubicación -->
          <div
            v-if="
              l.modo === 'detalle' ||
              parametros(l.insumoId, zonaId).controlaLote ||
              parametros(l.insumoId, zonaId).controlaUbicacion
            "
            class="flex flex-col gap-2 rounded-card bg-panel-2 p-3"
          >
            <div
              v-for="(p, i) in l.partes"
              :key="i"
              class="grid items-end gap-2 sm:grid-cols-[9rem_1fr_11rem_1fr_2.25rem]"
            >
              <KmNumero
                v-model="p.cantidad"
                :min="0"
                :decimales="3"
                :disabled="l.modo === 'total'"
                :sufijo="insumo(l.insumoId) ? etiquetaUnidad[insumo(l.insumoId)!.unidad] : ''"
                aria-label="Cantidad de la parte"
              />
              <KmInput
                v-if="parametros(l.insumoId, zonaId).controlaLote"
                v-model="p.loteCodigo"
                placeholder="Código de lote"
              />
              <span v-else class="text-xs text-tenue">Sin lote</span>
              <KmInput
                v-if="
                  parametros(l.insumoId, zonaId).controlaLote &&
                  parametros(l.insumoId, zonaId).controlaVencimiento
                "
                v-model="p.vencimiento"
                type="date"
              />
              <span v-else />
              <KmSelect
                v-if="parametros(l.insumoId, zonaId).controlaUbicacion"
                :model-value="p.ubicacionId ?? ''"
                :opciones="opcionesUbicacion(zonaId)"
                etiqueta="Ubicación"
                @update:model-value="p.ubicacionId = ($event as string) || undefined"
              />
              <span v-else />
              <KmBotonIcono
                v-if="l.modo === 'detalle' && l.partes.length > 1"
                icono="eliminar"
                tono="peligro"
                etiqueta="Quitar parte"
                @click="l.partes.splice(i, 1)"
              />
            </div>
            <div
              v-if="l.modo === 'detalle'"
              class="flex items-center justify-between gap-3 text-xs"
            >
              <KmButton
                tamano="sm"
                variante="fantasma"
                @click="
                  l.partes.push({
                    cantidad: 0,
                    ubicacionId: opcionesUbicacion(zonaId)[0]?.valor as string | undefined,
                  })
                "
              >
                Añadir parte
              </KmButton>
              <span
                class="tabular-nums"
                :class="
                  Math.abs(sumaPartes(l) - totalLinea(l)) > 0.0005 ? 'text-vino' : 'text-tenue'
                "
              >
                Partes: {{ sumaPartes(l) }} de {{ totalLinea(l) }}
              </span>
            </div>
          </div>
        </article>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="recibirAbierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" :disabled="!zonaId" @click="registrarRecepcion">
          Registrar recepción
        </KmButton>
      </template>
    </KmDrawer>

    <!-- Ingreso sin OC -->
    <KmDrawer
      v-model="sinOcAbierto"
      titulo="Ingreso sin orden de compra"
      :subtitulo="`El stock entra de inmediato y queda pendiente de regularizar.${tope > 0 ? ` Tope: ${formatearSoles(tope)}.` : ''}`"
      ancho="lg"
    >
      <div class="flex flex-col gap-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Zona donde entra" requerido>
            <KmSelect :id="id" v-model="sinOcZona" :opciones="zonasGestion" />
          </KmField>
          <KmField v-slot="{ id }" label="Motivo" requerido>
            <KmInput
              :id="id"
              v-model="motivo"
              placeholder="Por ejemplo: faltó limón en el servicio"
            />
          </KmField>
        </div>

        <fieldset class="grid gap-3 rounded-card border border-linea p-4 sm:grid-cols-4">
          <legend class="px-1 text-sm font-medium text-tinta">
            Comprobante{{ exigeComprobante ? '' : ' (opcional)' }}
          </legend>
          <KmField v-slot="{ id }" label="Tipo">
            <KmSelect :id="id" v-model="comprobante.tipo" :opciones="opcionesComprobante" />
          </KmField>
          <KmField v-slot="{ id }" label="Serie">
            <KmInput :id="id" v-model="comprobante.serie" placeholder="B001" />
          </KmField>
          <KmField v-slot="{ id }" label="Número">
            <KmInput :id="id" v-model="comprobante.numero" />
          </KmField>
          <KmField v-slot="{ id }" label="Monto total">
            <KmNumero :id="id" v-model="comprobante.monto" :min="0" :decimales="2" prefijo="S/" />
          </KmField>
          <div class="flex flex-col gap-2 sm:col-span-4">
            <div class="flex gap-4 text-sm">
              <label class="flex items-center gap-2">
                <input v-model="proveedorModo" type="radio" value="ocasional" />
                Proveedor ocasional (mercado)
              </label>
              <label class="flex items-center gap-2">
                <input v-model="proveedorModo" type="radio" value="erp" />
                Proveedor del ERP
              </label>
            </div>
            <KmInput
              v-if="proveedorModo === 'ocasional'"
              v-model="comprobante.proveedorOcasional"
              placeholder="A quién se le compró"
            />
            <KmSelect
              v-else
              :model-value="comprobante.proveedorId ?? ''"
              :opciones="opcionesProveedor"
              etiqueta="Proveedor"
              @update:model-value="comprobante.proveedorId = ($event as string) || undefined"
            />
          </div>
        </fieldset>

        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Qué entra</p>
          <div
            v-for="(l, i) in lineasSinOc"
            :key="l.id"
            class="grid items-end gap-2 rounded-card border border-linea p-3 sm:grid-cols-[1fr_9rem_9rem_2.25rem]"
          >
            <KmField v-slot="{ id }" label="Insumo">
              <KmSelect
                :id="id"
                v-model="l.insumoId"
                placeholder="Elige un insumo"
                :opciones="opcionesInsumo"
                @update:model-value="alElegirInsumo(l)"
              />
            </KmField>
            <KmField v-slot="{ id }" label="Cantidad">
              <KmNumero
                :id="id"
                v-model="l.partes[0]!.cantidad"
                :min="0"
                :decimales="3"
                :sufijo="insumo(l.insumoId) ? etiquetaUnidad[insumo(l.insumoId)!.unidad] : ''"
              />
            </KmField>
            <KmField v-slot="{ id }" label="Costo neto unit.">
              <KmNumero :id="id" v-model="l.costoUnitario" :min="0" :decimales="2" prefijo="S/" />
            </KmField>
            <KmBotonIcono
              icono="eliminar"
              tono="peligro"
              etiqueta="Quitar"
              :disabled="lineasSinOc.length === 1"
              @click="lineasSinOc.splice(i, 1)"
            />
            <div
              v-if="l.insumoId && parametros(l.insumoId, sinOcZona).controlaLote"
              class="grid gap-2 sm:col-span-4 sm:grid-cols-2"
            >
              <KmInput v-model="l.partes[0]!.loteCodigo" placeholder="Código de lote" />
              <KmInput
                v-if="parametros(l.insumoId, sinOcZona).controlaVencimiento"
                v-model="l.partes[0]!.vencimiento"
                type="date"
              />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <KmButton tamano="sm" variante="secundario" @click="lineasSinOc.push(lineaVacia())">
              Añadir insumo
            </KmButton>
            <p class="text-sm text-tenue">
              Costo neto:
              <strong class="text-tinta tabular-nums">{{ formatearSoles(totalSinOc) }}</strong>
            </p>
          </div>
        </div>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="sinOcAbierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="registrarSinOc">Registrar ingreso</KmButton>
      </template>
    </KmDrawer>
  </div>
</template>
