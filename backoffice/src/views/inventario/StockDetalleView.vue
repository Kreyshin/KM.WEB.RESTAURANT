<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import KmField from '@/components/ui/KmField.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useAccesoZonas } from '@/composables/useAccesoZonas'
import { useCatalogos } from '@/composables/useCatalogos'
import {
  codigoUbicacion,
  stockDetalleService,
  valoresParametros,
  type FilaStockDetalle,
} from '@/services/abastecimiento.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Insumo, Lote, Ubicacion } from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana } from '@/types/ui'
import { exportarCsv, exportarExcel, type ColumnaExportable } from '@/utils/exportar'
import { formatearCantidad } from '@/utils/formato'

/**
 * Stock (F4.3, D-004), en cuatro vistas de lo mismo:
 *
 * - **Por insumo**: el stock principal. Lo tienen todos los insumos.
 * - **Por lote**: solo los insumos que controlan lote.
 * - **Por ubicación**: solo los que controlan ubicación.
 * - **Lote y ubicación**: el detalle completo.
 *
 * Todas se pueden ver como **total** de las zonas o **por zona**, y
 * solo incluyen las zonas del local activo a los que el usuario tiene
 * acceso. Qué se controla lo decide el insumo (último nivel de los
 * parámetros). La pantalla es de consulta: el detalle lo mueve la recepción (F4.5).
 */

type Vista = 'insumo' | 'lote' | 'ubicacion' | 'detalle'
type Agrupacion = 'total' | 'zona'

const ui = useUiStore()
const localStore = useLocalStore()
const catalogos = useCatalogos(['insumos', 'zonas', 'locales'])
const { zonas, insumos, insumo, nombreZona } = catalogos
const acceso = useAccesoZonas(zonas)

type Descuadre = { insumo: Insumo; zonaId: string; principal: number; detallado: number }

const detalle = shallowRef<FilaStockDetalle[]>([])
const descuadres = shallowRef<Descuadre[]>([])
const { cargando, iniciar, terminar } = useCarga()
const error = ref('')
const vista = ref<Vista>('insumo')
const agrupacion = ref<Agrupacion>('total')
const busqueda = ref('')
const zonaId = ref('')
const vencimiento = ref<'' | 'porVencer' | 'vencido'>('')

async function cargar() {
  iniciar()
  error.value = ''
  try {
    await catalogos.recargar()
    const [pagina, sinCuadrar] = await Promise.all([
      stockDetalleService.consultar({ porPagina: 1000 }),
      stockDetalleService.descuadres(),
    ])
    detalle.value = pagina.items
    descuadres.value = sinCuadrar
  } catch (e) {
    error.value = (e as ApiError).mensaje ?? 'No se pudo cargar el stock.'
  } finally {
    terminar()
  }
}

onMounted(cargar)

// Al cambiar de local, la zona elegido puede no pertenecer al nuevo.
watch(
  () => localStore.localId,
  () => (zonaId.value = ''),
)

// ── Zonas en juego ──

const opcionesZonaFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todas mis zonas' },
  ...acceso.permitidos.value.map((a) => ({ valor: a.id, etiqueta: a.nombre })),
])

/** Zonas que entran en la consulta: los permitidos, o el elegido. */
const zonasConsulta = computed(() => {
  const ids = acceso.permitidos.value.map((a) => a.id)
  return agrupacion.value === 'zona' && zonaId.value ? ids.filter((id) => id === zonaId.value) : ids
})

const enConsulta = (id: string) => zonasConsulta.value.includes(id)
const porZona = computed(() => agrupacion.value === 'zona')

// ── Utilidades ──

const cantidad = (insumoId: string, valor: number) => {
  const i = insumo(insumoId)
  return i ? formatearCantidad(valor, i.unidad) : `${valor}`
}

const nombreInsumo = (id: string) => insumo(id)?.nombre ?? ''

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function coincide(...textos: (string | undefined)[]) {
  const q = normalizar(busqueda.value.trim())
  return !q || textos.some((t) => t && normalizar(t).includes(q))
}

function pasaVencimiento(e: { vencido: boolean; porVencer: boolean }) {
  if (vencimiento.value === 'vencido') return e.vencido
  if (vencimiento.value === 'porVencer') return e.porVencer
  return true
}

