<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import KmUploadImagen from '@/components/ui/KmUploadImagen.vue'
import { cartaService } from '@/services/carta.service'
import { useAuthStore } from '@/stores/auth.store'
import { useCatalogos } from '@/composables/useCatalogos'
import { canalesService } from '@/services/comercial.service'
import { inventarioService } from '@/services/inventario.service'
import { valorConfig } from '@/services/parametros.service'
import { preciosService } from '@/services/precios.service'
import {
  alergenosDe,
  costoCombo,
  faltantesAprobacion,
  costoReceta,
  impactoInsumo,
  precioParaObjetivo,
  recetasService,
  simularPrecioAceptado,
  unidadesCompatibles,
  versionVigente,
} from '@/services/recetas.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  CanalVenta,
  ClaseAbc,
  EfectoModificador,
  FichaTecnica,
  Producto,
  CostoReceta,
  EstadoCosto,
  Insumo,
  LineaReceta,
  ProductoVendible,
  RecetaEstandar,
  VersionReceta,
} from '@/types'
import type { OpcionSelect, Pestana, TonoMesa } from '@/types/ui'
import { etiquetaAlergeno, formatearFecha, formatearSoles } from '@/utils/formato'

/**
 * Recetas y costos (D-007). La receta vive en el producto vendible, tiene
 * versiones con vigencia y se costea en valores netos contra la lista de
 * precios vigente del local y canal elegidos.
 */

const ui = useUiStore()
const localStore = useLocalStore()
const { locales, recargar: recargarLocales } = useCatalogos(['locales'])

const vendibles = shallowRef<ProductoVendible[]>([])
const recetas = shallowRef<RecetaEstandar[]>([])
const insumos = shallowRef<Insumo[]>([])
const canales = shallowRef<CanalVenta[]>([])
const productos = shallowRef<Producto[]>([])
const auth = useAuthStore()
const { cargando, iniciar, terminar } = useCarga()
const canalId = ref('cv1')
const hoy = new Date().toISOString().slice(0, 10)

async function cargar() {
  iniciar()
  try {
    ;[vendibles.value, recetas.value, insumos.value, canales.value, productos.value] =
      await Promise.all([
        preciosService.vendibles(),
        recetasService.listar(),
        inventarioService.listarInsumos(),
        canalesService.todos(),
        cartaService.listarProductos(),
        recargarLocales(),
      ])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar las recetas.')
  } finally {
    terminar()
  }
}
watch(() => localStore.localId, cargar, { immediate: true })

const localId = computed(() => localStore.localId ?? locales.value[0]?.id ?? 'l1')
const opciones = computed(() => ({ localId: localId.value, canalId: canalId.value }))
const opcionesCanal = computed<OpcionSelect[]>(() =>
  canales.value.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
)
const insumoPor = (id: string) => insumos.value.find((i) => i.id === id)

const pestana = ref<'recetas' | 'combos' | 'aumento'>('recetas')

// ── Recetas ──

const estadoInfo: Record<EstadoCosto, { etiqueta: string; tono: TonoMesa }> = {
  completo: { etiqueta: 'Completo', tono: 'verde' },
  parcial: { etiqueta: 'Parcial', tono: 'vino' },
  desactualizado: { etiqueta: 'Desactualizado', tono: 'laton' },
  sinReceta: { etiqueta: 'Sin receta', tono: 'neutro' },
}
const tonoFoodCost = (c: CostoReceta): TonoMesa =>
  c.foodCost === null
    ? 'neutro'
    : c.foodCost <= c.objetivo
      ? 'verde'
      : c.foodCost <= c.objetivo + 5
        ? 'laton'
        : 'vino'

const busqueda = ref('')
const filtro = ref('')
const filas = computed(() => {
  // Recalcula al recargar.
  void recetas.value
  void insumos.value
  const t = busqueda.value.trim().toLowerCase()
  return vendibles.value
    .filter((v) => v.tipo === 'producto' || v.tipo === 'presentacion')
    .map((v) => ({ id: v.id, vendible: v, costo: costoReceta(v.id, opciones.value) }))
    .filter((f) => !t || f.vendible.nombre.toLowerCase().includes(t))
    .filter((f) =>
      !filtro.value
        ? true
        : filtro.value === 'sobre'
          ? f.costo.foodCost !== null && f.costo.foodCost > f.costo.objetivo
          : f.costo.estado === filtro.value,
    )
})
const opcionesFiltro: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'sobre', etiqueta: 'Sobre su objetivo' },
  { valor: 'sinReceta', etiqueta: 'Sin receta' },
  { valor: 'parcial', etiqueta: 'Costo parcial' },
  { valor: 'desactualizado', etiqueta: 'Costo desactualizado' },
]

const resumen = computed(() => {
  const todas = vendibles.value
    .filter((v) => v.tipo === 'producto' || v.tipo === 'presentacion')
    .map((v) => costoReceta(v.id, opciones.value))
  const con = todas.filter((c) => c.foodCost !== null)
  return {
    total: todas.length,
    conReceta: todas.filter((c) => c.estado !== 'sinReceta').length,
    promedio: con.length ? con.reduce((s, c) => s + c.foodCost!, 0) / con.length : 0,
    sobre: con.filter((c) => c.foodCost! > c.objetivo).length,
    revisar: todas.filter((c) => c.estado === 'parcial' || c.estado === 'desactualizado').length,
  }
})

// ── Editor ──

