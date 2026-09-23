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
import { modosDeOc, recepcionService, type LineaPorRecibir } from '@/services/recepcion.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  ComprobanteIngreso,
  EstadoRecepcion,
  LineaRecepcion,
  ModoRecepcion,
  Recepcion,
  RequerimientoCompra,
  TipoComprobanteIngreso,
  Ubicacion,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana, TonoMesa } from '@/types/ui'
import { etiquetaUnidad, formatearCantidad, formatearFecha, formatearSoles } from '@/utils/formato'
import { imprimirHojaRecepcion } from '@/utils/hojaRecepcion'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmIcono from '@/components/ui/KmIcono.vue'
import KmModal from '@/components/ui/KmModal.vue'
import ConversionCompra from './ConversionCompra.vue'

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
  rechazada: 'vino',
  pendienteRegularizar: 'laton',
  regularizada: 'pizarra',
}
const etiquetaEstado: Record<EstadoRecepcion, string> = {
  registrada: 'Registrada',
  rechazada: 'Entrega rechazada',
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

function sumaPartes(l: LineaRecepcion) {
  return Math.round(l.partes.reduce((t, p) => t + (p.cantidad || 0), 0) * 1000) / 1000
}

/** Con serie, una casilla por unidad: se agregan o se quitan del final. */
function ajustarSeries(l: LineaRecepcion) {
  if (!parametros(l.insumoId, zonaId.value).controlaSerie) return
  for (const p of l.partes) {
    const n = Math.max(0, Math.round(p.cantidad || 0))
    const series = p.series ?? []
    p.series =
      series.length > n ? series.slice(0, n) : [...series, ...Array(n - series.length).fill('')]
  }
}

/** Con una sola parte, esa parte es todo lo que se recibe. */
function sincronizar(l: LineaRecepcion) {
  if (l.partes.length === 1) l.partes[0]!.cantidad = totalLinea(l)
  ajustarSeries(l)
}

/** Controles que pide la línea en la zona elegida. */
function controles(l: LineaRecepcion) {
  const p = parametros(l.insumoId, zonaId.value)
  return {
    lote: p.controlaLote,
    vencimiento: p.controlaLote && p.controlaVencimiento,
    ubicacion: p.controlaUbicacion,
    serie: p.controlaSerie,
    alguno: p.controlaLote || p.controlaUbicacion || p.controlaSerie,
  }
}

/** Se puede repartir en partes cuando hay lote o ubicación que distinguir. */
const divisible = (l: LineaRecepcion) => controles(l).lote || controles(l).ubicacion

function agregarParte(l: LineaRecepcion) {
  l.partes.push({
    cantidad: 0,
    ubicacionId: opcionesUbicacion(zonaId.value)[0]?.valor as string | undefined,
    ...(controles(l).serie ? { series: [] } : {}),
  })
}

function quitarParte(l: LineaRecepcion, i: number) {
  l.partes.splice(i, 1)
  sincronizar(l)
}

/** Con serie, Enter pasa a la siguiente casilla: así funciona también con lector. */
function siguienteSerie(evento: KeyboardEvent) {
  const actualCampo = evento.target as HTMLInputElement
  const campos = [
    ...(actualCampo.closest('article')?.querySelectorAll<HTMLInputElement>('input[data-serie]') ??
      []),
  ]
  campos[campos.indexOf(actualCampo) + 1]?.focus()
}

// ── Recibir contra OC ──

type ItemPorRecibir = { requerimiento: RequerimientoCompra; lineas: LineaPorRecibir[] }

const recibirAbierto = ref(false)
const actual = shallowRef<ItemPorRecibir | null>(null)
const zonaId = ref('')
const modo = ref<ModoRecepcion>('total')
const lineas = ref<LineaRecepcion[]>([])
const guardando = ref(false)

const modos = computed(() =>
  actual.value && zonaId.value
    ? modosDeOc(actual.value.requerimiento.id, zonaId.value)
    : { opciones: ['total'] as ModoRecepcion[], exigidoPor: undefined },
)

/** Zona donde se guardan los insumos de la OC, si el usuario la gestiona. */
function zonaSugerida(item: ItemPorRecibir) {
  const cuenta = new Map<string, number>()
  for (const l of item.lineas) {
    const zona = insumo(l.insumoId)?.existencias.find((e) =>
      zonasGestion.value.some((z) => z.valor === e.zonaId),
    )?.zonaId
    if (zona) cuenta.set(zona, (cuenta.get(zona) ?? 0) + 1)
  }
  const [mejor] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  return mejor?.[0] ?? (zonasGestion.value[0]?.valor as string) ?? ''
}

function preparar() {
  if (!actual.value || !zonaId.value) return
  if (!modos.value.opciones.includes(modo.value)) modo.value = modos.value.opciones[0]!
  lineas.value = recepcionService.preparar(actual.value.requerimiento.id, zonaId.value, modo.value)
}

function abrirRecibir(item: ItemPorRecibir) {
  actual.value = item
  zonaId.value = zonaSugerida(item)
  modo.value = modosDeOc(item.requerimiento.id, zonaId.value).opciones[0]!
  preparar()
  recibirAbierto.value = true
}

watch([zonaId, modo], preparar)

const pendienteDe = (lineaId?: string) =>
  actual.value?.lineas.find((l) => l.lineaId === lineaId)?.pendiente ?? 0

/** Lo que falta en una línea contada a detalle, en unidades de compra. */
const faltante = (l: LineaRecepcion) =>
  Math.round((pendienteDe(l.lineaRequerimientoId) - (l.cantidadCompra ?? 0)) * 1000) / 1000

/** Datos pendientes de una línea: lote, vencimiento, ubicación, series y reparto. */
function avisosLinea(l: LineaRecepcion): string[] {
  if (!(l.cantidadCompra ?? 0)) return []
  const c = controles(l)
  const avisos: string[] = []
  const partes = l.partes.filter((p) => p.cantidad > 0)
  if (c.lote && partes.some((p) => !p.loteCodigo?.trim())) avisos.push('Falta el lote')
  if (c.vencimiento && partes.some((p) => !p.vencimiento)) avisos.push('Falta el vencimiento')
  if (c.ubicacion && partes.some((p) => !p.ubicacionId)) avisos.push('Falta la ubicación')
  if (c.serie) {
    const faltan = partes.reduce((t, p) => t + (p.series ?? []).filter((s) => !s.trim()).length, 0)
    if (faltan) avisos.push(`Faltan ${faltan} ${faltan === 1 ? 'serie' : 'series'}`)
  }
  if (Math.abs(sumaPartes(l) - totalLinea(l)) > 0.0005) avisos.push('Las partes no cuadran')
  return avisos
}

const resumen = computed(() => {
  const recibidas = lineas.value.filter((l) => (l.cantidadCompra ?? 0) > 0)
  return {
    costo: recibidas.reduce((t, l) => t + l.costoUnitario * totalLinea(l), 0),
    conFaltante: lineas.value.filter((l) => faltante(l) > 0.0005).length,
    conAvisos: lineas.value.filter((l) => avisosLinea(l).length > 0).length,
    nada: recibidas.length === 0,
  }
})

function imprimirHoja(item: ItemPorRecibir, zona: string, modoHoja: ModoRecepcion) {
  const ok = imprimirHojaRecepcion({
    ordenCompra: item.requerimiento.ordenCompra ?? item.requerimiento.numero,
    requerimiento: item.requerimiento.numero,
    proveedores: proveedoresDe(item.requerimiento),
    local: localStore.local?.nombre ?? '',
    zona: nombreZona(zona),
    modo: modoHoja,
    lineas: item.lineas.map((l) => {
      const p = parametros(l.insumoId, zona)
      const i = insumo(l.insumoId)
      return {
        articulo: articulo(l.articuloId)?.nombre ?? '',
        codigo: articulo(l.articuloId)?.codigo,
        insumo: i?.nombre ?? '',
        unidadCompra: articulo(l.articuloId)?.unidadCompra ?? '',
        pendiente: l.pendiente,
        factor: l.factor,
        unidadInsumo: i ? etiquetaUnidad[i.unidad] : '',
        lote: p.controlaLote,
        vencimiento: p.controlaLote && p.controlaVencimiento,
        ubicacion: p.controlaUbicacion,
        serie: p.controlaSerie,
      }
    }),
  })
  if (!ok) ui.error('El navegador bloqueó la ventana de impresión: permite ventanas emergentes.')
}

function imprimirDesdeLista(item: ItemPorRecibir) {
  const zona = zonaSugerida(item)
  imprimirHoja(item, zona, modosDeOc(item.requerimiento.id, zona).opciones[0]!)
}

const proveedoresDe = (r: RequerimientoCompra) =>
  [...new Set(r.lineas.map((l) => nombreProveedor(l.proveedorId)))].join(', ')

/** Resumen de controles de una OC en la lista, para saber qué preparar antes de abrirla. */
function controlesOc(item: ItemPorRecibir) {
  const zona = zonaSugerida(item)
  const ps = item.lineas.map((l) => parametros(l.insumoId, zona))
  return {
    zona,
    modos: modosDeOc(item.requerimiento.id, zona).opciones,
    lote: ps.some((p) => p.controlaLote),
    vencimiento: ps.some((p) => p.controlaLote && p.controlaVencimiento),
    ubicacion: ps.some((p) => p.controlaUbicacion),
    serie: ps.some((p) => p.controlaSerie),
    parcial: item.requerimiento.lineas.some((l) => (l.cantidadRecibida ?? 0) > 0),
  }
}

// ── Rechazar una entrega total ──

const rechazoAbierto = ref(false)
const motivoRechazo = ref('')

async function rechazarEntrega() {
  if (!actual.value) return
  guardando.value = true
  try {
    const r = await recepcionService.rechazar(
      {
        localId: localStore.localId!,
        requerimientoId: actual.value.requerimiento.id,
        zonaId: zonaId.value,
        motivo: motivoRechazo.value,
      },
      auth.usuario!.id,
    )
    ui.exito(`${r.numero}: entrega rechazada. No entró nada y la OC sigue pendiente.`)
    rechazoAbierto.value = false
    recibirAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo rechazar la entrega.')
  } finally {
    guardando.value = false
  }
}

async function registrarRecepcion() {
  if (!actual.value) return
  guardando.value = true
  try {
    const r = await recepcionService.recibir(
      {
        localId: localStore.localId!,
        requerimientoId: actual.value.requerimiento.id,
        zonaId: zonaId.value,
        modo: modo.value,
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
              <div class="min-w-0">
                <p class="font-semibold text-tinta tabular-nums">
                  {{ item.requerimiento.ordenCompra }}
                  <span class="font-normal text-tenue">· {{ item.requerimiento.numero }}</span>
                </p>
                <p class="truncate text-xs text-tenue">{{ proveedoresDe(item.requerimiento) }}</p>
              </div>
              <div class="flex flex-wrap gap-1">
                <KmBadge v-if="controlesOc(item).parcial" tono="laton">Saldo de parcial</KmBadge>
                <KmBadge
                  :tono="item.requerimiento.estado === 'despachado' ? 'verde' : 'pizarra'"
                  punto
                >
                  {{ etiquetaEstadoRequerimiento[item.requerimiento.estado] }}
                </KmBadge>
              </div>
            </div>

            <ul class="flex flex-col divide-y divide-linea rounded-card border border-linea">
              <li
                v-for="l in item.lineas"
                :key="l.lineaId"
                class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span class="flex min-w-0 items-center gap-2 text-tinta">
                  <KmIcono nombre="caja" class="text-laton-texto" />
                  <span class="truncate">{{ articulo(l.articuloId)?.nombre }}</span>
                  <KmIcono
                    v-if="l.procesar"
                    nombre="procesar"
                    class="text-vino"
                    title="Queda por procesar"
                  />
                </span>
                <span class="flex shrink-0 items-center gap-1.5 text-tenue tabular-nums">
                  <strong class="text-tinta">{{ l.pendiente }}</strong>
                  {{ articulo(l.articuloId)?.unidadCompra }}
                  <KmIcono nombre="flecha" tamano="xs" />
                  <span>
                    {{
                      insumo(l.insumoId)
                        ? formatearCantidad(l.pendiente * l.factor, insumo(l.insumoId)!.unidad)
                        : ''
                    }}
                  </span>
                </span>
              </li>
            </ul>

            <div class="flex flex-wrap items-center gap-1.5 text-xs">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
                :class="
                  controlesOc(item).modos.length > 1
                    ? 'rs-tono-pizarra'
                    : controlesOc(item).modos[0] === 'total'
                      ? 'rs-tono-verde'
                      : 'rs-tono-laton'
                "
              >
                <KmIcono
                  :nombre="
                    controlesOc(item).modos.length > 1
                      ? 'dividir'
                      : controlesOc(item).modos[0] === 'total'
                        ? 'ojoCerrado'
                        : 'conteo'
                  "
                  tamano="xs"
                />
                {{
                  controlesOc(item).modos.length > 1
                    ? 'Total o a detalle'
                    : controlesOc(item).modos[0] === 'total'
                      ? 'Total · a ciegas'
                      : 'A detalle · se cuenta'
                }}
              </span>
              <span v-if="controlesOc(item).lote" class="inline-flex items-center gap-1 text-tenue">
                <KmIcono nombre="lote" tamano="xs" /> Lote
              </span>
              <span
                v-if="controlesOc(item).vencimiento"
                class="inline-flex items-center gap-1 text-tenue"
              >
                <KmIcono nombre="calendario" tamano="xs" /> Vence
              </span>
              <span
                v-if="controlesOc(item).ubicacion"
                class="inline-flex items-center gap-1 text-tenue"
              >
                <KmIcono nombre="ubicacion" tamano="xs" /> Ubicación
              </span>
              <span
                v-if="controlesOc(item).serie"
                class="inline-flex items-center gap-1 text-tenue"
              >
                <KmIcono nombre="serie" tamano="xs" /> Serie
              </span>
              <span class="ml-auto text-tenue">en {{ nombreZona(controlesOc(item).zona) }}</span>
            </div>

            <div class="flex justify-end gap-2">
              <KmButton tamano="sm" variante="secundario" @click="imprimirDesdeLista(item)">
                <KmIcono nombre="impresora" /> Imprimir hoja
              </KmButton>
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
            <template v-if="fila.estado === 'rechazada'">
              <p class="text-xs text-vino">No entró nada: {{ fila.motivoRechazo }}</p>
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
      :subtitulo="actual ? proveedoresDe(actual.requerimiento) : ''"
      ancho="xl"
    >
      <div v-if="actual" class="flex flex-col gap-5">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="w-full sm:w-72">
            <KmField v-slot="{ id }" label="Zona donde entra" requerido>
              <KmSelect :id="id" v-model="zonaId" :opciones="zonasGestion" />
            </KmField>
          </div>
          <KmButton variante="secundario" @click="imprimirHoja(actual, zonaId, modo)">
            <KmIcono nombre="impresora" /> Imprimir hoja de recepción
          </KmButton>
        </div>

        <!-- Modo de la recepción: vale para toda la OC -->
        <div role="radiogroup" aria-label="Tipo de recepción" class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="m in ['total', 'detalle'] as const"
            :key="m"
            type="button"
            role="radio"
            :aria-checked="modo === m"
            :disabled="!modos.opciones.includes(m)"
            class="flex items-start gap-3 rounded-card border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            :class="
              modo === m
                ? 'border-verde bg-verde/10 ring-1 ring-verde'
                : 'border-linea hover:border-verde/60'
            "
            @click="modo = m"
          >
            <span
              class="grid size-10 shrink-0 place-items-center rounded-control"
              :class="modo === m ? 'bg-verde text-white' : 'bg-panel-2 text-tenue'"
            >
              <KmIcono :nombre="m === 'total' ? 'ojoCerrado' : 'conteo'" tamano="md" />
            </span>
            <span class="min-w-0">
              <span class="block font-semibold text-tinta">
                {{ m === 'total' ? 'Total · a ciegas' : 'A detalle · se cuenta' }}
              </span>
              <span class="block text-xs text-tenue">
                {{
                  m === 'total'
                    ? 'Se recibe todo lo pendiente tal cual, sin editar. Si algo no está conforme, se rechaza la entrega completa.'
                    : 'Se cuenta cada línea y se registra lo que llegó. Lo que falte queda pendiente en la OC.'
                }}
              </span>
            </span>
          </button>
        </div>
        <p
          v-if="modos.opciones.length === 1 && modos.exigidoPor"
          class="-mt-2 flex items-center gap-1.5 text-xs text-tenue"
        >
          <KmIcono nombre="candado" tamano="xs" />
          Esta OC se recibe {{ modos.opciones[0] === 'total' ? 'total' : 'a detalle' }} en
          {{ nombreZona(zonaId) }}: lo exigen los parámetros de {{ modos.exigidoPor }}.
        </p>

        <article
          v-for="l in lineas"
          :key="l.id"
          class="flex flex-col gap-4 rounded-card border p-4"
          :class="avisosLinea(l).length ? 'border-laton/60' : 'border-linea'"
        >
          <!-- Cabecera de la línea -->
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-tinta">{{ articulo(l.articuloId)?.nombre }}</p>
              <p class="text-xs text-tenue tabular-nums">
                {{ articulo(l.articuloId)?.codigo }} · costo neto
                {{ formatearSoles(l.costoUnitario) }} por
                {{ insumo(l.insumoId) ? etiquetaUnidad[insumo(l.insumoId)!.unidad] : '' }}
                <span
                  v-if="variacion(l) !== null && Math.abs(variacion(l)!) >= 0.5"
                  :class="variacion(l)! > 0 ? 'text-vino' : 'text-verde'"
                >
                  ({{ variacion(l)! > 0 ? '+' : '' }}{{ variacion(l)!.toFixed(1) }} % vs anterior)
                </span>
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <KmBadge v-if="controles(l).lote" tono="laton">
                <KmIcono nombre="lote" tamano="xs" /> Lote
              </KmBadge>
              <KmBadge v-if="controles(l).vencimiento" tono="laton">
                <KmIcono nombre="calendario" tamano="xs" /> Vence
              </KmBadge>
              <KmBadge v-if="controles(l).ubicacion" tono="pizarra">
                <KmIcono nombre="ubicacion" tamano="xs" /> Ubicación
              </KmBadge>
              <KmBadge v-if="controles(l).serie" tono="pizarra">
                <KmIcono nombre="serie" tamano="xs" /> Serie
              </KmBadge>
              <KmBadge v-if="l.porProcesar" tono="vino">
                <KmIcono nombre="procesar" tamano="xs" /> Quedará por procesar
              </KmBadge>
            </div>
          </div>

          <!-- Cantidad: fija en total, contada a detalle -->
          <div class="grid gap-3 lg:grid-cols-[minmax(15rem,auto)_1fr] lg:items-center">
            <div v-if="modo === 'total'" class="flex items-center gap-3">
              <span class="grid size-10 place-items-center rounded-control bg-panel-2 text-tenue">
                <KmIcono nombre="candado" tamano="md" />
              </span>
              <div>
                <p class="text-xs text-tenue">Se recibe tal cual</p>
                <p class="text-lg font-semibold whitespace-nowrap text-tinta tabular-nums">
                  {{ l.cantidadCompra }} {{ articulo(l.articuloId)?.unidadCompra }}
                </p>
              </div>
            </div>
            <div v-else class="flex flex-col gap-1.5">
              <p class="text-xs text-tenue">
                Llegó · pedido
                <strong class="text-tinta tabular-nums">
                  {{ pendienteDe(l.lineaRequerimientoId) }}
                  {{ articulo(l.articuloId)?.unidadCompra }}
                </strong>
              </p>
              <div class="flex items-center gap-2">
                <div class="w-40">
                  <KmNumero
                    v-model="l.cantidadCompra"
                    :min="0"
                    :max="pendienteDe(l.lineaRequerimientoId)"
                    :decimales="Number.isInteger(pendienteDe(l.lineaRequerimientoId)) ? 0 : 2"
                    :aria-label="`Cantidad que llegó de ${articulo(l.articuloId)?.nombre}`"
                    @update:model-value="sincronizar(l)"
                  />
                </div>
                <span class="text-sm whitespace-nowrap text-tenue">
                  {{ articulo(l.articuloId)?.unidadCompra }}
                </span>
              </div>
              <p
                class="inline-flex items-center gap-1 text-xs font-medium"
                :class="
                  faltante(l) > 0.0005
                    ? (l.cantidadCompra ?? 0) > 0
                      ? 'text-laton-texto'
                      : 'text-vino'
                    : 'text-verde'
                "
              >
                <KmIcono :nombre="faltante(l) > 0.0005 ? 'alerta' : 'check'" tamano="xs" />
                <template v-if="faltante(l) <= 0.0005">Completo</template>
                <template v-else-if="!(l.cantidadCompra ?? 0)"
                  >No llegó: todo queda pendiente</template
                >
                <template v-else>
                  Faltan {{ faltante(l) }} {{ articulo(l.articuloId)?.unidadCompra }}: quedan
                  pendientes
                </template>
              </p>
            </div>
            <ConversionCompra
              :cantidad="l.cantidadCompra ?? 0"
              :unidad-compra="articulo(l.articuloId)?.unidadCompra ?? ''"
              :factor="l.factor"
              :unidad-insumo="insumo(l.insumoId) ? etiquetaUnidad[insumo(l.insumoId)!.unidad] : ''"
              :insumo="insumo(l.insumoId)?.nombre ?? ''"
              :apagado="!(l.cantidadCompra ?? 0)"
            />
          </div>

          <!-- Datos que pide el insumo: lote, vencimiento, ubicación y series -->
          <div
            v-if="controles(l).alguno && (l.cantidadCompra ?? 0) > 0"
            class="flex flex-col gap-3 rounded-card bg-panel-2 p-3"
          >
            <div
              v-for="(p, i) in l.partes"
              :key="i"
              class="flex flex-col gap-3"
              :class="i > 0 ? 'border-t border-linea pt-3' : ''"
            >
              <div class="flex flex-wrap items-end gap-3">
                <div v-if="l.partes.length > 1" class="w-36">
                  <KmField v-slot="{ id }" :label="`Parte ${i + 1}`">
                    <KmNumero
                      :id="id"
                      v-model="p.cantidad"
                      :min="0"
                      :decimales="controles(l).serie ? 0 : 3"
                      :controles="false"
                      :sufijo="insumo(l.insumoId) ? etiquetaUnidad[insumo(l.insumoId)!.unidad] : ''"
                      @update:model-value="ajustarSeries(l)"
                    />
                  </KmField>
                </div>
                <div v-if="controles(l).lote" class="min-w-44 flex-1">
                  <KmField v-slot="{ id }" label="Lote" requerido>
                    <KmInput :id="id" v-model="p.loteCodigo" placeholder="Código del lote" />
                  </KmField>
                </div>
                <div v-if="controles(l).vencimiento" class="w-44">
                  <KmField v-slot="{ id }" label="Vence" requerido>
                    <KmFecha :id="id" v-model="p.vencimiento" />
                  </KmField>
                </div>
                <div v-if="controles(l).ubicacion" class="min-w-52 flex-1">
                  <KmField v-slot="{ id }" label="Ubicación" requerido>
                    <KmSelect
                      :id="id"
                      :model-value="p.ubicacionId ?? ''"
                      :opciones="opcionesUbicacion(zonaId)"
                      @update:model-value="p.ubicacionId = ($event as string) || undefined"
                    />
                  </KmField>
                </div>
                <KmBotonIcono
                  v-if="l.partes.length > 1"
                  icono="eliminar"
                  tono="peligro"
                  etiqueta="Quitar parte"
                  @click="quitarParte(l, i)"
                />
              </div>

              <div v-if="controles(l).serie && p.series?.length" class="flex flex-col gap-2">
                <p class="flex items-center gap-1.5 text-xs text-tenue">
                  <KmIcono nombre="serie" tamano="xs" />
                  Una serie por unidad ·
                  <strong class="text-tinta tabular-nums">
                    {{ p.series.filter((s) => s.trim()).length }} de {{ p.series.length }}
                  </strong>
                  · Enter pasa a la siguiente
                </p>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  <label
                    v-for="(_, n) in p.series"
                    :key="n"
                    class="flex items-center gap-2 rounded-control border bg-panel px-2"
                    :class="p.series[n]?.trim() ? 'border-verde/60' : 'border-linea'"
                  >
                    <span class="w-5 text-right text-xs text-tenue tabular-nums">{{ n + 1 }}</span>
                    <input
                      v-model="p.series[n]"
                      data-serie
                      class="h-9 min-w-0 flex-1 bg-transparent text-sm text-tinta outline-none"
                      :aria-label="`Serie ${n + 1}`"
                      placeholder="Serie"
                      @keydown.enter.prevent="siguienteSerie"
                    />
                    <KmIcono
                      v-if="p.series[n]?.trim()"
                      nombre="check"
                      tamano="xs"
                      class="text-verde"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div
              v-if="divisible(l)"
              class="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-3 text-xs"
            >
              <KmButton tamano="sm" variante="fantasma" @click="agregarParte(l)">
                <KmIcono nombre="dividir" />
                Repartir en otro {{ controles(l).lote ? 'lote' : 'ubicación' }}
              </KmButton>
              <span
                v-if="l.partes.length > 1"
                class="inline-flex items-center gap-1 tabular-nums"
                :class="
                  Math.abs(sumaPartes(l) - totalLinea(l)) > 0.0005 ? 'text-vino' : 'text-verde'
                "
              >
                <KmIcono
                  :nombre="Math.abs(sumaPartes(l) - totalLinea(l)) > 0.0005 ? 'alerta' : 'check'"
                  tamano="xs"
                />
                Partes: {{ sumaPartes(l) }} de {{ totalLinea(l) }}
                {{ insumo(l.insumoId) ? etiquetaUnidad[insumo(l.insumoId)!.unidad] : '' }}
              </span>
            </div>
          </div>

          <p
            v-if="avisosLinea(l).length"
            class="flex items-center gap-1.5 text-xs text-laton-texto"
          >
            <KmIcono nombre="alerta" tamano="xs" />
            {{ avisosLinea(l).join(' · ') }}
          </p>
        </article>
      </div>
      <template #footer>
        <p class="mr-auto text-sm text-tenue">
          Entra por
          <strong class="text-tinta tabular-nums">{{ formatearSoles(resumen.costo) }}</strong>
          <template v-if="modo === 'detalle' && resumen.conFaltante">
            · {{ resumen.conFaltante }}
            {{ resumen.conFaltante === 1 ? 'línea queda' : 'líneas quedan' }} con saldo
          </template>
        </p>
        <KmButton variante="secundario" @click="recibirAbierto = false">Cancelar</KmButton>
        <KmButton
          v-if="modo === 'total'"
          variante="peligro"
          @click="
            () => {
              motivoRechazo = ''
              rechazoAbierto = true
            }
          "
        >
          <KmIcono nombre="rechazo" /> Rechazar entrega
        </KmButton>
        <KmButton
          :cargando="guardando"
          :disabled="!zonaId || resumen.nada"
          @click="registrarRecepcion"
        >
          <KmIcono nombre="check" />
          {{ modo === 'total' ? 'Recibir todo' : 'Registrar lo contado' }}
        </KmButton>
      </template>
    </KmDrawer>

    <KmModal v-model="rechazoAbierto" titulo="Rechazar la entrega" ancho="sm">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-tenue">
          En una recepción total es todo o nada: no entra ninguna línea y la OC sigue pendiente para
          una nueva entrega.
        </p>
        <KmField v-slot="{ id }" label="Motivo" requerido>
          <KmInput
            :id="id"
            v-model="motivoRechazo"
            placeholder="Por ejemplo: un balón llegó con la válvula dañada"
          />
        </KmField>
        <div class="flex justify-end gap-2">
          <KmButton variante="secundario" @click="rechazoAbierto = false">Volver</KmButton>
          <KmButton
            variante="peligro"
            :cargando="guardando"
            :disabled="!motivoRechazo.trim()"
            @click="rechazarEntrega"
          >
            Rechazar entrega
          </KmButton>
        </div>
      </div>
    </KmModal>

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