function agrupar<T>(filas: T[], clave: (f: T) => string) {
  const grupos = new Map<string, T[]>()
  for (const f of filas) {
    const k = clave(f)
    const grupo = grupos.get(k)
    if (grupo) grupo.push(f)
    else grupos.set(k, [f])
  }
  return [...grupos.entries()]
}

const suma = (filas: { cantidad: number }[]) => filas.reduce((t, f) => t + f.cantidad, 0)

/** En total, la fila dice en cuántos zonas está; por zona, en cuál. */
function textoZonas(ids: string[]) {
  const unicos = [...new Set(ids)]
  return unicos.length === 1 ? nombreZona(unicos[0]) : `${unicos.length} zonas`
}

const detalleEnConsulta = computed(() => detalle.value.filter((f) => enConsulta(f.zonaId)))

// ── Por insumo ──

interface FilaInsumo {
  id: string
  insumoId: string
  zonaIds: string[]
  cantidad: number
  bajo: boolean
  controlaLote: boolean
  controlaUbicacion: boolean
  descuadres: Descuadre[]
}

const porInsumo = computed<FilaInsumo[]>(() => {
  const existencias = insumos.value
    .filter((i) => i.activo)
    .flatMap((i) =>
      i.existencias.filter((e) => enConsulta(e.zonaId)).map((e) => ({ insumo: i, ...e })),
    )
  return agrupar(existencias, (e) => (porZona.value ? `${e.insumo.id}-${e.zonaId}` : e.insumo.id))
    .map(([k, filas]) => {
      const i = filas[0]!.insumo
      const ids = filas.map((f) => f.zonaId)
      const parametros = ids.map((id) => valoresParametros({ insumoId: i.id, zonaId: id }))
      const total = suma(filas)
      return {
        id: k,
        insumoId: i.id,
        zonaIds: ids,
        cantidad: total,
        bajo: total < i.stockMinimo,
        // En total basta con que una zona lo controle.
        controlaLote: parametros.some((p) => p.controlaLote),
        controlaUbicacion: parametros.some((p) => p.controlaUbicacion),
        descuadres: descuadres.value.filter((d) => d.insumo.id === i.id && ids.includes(d.zonaId)),
      }
    })
    .filter((f) => coincide(nombreInsumo(f.insumoId)))
    .sort(
      (a, b) =>
        nombreInsumo(a.insumoId).localeCompare(nombreInsumo(b.insumoId)) ||
        textoZonas(a.zonaIds).localeCompare(textoZonas(b.zonaIds)),
    )
})

// ── Por lote ──

interface FilaLote {
  id: string
  insumoId: string
  zonaIds: string[]
  lote: Lote
  cantidad: number
  ubicaciones: number
  diasParaVencer?: number
  vencido: boolean
  porVencer: boolean
}

const porLote = computed<FilaLote[]>(() =>
  agrupar(
    detalleEnConsulta.value.filter((f) => f.lote),
    (f) => (porZona.value ? `${f.zonaId}-${f.loteId}` : `${f.loteId}`),
  )
    .map(([k, filas]) => {
      const f = filas[0]!
      return {
        id: k,
        insumoId: f.insumoId,
        zonaIds: filas.map((x) => x.zonaId),
        lote: f.lote!,
        cantidad: suma(filas),
        ubicaciones: new Set(filas.map((x) => x.ubicacionId).filter(Boolean)).size,
        diasParaVencer: f.diasParaVencer,
        vencido: filas.some((x) => x.vencido),
        porVencer: filas.some((x) => x.porVencer),
      }
    })
    .filter((f) => pasaVencimiento(f) && coincide(nombreInsumo(f.insumoId), f.lote.codigo))
    // FEFO: primero lo que vence antes.
    .sort((a, b) => (a.diasParaVencer ?? 99999) - (b.diasParaVencer ?? 99999)),
)

// ── Por ubicación ──

interface FilaUbicacion {
  id: string
  insumoId: string
  zonaIds: string[]
  ubicacion?: Ubicacion
  ubicaciones: number
  cantidad: number
  lotes: number
}

/**
 * Una ubicación pertenece a un solo zona. En total se suma por insumo
 * (en cuántas ubicaciones está); por zona se ve cada ubicación.
 */