const abierto = ref(false)
const editando = shallowRef<ProductoVendible | null>(null)
const lineas = ref<LineaReceta[]>([])
const vigenteDesde = ref<string | null>(hoy)
const nota = ref('')
const objetivoPropio = ref<number | null>(null)
const guardando = ref(false)
const versionBase = ref<string | null>(null)
let secuencia = 0

const recetaEditando = computed(() =>
  recetas.value.find((r) => r.vendibleId === editando.value?.id),
)
const versiones = computed(() =>
  [...(recetaEditando.value?.versiones ?? [])].sort((a, b) => b.numero - a.numero),
)
const vigente = computed(() => versionVigente(recetaEditando.value))
const conAprobacion = computed(() => valorConfig<boolean>('recetas.aprobacion'))
const conFicha = computed(() => valorConfig<boolean>('recetas.fichaTecnica'))
const estadoVersion = (v: VersionReceta) =>
  conAprobacion.value && v.estado === 'borrador'
    ? 'Borrador'
    : v.vigenteDesde > hoy
      ? 'Programada'
      : v.id === vigente.value?.id
        ? 'Vigente'
        : 'Histórica'
const tonoEstadoVersion: Record<string, TonoMesa> = {
  Borrador: 'vino',
  Programada: 'laton',
  Vigente: 'verde',
  Histórica: 'neutro',
}
const ficha = ref<FichaTecnica>({ pasos: [] })
const faltanParaAprobar = computed(() => {
  const v = versiones.value.find((x) => x.id === versionBase.value)
  return v?.estado === 'borrador' ? faltantesAprobacion(v) : []
})