const porUbicacion = computed<FilaUbicacion[]>(() =>
  agrupar(
    detalleEnConsulta.value.filter((f) => f.ubicacion),
    (f) => (porZona.value ? `${f.ubicacionId}-${f.insumoId}` : f.insumoId),
  )
    .map(([k, filas]) => {
      const f = filas[0]!
      return {
        id: k,
        insumoId: f.insumoId,
        zonaIds: filas.map((x) => x.zonaId),
        ubicacion: porZona.value ? f.ubicacion : undefined,
        ubicaciones: new Set(filas.map((x) => x.ubicacionId)).size,
        cantidad: suma(filas),
        lotes: new Set(filas.map((x) => x.loteId).filter(Boolean)).size,
      }
    })
    .filter((f) => coincide(nombreInsumo(f.insumoId), f.ubicacion && codigoUbicacion(f.ubicacion)))
    .sort(
      (a, b) =>
        (a.ubicacion && b.ubicacion
          ? codigoUbicacion(a.ubicacion).localeCompare(codigoUbicacion(b.ubicacion))
          : 0) || nombreInsumo(a.insumoId).localeCompare(nombreInsumo(b.insumoId)),
    ),
)

// ── Lote y ubicación ──

interface FilaDetalle {
  id: string
  insumoId: string
  zonaIds: string[]
  lote?: Lote
  ubicacion?: Ubicacion
  ubicaciones: number
  cantidad: number
  diasParaVencer?: number
  vencido: boolean
  porVencer: boolean
}

/** En total: insumo × lote, con cuántas ubicaciones. Por zona: cada combinación. */
const porDetalle = computed<FilaDetalle[]>(() =>
  agrupar(detalleEnConsulta.value, (f) =>
    porZona.value ? f.id : `${f.insumoId}-${f.loteId ?? 'sin-lote'}`,
  )
    .map(([k, filas]) => {
      const f = filas[0]!
      return {
        id: k,
        insumoId: f.insumoId,
        zonaIds: filas.map((x) => x.zonaId),
        lote: f.lote,
        ubicacion: porZona.value ? f.ubicacion : undefined,
        ubicaciones: new Set(filas.map((x) => x.ubicacionId).filter(Boolean)).size,
        cantidad: suma(filas),
        diasParaVencer: f.diasParaVencer,
        vencido: filas.some((x) => x.vencido),
        porVencer: filas.some((x) => x.porVencer),
      }
    })
    .filter(
      (f) =>
        pasaVencimiento(f) &&
        coincide(
          nombreInsumo(f.insumoId),
          f.lote?.codigo,
          f.ubicacion && codigoUbicacion(f.ubicacion),
        ),
    )
    .sort(
      (a, b) =>
        nombreInsumo(a.insumoId).localeCompare(nombreInsumo(b.insumoId)) ||
        (a.diasParaVencer ?? 99999) - (b.diasParaVencer ?? 99999),
    ),
)

// ── Vistas ──

const pestanas = computed<Pestana[]>(() => [
  { valor: 'insumo', etiqueta: 'Por insumo', contador: porInsumo.value.length },
  { valor: 'lote', etiqueta: 'Por lote', contador: porLote.value.length },
  { valor: 'ubicacion', etiqueta: 'Por ubicación', contador: porUbicacion.value.length },
  { valor: 'detalle', etiqueta: 'Lote y ubicación', contador: porDetalle.value.length },
])

const explicacion = computed<string>(() => {
  const total = !porZona.value
  return {
    insumo: total
      ? 'Stock de cada insumo sumando tus zonas del local. Lo tienen todos los insumos.'
      : 'Stock de cada insumo en cada zona. Lo tienen todos los insumos.',
    lote: 'Solo los insumos que controlan lote, ordenados por vencimiento (FEFO).',
    ubicacion: total
      ? 'Solo los insumos que controlan ubicación: cantidad total y en cuántas ubicaciones está. Cada ubicación se ve por zona.'
      : 'Solo los insumos que controlan ubicación: qué hay en cada pasillo y estante.',
    detalle: total
      ? 'Cada lote de cada insumo con su total y en cuántas ubicaciones está.'
      : 'El detalle completo: cada combinación de insumo, zona, lote y ubicación.',
  }[vista.value]
})

const usaVencimiento = computed(() => vista.value === 'lote' || vista.value === 'detalle')

const placeholderBusqueda: Record<Vista, string> = {
  insumo: 'Buscar insumo',
  lote: 'Buscar insumo o lote',
  ubicacion: 'Buscar insumo o ubicación',
  detalle: 'Buscar insumo, lote o ubicación',
}

const opcionesVencimiento: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'porVencer', etiqueta: 'Por vencer' },
  { valor: 'vencido', etiqueta: 'Vencidos' },
]

const resumen = computed(() => ({
  insumos: new Set(porInsumo.value.map((f) => f.insumoId)).size,
  bajos: porInsumo.value.filter((f) => f.bajo).length,
  porVencer: porLote.value.filter((f) => f.porVencer && !f.vencido).length,
  vencidos: porLote.value.filter((f) => f.vencido).length,
}))

const descuadresVisibles = computed(() => descuadres.value.filter((d) => enConsulta(d.zonaId)))

const colZona = computed<ColumnaTabla>(() => ({
  clave: 'zona',
  etiqueta: porZona.value ? 'Zona' : 'Zonas',
  clase: 'w-56',
}))

const columnas = computed<ColumnaTabla[]>(() => {
  const cantidadCol = { clave: 'cantidad', etiqueta: 'Cantidad', clase: 'w-40 text-right' }
  if (vista.value === 'insumo') {
    return [
      { clave: 'insumo', etiqueta: 'Insumo' },
      colZona.value,
      { clave: 'controla', etiqueta: 'Controla', clase: 'w-48' },
      { ...cantidadCol, etiqueta: 'Stock' },
    ]
  }
  if (vista.value === 'lote') {
    return [
      { clave: 'insumo', etiqueta: 'Insumo' },
      colZona.value,
      { clave: 'lote', etiqueta: 'Lote', clase: 'w-44' },
      { clave: 'vence', etiqueta: 'Vencimiento', clase: 'w-48' },
      { clave: 'ubicaciones', etiqueta: 'Ubicaciones', clase: 'w-32 text-right' },
      cantidadCol,
    ]
  }
  if (vista.value === 'ubicacion') {
    return porZona.value
      ? [
          { clave: 'ubicacion', etiqueta: 'Ubicación', clase: 'w-44' },
          colZona.value,
          { clave: 'insumo', etiqueta: 'Insumo' },
          { clave: 'lotes', etiqueta: 'Lotes', clase: 'w-28 text-right' },
          cantidadCol,
        ]
      : [
          { clave: 'insumo', etiqueta: 'Insumo' },
          colZona.value,
          { clave: 'ubicaciones', etiqueta: 'Ubicaciones', clase: 'w-32 text-right' },
          { clave: 'lotes', etiqueta: 'Lotes', clase: 'w-28 text-right' },
          cantidadCol,
        ]
  }
  return [
    { clave: 'insumo', etiqueta: 'Insumo' },
    colZona.value,
    { clave: 'lote', etiqueta: 'Lote', clase: 'w-44' },
    { clave: 'vence', etiqueta: 'Vencimiento', clase: 'w-48' },
    porZona.value
      ? { clave: 'ubicacion', etiqueta: 'Ubicación', clase: 'w-40' }
      : { clave: 'ubicaciones', etiqueta: 'Ubicaciones', clase: 'w-32 text-right' },
    cantidadCol,
  ]
})

/** Fila común a las cuatro vistas: la tabla pinta lo que cada una trae. */
type FilaStock = Partial<FilaInsumo & FilaLote & FilaUbicacion & Omit<FilaDetalle, 'lote'>> &
  Pick<FilaInsumo, 'id' | 'insumoId' | 'zonaIds' | 'cantidad'> & { lote?: Lote }

const filasTabla = computed<FilaStock[]>(
  () =>
    ({
      insumo: porInsumo.value,
      lote: porLote.value,
      ubicacion: porUbicacion.value,
      detalle: porDetalle.value,
    })[vista.value],
)

const cantidadFilas = computed(
  () =>
    ({
      insumo: porInsumo.value.length,
      lote: porLote.value.length,
      ubicacion: porUbicacion.value.length,
      detalle: porDetalle.value.length,
    })[vista.value],
)

const mensajeVacio = computed(() => {
  if (!acceso.permitidos.value.length) {
    return 'No tienes acceso a ninguna zona de este local.'
  }
  return {
    insumo: 'Ningún insumo tiene stock con esos filtros.',
    lote: 'Ningún insumo que controle lote tiene stock con esos filtros.',
    ubicacion: 'Ningún insumo que controle ubicación tiene stock con esos filtros.',
    detalle: 'No hay stock detallado con esos filtros.',
  }[vista.value]
})