async function aprobar(v: VersionReceta) {
  if (!editando.value || !auth.usuario) return
  try {
    await recetasService.aprobarVersion(editando.value.id, v.id, auth.usuario.id)
    ui.exito(`Versión ${v.numero} aprobada.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo aprobar.')
  }
}

// Reventa
const esReventa = computed(() => !!recetaEditando.value?.reventaInsumoId)
const reventaInsumo = ref('')
const opcionesReventa = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'No es reventa' },
  ...insumos.value
    .filter((i) => i.activo && i.abastecimiento !== 'transformacion')
    .map((i) => ({ valor: i.id, etiqueta: i.nombre })),
])
async function guardarReventa() {
  if (!editando.value) return
  try {
    await recetasService.fijarReventa(editando.value.id, reventaInsumo.value || undefined)
    ui.exito(reventaInsumo.value ? 'Marcado como reventa con receta 1:1.' : 'Ya no es reventa.')
    await cargar()
    cargarVersion(vigente.value ?? versiones.value[0])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar la reventa.')
  }
}

// Alérgenos
const productoEditando = computed(() =>
  productos.value.find((p) => p.id === editando.value?.productoId),
)
const alergenosReceta = computed(() =>
  editando.value ? alergenosDe(editando.value.id, validas.value) : [],
)
const alergenosSinDeclarar = computed(() =>
  alergenosReceta.value.filter((a) => !productoEditando.value?.alergenos.includes(a)),
)

// Modificadores y notas rápidas
const modificadoresProducto = computed(() =>
  (productoEditando.value?.gruposModificadores ?? []).flatMap((g) => g.modificadores),
)
const efectosEdit = ref<Record<string, EfectoModificador[]>>({})
const notasEdit = ref('')
const guardandoModificadores = ref(false)
const opcionesEfecto: OpcionSelect[] = [
  { valor: 'suma', etiqueta: 'Suma' },
  { valor: 'quita', etiqueta: 'Quita' },
]
function cargarModificadores() {
  efectosEdit.value = Object.fromEntries(
    modificadoresProducto.value.map((m) => [m.id, JSON.parse(JSON.stringify(m.efectos ?? []))]),
  )
  notasEdit.value = (productoEditando.value?.notasRapidas ?? []).join(', ')
}
function agregarEfecto(modId: string) {
  efectosEdit.value[modId] = [
    ...(efectosEdit.value[modId] ?? []),
    { insumoId: '', cantidad: 0, unidad: 'g', efecto: 'suma' },
  ]
}
async function guardarModificadores() {
  if (!productoEditando.value) return
  guardandoModificadores.value = true
  try {
    await recetasService.guardarModificadores(
      productoEditando.value.id,
      efectosEdit.value,
      notasEdit.value.split(','),
    )
    ui.exito('Modificadores y notas guardados.')
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron guardar los modificadores.')
  } finally {
    guardandoModificadores.value = false
  }
}

const brutaNeta = computed(() => valorConfig<boolean>('recetas.cantidadBrutaNeta', localId.value))

function cargarVersion(v?: VersionReceta) {
  versionBase.value = v?.id ?? null
  lineas.value = v ? JSON.parse(JSON.stringify(v.lineas)) : []
  nota.value = ''
  ficha.value = v?.ficha ? JSON.parse(JSON.stringify(v.ficha)) : { pasos: [] }
  vigenteDesde.value = v && v.vigenteDesde > hoy ? v.vigenteDesde : hoy
  if (!lineas.value.length) agregar('ingrediente')
}

function editar(v: ProductoVendible) {
  editando.value = v
  objetivoPropio.value = recetas.value.find((r) => r.vendibleId === v.id)?.foodCostObjetivo ?? null
  cargarVersion(versionVigente(recetas.value.find((r) => r.vendibleId === v.id)))
  copiaOrigen.value = ''
  reventaInsumo.value = recetas.value.find((r) => r.vendibleId === v.id)?.reventaInsumoId ?? ''
  cargarModificadores()
  abierto.value = true
}

function agregar(tipo: LineaReceta['tipo']) {
  lineas.value.push({ id: `nuevo-${++secuencia}`, tipo, insumoId: '', cantidad: 0, unidad: 'g' })
}

function elegirInsumo(l: Pick<LineaReceta, 'insumoId' | 'unidad'>, insumoId: string) {
  l.insumoId = insumoId
  const insumo = insumoPor(insumoId)
  if (insumo && !unidadesCompatibles(insumo.unidad).includes(l.unidad)) l.unidad = insumo.unidad
}

const opcionesInsumo = computed<OpcionSelect[]>(() =>
  insumos.value.filter((i) => i.activo).map((i) => ({ valor: i.id, etiqueta: i.nombre })),
)
const opcionesUnidad = (l: Pick<LineaReceta, 'insumoId' | 'unidad'>): OpcionSelect[] => {
  const insumo = insumoPor(l.insumoId)
  return (insumo ? unidadesCompatibles(insumo.unidad) : [l.unidad]).map((u) => ({
    valor: u,
    etiqueta: u,
  }))
}
const opcionesCantidad: OpcionSelect[] = [
  { valor: 'bruta', etiqueta: 'Bruta' },
  { valor: 'neta', etiqueta: 'Neta' },
]
const opcionesCanalConsumible = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los canales' },
  ...opcionesCanal.value,
])

const validas = computed(() => lineas.value.filter((l) => l.insumoId && Number(l.cantidad) > 0))
const simulado = computed(() =>
  editando.value
    ? costoReceta(editando.value.id, { ...opciones.value, lineas: validas.value })
    : null,
)
const costoLinea = (id: string) => simulado.value?.lineas.find((c) => c.lineaId === id)
const tonoClase: Record<ClaseAbc, TonoMesa> = { A: 'vino', B: 'laton', C: 'neutro' }

// Simulador: no cambia nada.
const precioAceptado = ref<number | null>(null)
const objetivoEfectivo = computed(() => objetivoPropio.value ?? simulado.value?.objetivo ?? 30)
const sugerido = computed(() =>
  simulado.value
    ? precioParaObjetivo(simulado.value.costoIngredientes, objetivoEfectivo.value)
    : null,
)
const conAceptado = computed(() =>
  simulado.value && precioAceptado.value
    ? simularPrecioAceptado(precioAceptado.value, simulado.value, canalId.value)
    : null,
)

async function guardar() {
  if (!editando.value) return
  guardando.value = true
  try {
    await recetasService.guardarVersion(editando.value.id, {
      lineas: validas.value,
      vigenteDesde: vigenteDesde.value ?? hoy,
      nota: nota.value,
      ficha: conFicha.value
        ? ficha.value
        : versiones.value.find((x) => x.id === versionBase.value)?.ficha,
    })
    const anterior = recetaEditando.value?.foodCostObjetivo ?? null
    if (objetivoPropio.value !== anterior)
      await recetasService.fijarObjetivo(editando.value.id, objetivoPropio.value ?? undefined)
    ui.exito(`Receta de ${editando.value.nombre} guardada.`)
    abierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar la receta.')
  } finally {
    guardando.value = false
  }
}

async function eliminarVersion(v: VersionReceta) {
  if (!editando.value) return
  try {
    await recetasService.eliminarVersion(editando.value.id, v.id)
    ui.exito(`Versión ${v.numero} eliminada.`)
    await cargar()
    cargarVersion(vigente.value)
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar la versión.')
  }
}

// Copiar de otra presentación
const copiaOrigen = ref('')
const copiaFactor = ref<number | null>(1)
const opcionesOrigen = computed<OpcionSelect[]>(() =>
  recetas.value
    .filter((r) => r.vendibleId !== editando.value?.id && versionVigente(r))
    .map((r) => ({
      valor: r.vendibleId,
      etiqueta: vendibles.value.find((v) => v.id === r.vendibleId)?.nombre ?? r.vendibleId,
    })),
)
async function copiar() {
  if (!editando.value || !copiaOrigen.value) return
  try {
    await recetasService.copiarDe(copiaOrigen.value, editando.value.id, copiaFactor.value ?? 1)
    ui.exito('Receta copiada como versión nueva.')
    await cargar()
    cargarVersion(vigente.value ?? versiones.value[0])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo copiar.')
  }
}

// ── Combos ──

const combos = computed(() => {
  void recetas.value
  return vendibles.value
    .filter((v) => v.tipo === 'combo')
    .map((v) => ({ vendible: v, costo: costoCombo(v.id.slice(2), opciones.value) }))
})

// ── Aumento de costo ──

const aumentoInsumo = ref('i2')
const aumentoPorcentaje = ref<number | null>(10)
const impacto = computed(() => {
  void recetas.value
  return aumentoInsumo.value
    ? impactoInsumo(aumentoInsumo.value, aumentoPorcentaje.value ?? 0, opciones.value)
    : []
})

const pestanas = computed<Pestana[]>(() => [
  { valor: 'recetas', etiqueta: 'Recetas', contador: resumen.value.revisar || undefined },
  { valor: 'combos', etiqueta: 'Combos' },
  { valor: 'aumento', etiqueta: 'Si sube un insumo' },
])
const pct = (n: number | null) => (n === null ? '—' : `${n.toFixed(1)} %`)
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Con receta</p>
        <p class="rs-cifra mt-2 text-tinta">
          {{ resumen.conReceta }}<span class="text-lg text-tenue"> / {{ resumen.total }}</span>
        </p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Food cost promedio</p>
        <p class="rs-cifra mt-2 text-tinta">{{ resumen.promedio.toFixed(1) }} %</p>
        <p class="mt-1 text-xs text-tenue">Sobre precio neto, sin IGV</p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Sobre su objetivo</p>
        <p class="rs-cifra mt-2" :class="resumen.sobre ? 'text-vino' : 'text-tinta'">
          {{ resumen.sobre }}
        </p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Costo por revisar</p>
        <p class="rs-cifra mt-2" :class="resumen.revisar ? 'text-laton-texto' : 'text-tinta'">
          {{ resumen.revisar }}
        </p>
        <p class="mt-1 text-xs text-tenue">Parcial o desactualizado</p>
      </div>
    </div>

    <KmCard sin-padding>
      <div class="flex flex-wrap items-end justify-between gap-3 px-6 pt-5">
        <div>
          <h2 class="rs-titulo-seccion text-tinta">Recetas y costos</h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            Costos con el precio de la lista vigente en
            {{ locales.find((l) => l.id === localId)?.nombre ?? 'el local' }}. El margen de
            contribución descuenta ingredientes, consumibles y comisión del canal.
          </p>
        </div>
        <div class="w-52">
          <KmField v-slot="{ id }" label="Canal">
            <KmSelect :id="id" v-model="canalId" :opciones="opcionesCanal" />
          </KmField>
        </div>
      </div>

      <div class="px-6 pt-4 pb-6">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Recetas">
          <template v-if="pestana === 'recetas'">
            <div class="mb-3 flex flex-wrap items-center gap-3">
              <div class="w-full max-w-xs">
                <KmBusqueda v-model="busqueda" placeholder="Buscar" />
              </div>
              <div class="w-56">
                <KmSelect v-model="filtro" :opciones="opcionesFiltro" etiqueta="Filtrar recetas" />
              </div>
            </div>
            <div class="overflow-x-auto rounded-card border border-linea">
              <table class="w-full min-w-[920px] text-sm">
                <thead>
                  <tr class="border-b border-linea text-left text-xs text-tenue">
                    <th class="px-4 py-2.5 font-medium">Vendible</th>
                    <th class="px-3 py-2.5 text-right font-medium">Precio neto</th>
                    <th class="px-3 py-2.5 text-right font-medium">Costo</th>
                    <th class="px-3 py-2.5 text-right font-medium">Food cost</th>
                    <th class="px-3 py-2.5 text-right font-medium">Margen de contribución</th>
                    <th class="px-3 py-2.5 font-medium">Costo</th>
                    <th class="w-14 px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="cargando">
                    <td colspan="7" class="px-4 py-6 text-center text-tenue">Cargando…</td>
                  </tr>
                  <tr
                    v-for="f in filas"
                    v-else
                    :key="f.id"
                    class="border-b border-linea last:border-0"
                  >
                    <td class="px-4 py-2.5">
                      <p class="font-medium text-tinta">{{ f.vendible.nombre }}</p>
                      <p class="text-xs text-tenue tabular-nums">
                        {{ f.vendible.codigo }}
                        <template v-if="f.costo.version"> · versión {{ f.costo.version }}</template>
                      </p>
                    </td>
                    <td class="px-3 py-2.5 text-right tabular-nums">
                      {{ formatearSoles(f.costo.precioNeto) }}
                    </td>
                    <td class="px-3 py-2.5 text-right tabular-nums">
                      {{
                        f.costo.estado === 'sinReceta'
                          ? '—'
                          : formatearSoles(f.costo.costoIngredientes)
                      }}
                    </td>
                    <td class="px-3 py-2.5 text-right">
                      <KmBadge v-if="f.costo.foodCost !== null" :tono="tonoFoodCost(f.costo)" punto>
                        {{ pct(f.costo.foodCost) }}
                      </KmBadge>
                      <span v-else class="text-tenue">—</span>
                      <p class="mt-0.5 text-[11px] text-tenue">objetivo {{ f.costo.objetivo }} %</p>
                    </td>
                    <td class="px-3 py-2.5 text-right font-medium tabular-nums">
                      {{
                        f.costo.estado === 'sinReceta'
                          ? '—'
                          : formatearSoles(f.costo.margenContribucion)
                      }}
                    </td>
                    <td class="px-3 py-2.5">
                      <KmBadge :tono="estadoInfo[f.costo.estado].tono">
                        {{ estadoInfo[f.costo.estado].etiqueta }}
                      </KmBadge>
                    </td>
                    <td class="px-4 py-2.5 text-right">
                      <KmBotonIcono
                        icono="editar"
                        etiqueta="Editar receta"
                        :contexto="f.vendible.nombre"
                        @click="editar(f.vendible)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <div
            v-else-if="pestana === 'combos'"
            class="overflow-x-auto rounded-card border border-linea"
          >
            <table class="w-full min-w-[760px] text-sm">
              <thead>
                <tr class="border-b border-linea text-left text-xs text-tenue">
                  <th class="px-4 py-2.5 font-medium">Combo</th>
                  <th class="px-3 py-2.5 font-medium">Componentes (opción más cara)</th>
                  <th class="px-3 py-2.5 text-right font-medium">Precio neto</th>
                  <th class="px-3 py-2.5 text-right font-medium">Costo</th>
                  <th class="px-4 py-2.5 text-right font-medium">Food cost</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in combos"
                  :key="c.vendible.id"
                  class="border-b border-linea last:border-0"
                >
                  <td class="px-4 py-2.5">
                    <p class="font-medium text-tinta">{{ c.vendible.nombre }}</p>
                    <KmBadge v-if="c.costo && !c.costo.completo" tono="laton"
                      >Costo parcial</KmBadge
                    >
                  </td>
                  <td class="px-3 py-2.5 text-xs text-tenue">
                    <p v-for="g in c.costo?.grupos ?? []" :key="g.nombre">
                      {{ g.nombre }}: {{ g.opcion }} · {{ formatearSoles(g.costo) }}
                    </p>
                  </td>
                  <td class="px-3 py-2.5 text-right tabular-nums">
                    {{ formatearSoles(c.costo?.precioNeto ?? 0) }}
                  </td>
                  <td class="px-3 py-2.5 text-right tabular-nums">
                    {{ formatearSoles(c.costo?.costo ?? 0) }}
                  </td>
                  <td class="px-4 py-2.5 text-right font-medium tabular-nums">
                    {{ pct(c.costo?.foodCost ?? null) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="flex flex-col gap-4">
            <div class="flex flex-wrap items-end gap-4">
              <div class="w-72">
                <KmField v-slot="{ id }" label="Insumo">
                  <KmSelect :id="id" v-model="aumentoInsumo" :opciones="opcionesInsumo" />
                </KmField>
              </div>
              <div class="w-40">
                <KmField v-slot="{ id }" label="Variación del costo">
                  <KmNumero :id="id" v-model="aumentoPorcentaje" :decimales="1" sufijo="%" />
                </KmField>
              </div>
              <p class="pb-2 text-xs text-tenue">Simulación: no cambia costos ni recetas.</p>
            </div>
            <div class="overflow-x-auto rounded-card border border-linea">
              <table class="w-full min-w-[680px] text-sm">
                <thead>
                  <tr class="border-b border-linea text-left text-xs text-tenue">
                    <th class="px-4 py-2.5 font-medium">Receta afectada</th>
                    <th class="px-3 py-2.5 text-right font-medium">Costo hoy</th>
                    <th class="px-3 py-2.5 text-right font-medium">Costo simulado</th>
                    <th class="px-3 py-2.5 text-right font-medium">Food cost hoy</th>
                    <th class="px-4 py-2.5 text-right font-medium">Food cost simulado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in impacto"
                    :key="r.vendibleId"
                    class="border-b border-linea last:border-0"
                  >
                    <td class="px-4 py-2.5 text-tinta">{{ r.nombre }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">
                      {{ formatearSoles(r.costoAntes) }}
                    </td>
                    <td class="px-3 py-2.5 text-right tabular-nums">
                      {{ formatearSoles(r.costoDespues) }}
                    </td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ pct(r.foodCostAntes) }}</td>
                    <td class="px-4 py-2.5 text-right">
                      <KmBadge
                        :tono="(r.foodCostDespues ?? 0) > r.objetivo ? 'vino' : 'verde'"
                        punto
                      >
                        {{ pct(r.foodCostDespues) }}
                      </KmBadge>
                    </td>
                  </tr>
                  <tr v-if="!impacto.length">
                    <td colspan="5" class="px-4 py-6 text-center text-tenue">
                      Ninguna receta vigente usa este insumo.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </KmTabs>
      </div>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? `Receta · ${editando.nombre}` : 'Receta'"
      subtitulo="Cantidades por porción servida. Cada guardado crea una versión."
      ancho="xl"
    >
      <div v-if="editando && simulado" class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div class="flex flex-col gap-5">
          <div class="flex flex-wrap items-end gap-3 rounded-card border border-linea px-4 py-3">
            <div class="min-w-56 flex-1">
              <KmField
                v-slot="{ id }"
                label="Reventa"
                ayuda="Se vende tal como se compra (gaseosa, cerveza): la receta es 1 unidad del insumo y se crea sola."
              >
                <KmSelect
                  :id="id"
                  v-model="reventaInsumo"
                  :opciones="opcionesReventa"
                  placeholder="No es reventa"
                />
              </KmField>
            </div>
            <KmButton
              variante="secundario"
              :disabled="reventaInsumo === (recetaEditando?.reventaInsumoId ?? '')"
              @click="guardarReventa"
            >
              {{ reventaInsumo ? 'Marcar como reventa' : 'Quitar reventa' }}
            </KmButton>
          </div>

          <div v-if="versiones.length" class="flex flex-wrap gap-2">
            <div
              v-for="v in versiones"
              :key="v.id"
              class="flex items-center gap-2 rounded-control border px-2 py-1 text-xs"
              :class="versionBase === v.id ? 'border-verde bg-seleccion' : 'border-linea'"
            >
              <button
                type="button"
                class="flex items-center gap-2 px-1 py-0.5 text-left"
                :title="v.nota"
                @click="cargarVersion(v)"
              >
                <span class="font-semibold text-tinta">v{{ v.numero }}</span>
                <span class="text-tenue">desde {{ formatearFecha(v.vigenteDesde) }}</span>
                <KmBadge :tono="tonoEstadoVersion[estadoVersion(v)]">
                  {{ estadoVersion(v) }}
                </KmBadge>
              </button>
              <button
                v-if="estadoVersion(v) === 'Borrador' && conAprobacion"
                type="button"
                class="font-semibold text-verde underline"
                @click="aprobar(v)"
              >
                Aprobar
              </button>
              <button
                v-if="estadoVersion(v) === 'Programada' || estadoVersion(v) === 'Borrador'"
                type="button"
                class="text-vino underline"
                @click="eliminarVersion(v)"
              >
                Eliminar
              </button>
            </div>
          </div>
          <p
            v-if="conAprobacion && faltanParaAprobar.length"
            class="rs-tono rs-tono-laton rounded-control border px-3 py-2 text-xs"
          >
            Para aprobar esta receta: {{ faltanParaAprobar.join(' ') }}
          </p>

          <p
            v-if="esReventa"
            class="rounded-card border border-dashed border-linea px-4 py-3 text-sm text-tenue"
          >
            Receta 1:1 automática: cada venta descuenta una unidad de
            <strong class="text-tinta">{{
              insumoPor(recetaEditando!.reventaInsumoId!)?.nombre
            }}</strong
            >.
          </p>

          <template v-if="!esReventa">
            <div class="overflow-x-auto rounded-card border border-linea">
              <table class="w-full min-w-[760px] text-sm">
                <thead>
                  <tr class="border-b border-linea text-left text-xs text-tenue">
                    <th class="px-3 py-2 font-medium">Insumo</th>
                    <th class="w-28 px-2 py-2 font-medium">Cantidad</th>
                    <th class="w-24 px-2 py-2 font-medium">Unidad</th>
                    <th v-if="brutaNeta" class="w-24 px-2 py-2 font-medium">Tipo</th>
                    <th class="w-24 px-2 py-2 text-right font-medium">Costo</th>
                    <th class="w-24 px-2 py-2 text-right font-medium">Peso</th>
                    <th class="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(l, i) in lineas"
                    :key="l.id"
                    class="border-b border-linea last:border-0"
                  >
                    <td class="px-3 py-1.5">
                      <p
                        v-if="l.tipo === 'consumible'"
                        class="mb-1 text-[11px] font-semibold text-laton-texto"
                      >
                        Consumible
                      </p>
                      <KmSelect
                        :model-value="l.insumoId"
                        :opciones="opcionesInsumo"
                        placeholder="Elegir insumo"
                        :etiqueta="`Insumo de la línea ${i + 1}`"
                        @update:model-value="elegirInsumo(l, String($event ?? ''))"
                      />
                      <div v-if="l.tipo === 'consumible'" class="mt-1">
                        <KmSelect
                          :model-value="l.canalIds?.[0] ?? ''"
                          :opciones="opcionesCanalConsumible"
                          :etiqueta="`Canal del consumible ${i + 1}`"
                          @update:model-value="l.canalIds = $event ? [String($event)] : []"
                        />
                      </div>
                    </td>
                    <td class="px-2 py-1.5">
                      <KmNumero
                        v-model="l.cantidad"
                        :min="0"
                        :decimales="3"
                        :controles="false"
                        :aria-label="`Cantidad de la línea ${i + 1}`"
                      />
                    </td>
                    <td class="px-2 py-1.5">
                      <KmSelect
                        v-model="l.unidad"
                        :opciones="opcionesUnidad(l)"
                        :etiqueta="`Unidad de la línea ${i + 1}`"
                      />
                    </td>
                    <td v-if="brutaNeta" class="px-2 py-1.5">
                      <KmSelect
                        v-if="l.tipo === 'ingrediente'"
                        :model-value="l.cantidadTipo ?? 'bruta'"
                        :opciones="opcionesCantidad"
                        :etiqueta="`Bruta o neta, línea ${i + 1}`"
                        @update:model-value="l.cantidadTipo = $event as LineaReceta['cantidadTipo']"
                      />
                    </td>
                    <td class="px-2 py-1.5 text-right tabular-nums">
                      {{ costoLinea(l.id) ? formatearSoles(costoLinea(l.id)!.costo) : '—' }}
                    </td>
                    <td class="px-2 py-1.5 text-right">
                      <span v-if="costoLinea(l.id)?.clase" class="inline-flex items-center gap-1">
                        <span class="text-xs tabular-nums text-tenue">
                          {{ costoLinea(l.id)!.participacion.toFixed(0) }} %
                        </span>
                        <KmBadge :tono="tonoClase[costoLinea(l.id)!.clase!]">
                          {{ costoLinea(l.id)!.clase }}
                        </KmBadge>
                      </span>
                    </td>
                    <td class="px-2 py-1.5 text-right">
                      <KmBotonIcono
                        icono="eliminar"
                        tono="peligro"
                        etiqueta="Quitar línea"
                        :contexto="insumoPor(l.insumoId)?.nombre ?? `${i + 1}`"
                        @click="lineas.splice(i, 1)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="flex gap-2 border-t border-linea px-3 py-2">
                <KmButton tamano="sm" variante="secundario" @click="agregar('ingrediente')">
                  Agregar ingrediente
                </KmButton>
                <KmButton tamano="sm" variante="fantasma" @click="agregar('consumible')">
                  Agregar consumible
                </KmButton>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <KmField v-slot="{ id }" label="Rige desde" requerido>
                <KmFecha :id="id" v-model="vigenteDesde" :min="hoy" />
              </KmField>
              <KmField v-slot="{ id }" label="Qué cambió">
                <KmInput :id="id" v-model="nota" placeholder="Porción de lomo de 220 g a 200 g" />
              </KmField>
            </div>

            <div
              v-if="opcionesOrigen.length"
              class="flex flex-wrap items-end gap-3 rounded-card border border-dashed border-linea p-3"
            >
              <div class="min-w-56 flex-1">
                <KmField v-slot="{ id }" label="Copiar de otra receta">
                  <KmSelect
                    :id="id"
                    v-model="copiaOrigen"
                    :opciones="opcionesOrigen"
                    placeholder="Elegir"
                  />
                </KmField>
              </div>
              <div class="w-28">
                <KmField v-slot="{ id }" label="Escalar ×">
                  <KmNumero
                    :id="id"
                    v-model="copiaFactor"
                    :min="0"
                    :decimales="2"
                    :controles="false"
                  />
                </KmField>
              </div>
              <KmButton variante="secundario" :disabled="!copiaOrigen" @click="copiar"
                >Copiar</KmButton
              >
            </div>

            <section
              v-if="conFicha"
              class="flex flex-col gap-4 rounded-card border border-linea p-4"
            >
              <p class="rs-etiqueta text-laton-texto">Ficha técnica</p>
              <div class="grid gap-4 sm:grid-cols-3">
                <KmField v-slot="{ id }" label="Porciones que rinde">
                  <KmNumero :id="id" v-model="ficha.porciones" :min="0" :decimales="1" />
                </KmField>
                <KmField v-slot="{ id }" label="Tolerancia de peso">
                  <KmNumero
                    :id="id"
                    v-model="ficha.toleranciaPesoPorcentaje"
                    :min="0"
                    :max="50"
                    :decimales="1"
                    sufijo="%"
                  />
                </KmField>
                <KmField v-slot="{ id }" label="Conservación">
                  <KmInput
                    :id="id"
                    v-model="ficha.conservacion"
                    placeholder="48 h en cámara a 2 °C"
                  />
                </KmField>
              </div>
              <div class="flex flex-col gap-2">
                <p class="text-sm font-medium text-tinta">Pasos</p>
                <div
                  v-for="(p, i) in ficha.pasos"
                  :key="p.id || i"
                  class="grid gap-2 sm:grid-cols-[2rem_1fr_6rem_6rem_9rem_2.5rem]"
                >
                  <span class="pt-2 text-sm text-tenue tabular-nums">{{ i + 1 }}.</span>
                  <KmInput
                    v-model="p.descripcion"
                    :aria-label="`Paso ${i + 1}`"
                    placeholder="Qué se hace"
                  />
                  <KmNumero
                    v-model="p.tiempoMin"
                    :min="0"
                    sufijo="min"
                    :controles="false"
                    :aria-label="`Tiempo del paso ${i + 1}`"
                  />
                  <KmNumero
                    v-model="p.temperaturaC"
                    sufijo="°C"
                    :controles="false"
                    :aria-label="`Temperatura del paso ${i + 1}`"
                  />
                  <KmInput
                    v-model="p.equipo"
                    :aria-label="`Equipo del paso ${i + 1}`"
                    placeholder="Equipo"
                  />
                  <KmBotonIcono
                    icono="eliminar"
                    tono="peligro"
                    etiqueta="Quitar paso"
                    :contexto="`${i + 1}`"
                    @click="ficha.pasos.splice(i, 1)"
                  />
                </div>
                <div>
                  <KmButton
                    tamano="sm"
                    variante="secundario"
                    @click="ficha.pasos.push({ id: '', descripcion: '' })"
                  >
                    Agregar paso
                  </KmButton>
                </div>
              </div>
              <KmField label="Foto de emplatado">
                <KmUploadImagen
                  v-model="ficha.fotoEmplatado"
                  etiqueta="Foto de emplatado"
                  @error="ui.error($event)"
                />
              </KmField>
            </section>
          </template>

          <section
            v-if="productoEditando"
            class="flex flex-col gap-3 rounded-card border border-linea p-4"
          >
            <div>
              <p class="rs-etiqueta text-laton-texto">
                Modificadores y notas de {{ productoEditando.nombre }}
              </p>
              <p class="mt-1 text-xs text-tenue">
                Un modificador que suma o quita insumos cambia el consumo; una nota rápida solo
                informa a cocina.
              </p>
            </div>
            <div
              v-for="m in modificadoresProducto"
              :key="m.id"
              class="flex flex-col gap-2 border-t border-linea pt-2"
            >
              <p class="text-sm text-tinta">
                {{ m.nombre }}
                <span v-if="m.recargo" class="text-xs text-tenue"
                  >· adicional {{ formatearSoles(m.recargo) }}</span
                >
              </p>
              <div
                v-for="(e, i) in efectosEdit[m.id] ?? []"
                :key="i"
                class="grid gap-2 sm:grid-cols-[7rem_1fr_6rem_5rem_2.5rem]"
              >
                <KmSelect
                  v-model="e.efecto"
                  :opciones="opcionesEfecto"
                  :etiqueta="`Efecto en ${m.nombre}`"
                />
                <KmSelect
                  :model-value="e.insumoId"
                  :opciones="opcionesInsumo"
                  placeholder="Insumo"
                  :etiqueta="`Insumo en ${m.nombre}`"
                  @update:model-value="elegirInsumo(e, String($event ?? ''))"
                />
                <KmNumero
                  v-model="e.cantidad"
                  :min="0"
                  :decimales="3"
                  :controles="false"
                  :aria-label="`Cantidad en ${m.nombre}`"
                />
                <KmSelect
                  v-model="e.unidad"
                  :opciones="opcionesUnidad(e)"
                  :etiqueta="`Unidad en ${m.nombre}`"
                />
                <KmBotonIcono
                  icono="eliminar"
                  tono="peligro"
                  etiqueta="Quitar insumo"
                  :contexto="m.nombre"
                  @click="efectosEdit[m.id]!.splice(i, 1)"
                />
              </div>
              <div>
                <KmButton tamano="sm" variante="fantasma" @click="agregarEfecto(m.id)">
                  Agregar insumo a «{{ m.nombre }}»
                </KmButton>
              </div>
            </div>
            <KmField v-slot="{ id }" label="Notas rápidas" ayuda="Separadas por coma.">
              <KmInput :id="id" v-model="notasEdit" placeholder="Término medio, Poca sal" />
            </KmField>
            <div>
              <KmButton
                variante="secundario"
                :cargando="guardandoModificadores"
                @click="guardarModificadores"
              >
                Guardar modificadores y notas
              </KmButton>
            </div>
          </section>
        </div>

        <aside
          class="flex flex-col gap-4 self-start rounded-card border border-linea bg-panel-2 p-4"
        >
          <div>
            <p class="rs-etiqueta text-tenue">Alérgenos desde sus insumos</p>
            <p class="mt-1 text-sm text-tinta">
              {{
                alergenosReceta.length
                  ? alergenosReceta.map((a) => etiquetaAlergeno[a]).join(', ')
                  : 'Ninguno'
              }}
            </p>
            <p v-if="alergenosSinDeclarar.length" class="mt-1 text-xs font-medium text-vino">
              La carta no declara:
              {{ alergenosSinDeclarar.map((a) => etiquetaAlergeno[a]).join(', ') }}.
            </p>
          </div>
          <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
            <dt class="text-tenue">Precio con IGV</dt>
            <dd class="text-right tabular-nums">{{ formatearSoles(simulado.precioConIgv) }}</dd>
            <dt class="text-tenue">Precio neto</dt>
            <dd class="text-right tabular-nums">{{ formatearSoles(simulado.precioNeto) }}</dd>
            <dt class="text-tenue">Ingredientes</dt>
            <dd class="text-right tabular-nums">
              {{ formatearSoles(simulado.costoIngredientes) }}
            </dd>
            <dt class="text-tenue">Consumibles</dt>
            <dd class="text-right tabular-nums">{{ formatearSoles(simulado.costoConsumibles) }}</dd>
            <dt class="text-tenue">Comisión del canal</dt>
            <dd class="text-right tabular-nums">{{ formatearSoles(simulado.comision) }}</dd>
            <dt class="font-semibold text-tinta">Margen de contribución</dt>
            <dd class="text-right font-semibold tabular-nums">
              {{ formatearSoles(simulado.margenContribucion) }}
            </dd>
            <dt class="font-semibold text-tinta">Food cost</dt>
            <dd class="text-right">
              <KmBadge :tono="tonoFoodCost({ ...simulado, objetivo: objetivoEfectivo })" punto>
                {{ pct(simulado.foodCost) }}
              </KmBadge>
            </dd>
          </dl>

          <KmField
            v-slot="{ id }"
            label="Objetivo propio"
            :ayuda="`Sin valor usa ${simulado.origenObjetivo === 'presentacion' ? 'el de la configuración o la categoría' : `el de la ${simulado.origenObjetivo === 'categoria' ? 'categoría' : 'configuración'}`}: ${simulado.objetivo} %`"
          >
            <KmNumero
              :id="id"
              v-model="objetivoPropio"
              :min="1"
              :max="99"
              :decimales="1"
              sufijo="%"
            />
          </KmField>

          <div class="flex flex-col gap-2 border-t border-linea pt-3">
            <p class="rs-etiqueta text-laton-texto">Simulador de precio</p>
            <p v-if="sugerido" class="text-sm text-tenue">
              Para {{ objetivoEfectivo }} %:
              <strong class="text-tinta tabular-nums">{{ formatearSoles(sugerido.conIgv) }}</strong>
              con IGV ({{ formatearSoles(sugerido.neto) }} neto)
            </p>
            <KmField v-slot="{ id }" label="Precio aceptado, con IGV">
              <KmNumero
                :id="id"
                v-model="precioAceptado"
                :min="0"
                :decimales="2"
                prefijo="S/"
                :controles="false"
              />
            </KmField>
            <p v-if="conAceptado" class="text-sm text-tenue">
              Food cost {{ pct(conAceptado.foodCost) }} · margen
              {{ formatearSoles(conAceptado.margen) }}
            </p>
            <p class="text-xs text-tenue">No cambia el precio: se fija en Listas de precios.</p>
          </div>
        </aside>
      </div>
      <template #footer>
        <KmButton variante="secundario" :disabled="guardando" @click="abierto = false">
          Cancelar
        </KmButton>
        <KmButton v-if="!esReventa" :cargando="guardando" @click="guardar"
          >Guardar versión</KmButton
        >
      </template>
    </KmDrawer>
  </div>
</template>