function exportar(formato: 'csv' | 'excel') {
  const archivo = `stock-${vista.value}-${agrupacion.value}`
  const hacer = <T,>(filas: T[], cols: ColumnaExportable<T>[]) =>
    formato === 'csv' ? exportarCsv(archivo, filas, cols) : exportarExcel(archivo, filas, cols)
  const alm = {
    etiqueta: porZona.value ? 'Zona' : 'Zonas',
    valor: (f: { zonaIds: string[] }) => textoZonas(f.zonaIds),
  }
  const ins = { etiqueta: 'Insumo', valor: (f: { insumoId: string }) => nombreInsumo(f.insumoId) }
  const cant = { etiqueta: 'Cantidad', valor: (f: { cantidad: number }) => f.cantidad }

  if (vista.value === 'insumo') hacer(porInsumo.value, [ins, alm, cant])
  else if (vista.value === 'lote') {
    hacer(porLote.value, [
      ins,
      alm,
      { etiqueta: 'Lote', valor: (f) => f.lote.codigo },
      { etiqueta: 'Vence', valor: (f) => f.lote.vencimiento ?? '' },
      cant,
    ])
  } else if (vista.value === 'ubicacion') {
    hacer(porUbicacion.value, [
      {
        etiqueta: 'Ubicación',
        valor: (f) => (f.ubicacion ? codigoUbicacion(f.ubicacion) : f.ubicaciones),
      },
      alm,
      ins,
      cant,
    ])
  } else {
    hacer(porDetalle.value, [
      ins,
      alm,
      { etiqueta: 'Lote', valor: (f) => f.lote?.codigo ?? '' },
      { etiqueta: 'Vence', valor: (f) => f.lote?.vencimiento ?? '' },
      {
        etiqueta: 'Ubicación',
        valor: (f) => (f.ubicacion ? codigoUbicacion(f.ubicacion) : f.ubicaciones),
      },
      cant,
    ])
  }
}

function avisarDescuadre() {
  ui.error(
    'Un descuadre viene de un movimiento registrado sin su detalle. Se corrige al recepcionar (F4.5).',
  )
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Insumos con stock</p>
        <p class="text-2xl font-semibold text-tinta tabular-nums">{{ resumen.insumos }}</p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Bajo el mínimo</p>
        <p class="text-2xl font-semibold text-vino tabular-nums">{{ resumen.bajos }}</p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Lotes por vencer</p>
        <p class="text-2xl font-semibold text-laton tabular-nums">{{ resumen.porVencer }}</p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Lotes vencidos</p>
        <p class="text-2xl font-semibold text-vino tabular-nums">{{ resumen.vencidos }}</p>
      </div>
    </div>

    <div
      v-if="descuadresVisibles.length"
      class="rs-tono rs-tono-vino flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border px-4 py-3 text-sm"
      role="status"
    >
      <strong>
        {{ descuadresVisibles.length }} descuadres entre el stock del insumo y su detalle:
      </strong>
      <span>
        {{
          descuadresVisibles
            .slice(0, 3)
            .map(
              (d) =>
                `${d.insumo.nombre} en ${nombreZona(d.zonaId)} (${d.principal} vs ${d.detallado})`,
            )
            .join(' · ')
        }}{{ descuadresVisibles.length > 3 ? '…' : '' }}
      </span>
      <KmButton tamano="sm" variante="secundario" @click="avisarDescuadre">Qué significa</KmButton>
    </div>

    <KmCard sin-padding>
      <div class="px-6 pt-4">
        <KmTabs v-model="vista" :pestanas="pestanas" etiqueta="Vista del stock">
          <p class="-mt-1 text-sm text-tenue">
            {{ explicacion }}
            <span v-if="vista !== 'insumo'" class="block text-xs">
              Lote y ubicación los decide cada insumo en
              <RouterLink :to="{ name: 'inv-parametros' }" class="text-verde underline">
                Parámetros de abastecimiento</RouterLink
              >.
            </span>
          </p>
        </KmTabs>
      </div>

      <div class="flex flex-wrap items-end gap-3 px-6 py-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-tinta">Agrupar</span>
          <div
            class="inline-flex h-10 rounded-control border border-linea p-0.5"
            role="radiogroup"
            aria-label="Agrupar el stock"
          >
            <button
              v-for="op in [
                { valor: 'total', etiqueta: 'Total' },
                { valor: 'zona', etiqueta: 'Por zona' },
              ] as const"
              :key="op.valor"
              type="button"
              role="radio"
              :aria-checked="agrupacion === op.valor"
              class="rounded-[6px] px-3 text-sm font-medium transition-colors"
              :class="
                agrupacion === op.valor ? 'bg-accion text-white' : 'text-tenue hover:text-tinta'
              "
              @click="agrupacion = op.valor"
            >
              {{ op.etiqueta }}
            </button>
          </div>
        </div>
        <div v-if="porZona" class="w-full sm:w-60">
          <KmField v-slot="{ id }" label="Zona">
            <KmSelect :id="id" v-model="zonaId" :opciones="opcionesZonaFiltro" />
          </KmField>
        </div>
        <div v-if="usaVencimiento" class="w-full sm:w-44">
          <KmField v-slot="{ id }" label="Vencimiento">
            <KmSelect :id="id" v-model="vencimiento" :opciones="opcionesVencimiento" />
          </KmField>
        </div>
        <KmBusqueda v-model="busqueda" :placeholder="placeholderBusqueda[vista]" />
        <div class="flex-1" />
        <KmExportar :disabled="cantidadFilas === 0" @exportar="exportar" />
      </div>

      <p class="px-6 pb-3 text-xs text-tenue">
        {{ localStore.local?.nombre ?? 'Local' }} ·
        {{
          acceso.permitidos.value.length === 1
            ? '1 zona con acceso'
            : `${acceso.permitidos.value.length} zonas con acceso`
        }}<template v-if="acceso.ocultos.value">
          · {{ acceso.ocultos.value }} sin acceso no se muestran</template
        >
      </p>

      <div class="border-t border-linea">
        <KmTable
          :key="`${vista}-${agrupacion}`"
          :columnas="columnas"
          :filas="filasTabla"
          :cargando="cargando"
          :error="error || null"
          :mensaje-vacio="mensajeVacio"
        >
          <template #col-insumo="{ fila }">
            <p class="font-medium text-tinta">{{ nombreInsumo(fila.insumoId) || '—' }}</p>
            <p v-if="fila.descuadres?.length" class="text-xs text-vino">Su detalle no cuadra</p>
          </template>

          <template #col-zona="{ fila }">
            <span :title="fila.zonaIds.map((id) => nombreZona(id)).join(', ')">
              {{ textoZonas(fila.zonaIds) }}
            </span>
          </template>

          <template #col-controla="{ fila }">
            <div class="flex flex-wrap gap-1">
              <KmBadge v-if="fila.controlaLote" tono="laton">Lote</KmBadge>
              <KmBadge v-if="fila.controlaUbicacion" tono="pizarra"> Ubicación </KmBadge>
              <span v-if="!fila.controlaLote && !fila.controlaUbicacion" class="text-xs text-tenue">
                Solo cantidad
              </span>
            </div>
          </template>

          <template #col-lote="{ fila }">
            <span v-if="fila.lote" class="text-tinta tabular-nums">
              {{ fila.lote!.codigo }}
            </span>
            <span v-else class="text-tenue">No controla</span>
          </template>

          <template #col-vence="{ fila }">
            <KmBadge v-if="fila.vencido" tono="vino" punto>
              Vencido hace {{ -(fila.diasParaVencer ?? 0) }} d
            </KmBadge>
            <KmBadge v-else-if="fila.porVencer" tono="laton" punto>
              Vence en {{ fila.diasParaVencer }} d
            </KmBadge>
            <span v-else-if="fila.lote?.vencimiento" class="text-sm text-tenue tabular-nums">
              {{ fila.lote!.vencimiento }}
            </span>
            <span v-else class="text-tenue">—</span>
          </template>

          <template #col-ubicacion="{ fila }">
            <span v-if="fila.ubicacion" class="font-medium tabular-nums">
              {{ codigoUbicacion(fila.ubicacion!) }}
            </span>
            <span v-else class="text-tenue">No controla</span>
          </template>

          <template #col-ubicaciones="{ fila }">
            <span class="tabular-nums">{{ fila.ubicaciones || '—' }}</span>
          </template>

          <template #col-lotes="{ fila }">
            <span class="tabular-nums">{{ fila.lotes || '—' }}</span>
          </template>

          <template #col-cantidad="{ fila }">
            <p class="font-semibold tabular-nums" :class="fila.bajo ? 'text-vino' : 'text-tinta'">
              {{ cantidad(fila.insumoId, fila.cantidad) }}
            </p>
            <p v-if="fila.bajo" class="text-xs text-vino">Bajo el mínimo</p>
          </template>
        </KmTable>
      </div>
    </KmCard>
  </div>
</template>
