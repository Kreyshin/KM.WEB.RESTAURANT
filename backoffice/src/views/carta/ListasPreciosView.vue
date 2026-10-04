<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmModoIntegracion from '@/components/ui/KmModoIntegracion.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { canalesService } from '@/services/comercial.service'
import {
  etiquetaTipoVendible,
  precioDeLista,
  precioVigente,
  preciosService,
  repartoCombo,
} from '@/services/precios.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  CanalVenta,
  DescuentoLinea,
  ListaPrecios,
  NuevaListaPrecios,
  PrecioLista,
  PrecioVigente,
  ProductoVendible,
} from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { hoyLocal } from '@/utils/fechas'
import { formatearDia, formatearSoles } from '@/utils/formato'

/**
 * Listas de precios (D-010). Cada local tiene una lista base por canal y puede
 * tener listas de temporada que la reemplazan en su vigencia. Lo que se vende
 * es el producto vendible: presentaciones, adicionales y combos con código.
 */

const ui = useUiStore()
const localStore = useLocalStore()
const { locales, recargar: recargarLocales } = useCatalogos(['locales'])

const listas = shallowRef<ListaPrecios[]>([])
const vendibles = shallowRef<ProductoVendible[]>([])
const canales = shallowRef<CanalVenta[]>([])
const seleccionada = ref<string | null>(null)

const hoy = hoyLocal()

async function cargar() {
  const [ls, vs, cs] = await Promise.all([
    preciosService.listas(),
    preciosService.vendibles(),
    canalesService.todos(),
    recargarLocales(),
  ])
  listas.value = ls
  vendibles.value = vs
  canales.value = cs
  if (!delLocal.value.some((l) => l.id === seleccionada.value))
    seleccionada.value = delLocal.value[0]?.id ?? null
}
watch(() => localStore.localId, cargar, { immediate: true })

const delLocal = computed(() =>
  listas.value.filter((l) => !localStore.localId || l.localId === localStore.localId),
)
const lista = computed(() => listas.value.find((l) => l.id === seleccionada.value))
const nombreCanal = (id: string) => canales.value.find((c) => c.id === id)?.nombre ?? id
const nombreLocal = (id: string) => locales.value.find((l) => l.id === id)?.nombre ?? id
const nombreLista = (id?: string) => listas.value.find((l) => l.id === id)?.nombre ?? '—'

const vigenciaTexto = (l: ListaPrecios) =>
  l.desde && l.hasta ? `${formatearDia(l.desde)} al ${formatearDia(l.hasta)}` : 'Sin fechas'

/**
 * Estado de la lista dentro del catálogo (D-015). Una con fechas que cubren hoy
 * manda aunque nadie la haya puesto en uso; al pasar su periodo no se borra ni
 * se apaga: vuelve al catálogo como disponible.
 */
function estadoLista(l: ListaPrecios) {
  if (!l.activa) return { texto: 'Fuera del catálogo', tono: 'neutro' as const }
  if (l.desde && l.hasta) {
    if (hoy < l.desde) return { texto: 'Programada', tono: 'laton' as const }
    if (hoy > l.hasta) return { texto: 'Terminada · vuelve al catálogo', tono: 'neutro' as const }
    return { texto: 'En uso por fechas', tono: 'verde' as const }
  }
  return l.enUso
    ? { texto: 'En uso', tono: 'verde' as const }
    : { texto: 'Preparada', tono: 'neutro' as const }
}

/** La lista con fechas vigentes tapa a la elegida a mano, y conviene decirlo. */
function tapadaPorFechas(l: ListaPrecios) {
  if (!l.enUso || (l.desde && l.hasta)) return null
  return (
    listas.value.find(
      (o) =>
        o.id !== l.id &&
        o.activa &&
        o.localId === l.localId &&
        o.canalIds.some((c) => l.canalIds.includes(c)) &&
        o.desde &&
        o.hasta &&
        hoy >= o.desde &&
        hoy <= o.hasta,
    ) ?? null
  )
}

async function ponerEnUso(l: ListaPrecios) {
  try {
    await preciosService.ponerEnUso(l.id)
    ui.exito(`«${l.nombre}» es ahora la lista en uso.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo poner la lista en uso.')
  }
}

// ── Precios de la lista seleccionada ──

const lineas = ref<Record<string, PrecioLista>>({})
watch(
  lista,
  (l) => {
    lineas.value = Object.fromEntries((l?.precios ?? []).map((p) => [p.vendibleId, { ...p }]))
  },
  { immediate: true },
)
const hayCambios = computed(() => {
  const guardadas = lista.value?.precios ?? []
  const actuales = Object.values(lineas.value).filter((p) => p.precio !== undefined || p.descuento)
  if (guardadas.length !== actuales.length) return true
  return guardadas.some((g) => JSON.stringify(g) !== JSON.stringify(lineas.value[g.vendibleId]))
})

function fijarPrecio(vendibleId: string, precio: number | null | undefined) {
  const actual = lineas.value[vendibleId] ?? { vendibleId }
  lineas.value = {
    ...lineas.value,
    [vendibleId]: { ...actual, precio: precio ?? undefined },
  }
}

/** Precio que la lista tomaría sin precio propio: el de su origen o el de la carta. */
function heredado(v: ProductoVendible) {
  const l = lista.value
  if (!l?.derivadaDe) return v.precioReferencia
  const madre = precioDeLista(l.derivadaDe, v.id).precio
  return Math.round(madre * (1 + (l.ajustePorcentaje ?? 0) / 100) * 10) / 10
}

const busqueda = ref('')
const filtroTipo = ref<string>('')
const opcionesTipo: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todo lo vendible' },
  ...Object.entries(etiquetaTipoVendible).map(([valor, etiqueta]) => ({ valor, etiqueta })),
]
const filas = computed(() => {
  const t = busqueda.value.trim().toLowerCase()
  return vendibles.value.filter(
    (v) =>
      (!filtroTipo.value || v.tipo === filtroTipo.value) &&
      (!t || v.nombre.toLowerCase().includes(t) || v.codigo.toLowerCase().includes(t)),
  )
})

const cobraHoy = (v: ProductoVendible) =>
  lista.value && lista.value.canalIds[0]
    ? precioVigente(v.id, lista.value.localId, lista.value.canalIds[0], hoy)
    : null

const guardandoPrecios = ref(false)
async function guardarPrecios() {
  if (!lista.value) return
  guardandoPrecios.value = true
  try {
    const { id, ...resto } = lista.value
    await preciosService.actualizar(id, { ...resto, precios: Object.values(lineas.value) })
    ui.exito(`Precios de «${lista.value.nombre}» guardados.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron guardar los precios.')
  } finally {
    guardandoPrecios.value = false
  }
}

// ── Descuento por línea ──

const modalDescuento = ref(false)
const vendibleDescuento = shallowRef<ProductoVendible | null>(null)
const descuento = ref<{ porcentaje: number | null; desde: string | null; hasta: string | null }>({
  porcentaje: null,
  desde: null,
  hasta: null,
})

function abrirDescuento(v: ProductoVendible) {
  vendibleDescuento.value = v
  const d = lineas.value[v.id]?.descuento
  descuento.value = {
    porcentaje: d?.porcentaje ?? null,
    desde: d?.desde ?? hoy,
    hasta: d?.hasta ?? null,
  }
  modalDescuento.value = true
}

function aplicarDescuento(quitar = false) {
  const v = vendibleDescuento.value
  if (!v) return
  const actual = lineas.value[v.id] ?? { vendibleId: v.id }
  const d = descuento.value
  if (!quitar && (!d.porcentaje || !d.desde || !d.hasta)) {
    ui.error('Indica el porcentaje y la vigencia del descuento.')
    return
  }
  const nuevo: PrecioLista = { ...actual }
  if (quitar) delete nuevo.descuento
  else
    nuevo.descuento = {
      porcentaje: d.porcentaje!,
      desde: d.desde!,
      hasta: d.hasta!,
    } as DescuentoLinea
  lineas.value = { ...lineas.value, [v.id]: nuevo }
  modalDescuento.value = false
}

// ── Editor de lista ──

const abierto = ref(false)
const editando = shallowRef<ListaPrecios | null>(null)
const errores = ref<Record<string, string>>({})
const guardando = ref(false)
const form = ref<NuevaListaPrecios>(vacia())
const igv = ref<'' | 'si' | 'no'>('')

function vacia(): NuevaListaPrecios {
  return {
    codigo: '',
    nombre: '',
    tipo: 'base',
    localId: localStore.localId ?? locales.value[0]?.id ?? '',
    canalIds: [],
    precios: [],
    // Una lista nace preparada: se pone en uso aparte, cuando toca.
    enUso: false,
    activa: true,
  }
}

function abrir(l?: ListaPrecios) {
  editando.value = l ?? null
  errores.value = {}
  if (l) {
    const { id: _id, ...resto } = l
    form.value = JSON.parse(JSON.stringify(resto))
  } else form.value = vacia()
  igv.value = form.value.igvIncluido === undefined ? '' : form.value.igvIncluido ? 'si' : 'no'
  abierto.value = true
}

function alternarCanal(id: string, marcado: boolean) {
  form.value.canalIds = marcado
    ? [...form.value.canalIds, id]
    : form.value.canalIds.filter((c) => c !== id)
}

const opcionesLocal = computed<OpcionSelect[]>(() =>
  locales.value.map((l) => ({ valor: l.id, etiqueta: l.nombre })),
)
const opcionesTipoLista: OpcionSelect[] = [
  { valor: 'base', etiqueta: 'Carta habitual' },
  { valor: 'temporada', etiqueta: 'Temporada' },
]
const opcionesOrigen = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'No deriva: usa el precio de la carta' },
  ...listas.value
    .filter((l) => l.id !== editando.value?.id)
    .map((l) => ({ valor: l.id, etiqueta: `${l.nombre} · ${nombreLocal(l.localId)}` })),
])
const opcionesIgv = [
  { valor: '', etiqueta: 'Como la empresa' },
  { valor: 'si', etiqueta: 'Precios con IGV incluido' },
  { valor: 'no', etiqueta: 'Precios sin IGV' },
]

async function guardar() {
  guardando.value = true
  errores.value = {}
  const datos: NuevaListaPrecios = {
    ...form.value,
    derivadaDe: form.value.derivadaDe || undefined,
    igvIncluido: igv.value === '' ? undefined : igv.value === 'si',
  }
  try {
    const l = editando.value
      ? await preciosService.actualizar(editando.value.id, datos)
      : await preciosService.crear(datos)
    ui.exito(`Lista «${l.nombre}» guardada.`)
    abierto.value = false
    seleccionada.value = l.id
    await cargar()
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar la lista.')
  } finally {
    guardando.value = false
  }
}

const confirmar = ref(false)
async function eliminar() {
  if (!lista.value) return
  try {
    await preciosService.eliminar(lista.value.id)
    ui.exito(`Lista «${lista.value.nombre}» eliminada.`)
    confirmar.value = false
    seleccionada.value = null
    await cargar()
  } catch (e) {
    confirmar.value = false
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  }
}

// ── Consulta de precio vigente ──

const consultaLocal = ref<string>('')
const consultaCanal = ref<string>('cv1')
const consultaFecha = ref<string | null>(hoy)
const consultaVendible = ref<string>('c:cb2')
watch(
  () => localStore.localId,
  (id) => (consultaLocal.value = id ?? 'l1'),
  { immediate: true },
)
const opcionesCanal = computed<OpcionSelect[]>(() =>
  canales.value.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
)
const opcionesVendible = computed<OpcionSelect[]>(() =>
  vendibles.value.map((v) => ({ valor: v.id, etiqueta: `${v.codigo} · ${v.nombre}` })),
)
const consulta = computed<PrecioVigente | null>(() => {
  // Recalcula al recargar listas.
  void listas.value
  if (!consultaLocal.value || !consultaCanal.value || !consultaVendible.value) return null
  return precioVigente(
    consultaVendible.value,
    consultaLocal.value,
    consultaCanal.value,
    consultaFecha.value ?? hoy,
  )
})
const reparto = computed(() => {
  void listas.value
  if (!consultaVendible.value.startsWith('c:')) return []
  return repartoCombo(
    consultaVendible.value.slice(2),
    consultaLocal.value,
    consultaCanal.value,
    consultaFecha.value ?? hoy,
  )
})
const etiquetaOrigen: Record<PrecioVigente['origen'], string> = {
  lista: 'Precio propio de la lista',
  derivada: 'Derivado de otra lista',
  base: 'La temporada no lo tiene: toma la lista base',
  referencia: 'Sin precio en lista: precio de la carta',
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="max-w-3xl text-sm text-tenue">
        Se vende lo que tiene código: productos, cada presentación, los adicionales con recargo y
        los combos. Sin precio en la lista, se cobra el de la carta.
      </p>
      <KmModoIntegracion
        capacidad="precios"
        :local-id="localStore.localId ?? undefined"
        mostrar-autonomo
      />
    </div>

    <div class="grid gap-5 lg:grid-cols-[17rem_1fr]">
      <nav
        aria-label="Listas de precios"
        class="flex flex-col gap-1 self-start rounded-card border border-linea bg-panel p-2"
      >
        <div class="flex items-center justify-between gap-2 px-2 py-1.5">
          <p class="rs-etiqueta text-tenue">Catálogo · {{ delLocal.length }}</p>
          <KmButton tamano="sm" @click="abrir()">Nueva lista</KmButton>
        </div>
        <p class="px-3 pb-1 text-xs text-tenue">
          Prepara las que quieras y pon en uso la que toque. Las de fechas entran y salen solas.
        </p>
        <button
          v-for="l in delLocal"
          :key="l.id"
          type="button"
          class="flex flex-col gap-0.5 rounded-control px-3 py-2 text-left transition-colors"
          :class="
            seleccionada === l.id ? 'bg-seleccion text-tinta' : 'text-tenue hover:bg-seleccion/60'
          "
          :aria-current="seleccionada === l.id ? 'true' : undefined"
          @click="seleccionada = l.id"
        >
          <span class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold">{{ l.nombre }}</span>
            <KmBadge :tono="estadoLista(l).tono" :punto="estadoLista(l).tono === 'verde'">
              {{ estadoLista(l).texto }}
            </KmBadge>
          </span>
          <span class="text-xs">
            <template v-if="!localStore.localId">{{ nombreLocal(l.localId) }} · </template>
            {{ l.canalIds.map(nombreCanal).join(', ') }}
          </span>
        </button>
        <p v-if="!delLocal.length" class="px-3 py-2 text-xs text-tenue">
          Este local no tiene listas: cobra el precio de la carta.
        </p>
      </nav>

      <KmCard v-if="lista" sin-padding>
        <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
          <div class="flex flex-col gap-1">
            <p class="rs-etiqueta text-laton-texto tabular-nums">
              {{ lista.codigo }} · {{ lista.tipo === 'base' ? 'Lista base' : 'Temporada' }}
            </p>
            <h2 class="rs-titulo-seccion text-tinta">{{ lista.nombre }}</h2>
            <dl class="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div class="flex gap-1.5">
                <dt class="text-tenue">Local</dt>
                <dd class="text-tinta">{{ nombreLocal(lista.localId) }}</dd>
              </div>
              <div class="flex gap-1.5">
                <dt class="text-tenue">Canales</dt>
                <dd class="text-tinta">{{ lista.canalIds.map(nombreCanal).join(', ') }}</dd>
              </div>
              <div class="flex gap-1.5">
                <dt class="text-tenue">Vigencia</dt>
                <dd class="text-tinta">{{ vigenciaTexto(lista) }}</dd>
              </div>
              <div v-if="lista.derivadaDe" class="flex gap-1.5">
                <dt class="text-tenue">Deriva de</dt>
                <dd class="text-tinta">
                  {{ nombreLista(lista.derivadaDe) }}
                  {{ (lista.ajustePorcentaje ?? 0) >= 0 ? '+' : ''
                  }}{{ lista.ajustePorcentaje ?? 0 }} %
                </dd>
              </div>
              <div class="flex gap-1.5">
                <dt class="text-tenue">IGV</dt>
                <dd class="text-tinta">
                  {{
                    lista.igvIncluido === undefined
                      ? 'Como la empresa'
                      : lista.igvIncluido
                        ? 'Incluido'
                        : 'Sin IGV'
                  }}
                </dd>
              </div>
            </dl>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <KmButton
              v-if="lista.activa && !lista.enUso && !(lista.desde && lista.hasta)"
              tamano="sm"
              @click="ponerEnUso(lista)"
            >
              Poner en uso
            </KmButton>
            <KmButton tamano="sm" variante="secundario" @click="abrir(lista)">Editar</KmButton>
            <KmButton tamano="sm" variante="fantasma" class="text-vino" @click="confirmar = true">
              Eliminar
            </KmButton>
          </div>
        </div>

        <!-- Qué está pasando con esta lista, en una línea. -->
        <div class="px-6 pt-3">
          <p
            v-if="estadoLista(lista).tono === 'verde'"
            class="rs-tono rs-tono-verde rounded-control border px-3 py-2 text-sm"
            role="status"
          >
            <template v-if="lista.desde && lista.hasta">
              Manda hasta el {{ formatearDia(lista.hasta) }} por sus fechas. Después vuelve al
              catálogo y cobra
              <strong>{{
                nombreLista(
                  delLocal.find(
                    (o) =>
                      o.id !== lista!.id &&
                      o.enUso &&
                      o.canalIds.some((c) => lista!.canalIds.includes(c)),
                  )?.id,
                )
              }}</strong
              >.
            </template>
            <template v-else>Es la lista que se cobra hoy en estos canales.</template>
          </p>
          <p
            v-else-if="tapadaPorFechas(lista)"
            class="rs-tono rs-tono-laton rounded-control border px-3 py-2 text-sm"
            role="status"
          >
            Está en uso, pero hoy la tapa
            <strong>{{ tapadaPorFechas(lista)!.nombre }}</strong
            >, que está programada hasta el {{ formatearDia(tapadaPorFechas(lista)!.hasta!) }}.
            Vuelve a cobrar sola ese día.
          </p>
          <p
            v-else-if="lista.desde && lista.hasta && hoy > lista.hasta"
            class="rounded-control border border-linea px-3 py-2 text-sm text-tenue"
          >
            Su periodo terminó el {{ formatearDia(lista.hasta) }}. No se ha borrado: sigue en el
            catálogo y puedes reutilizarla cambiándole las fechas.
          </p>
          <p
            v-else-if="lista.desde && lista.hasta"
            class="rs-tono rs-tono-laton rounded-control border px-3 py-2 text-sm"
          >
            Programada: entra sola el {{ formatearDia(lista.desde) }} y sale el
            {{ formatearDia(lista.hasta) }}.
          </p>
          <p
            v-else-if="lista.activa"
            class="rounded-control border border-linea px-3 py-2 text-sm text-tenue"
          >
            Preparada y guardada. No cobra nada hasta que la pongas en uso.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 px-6 pt-4">
          <div class="w-full max-w-xs">
            <KmBusqueda v-model="busqueda" placeholder="Código o nombre" />
          </div>
          <div class="w-52">
            <KmSelect v-model="filtroTipo" :opciones="opcionesTipo" etiqueta="Tipo de vendible" />
          </div>
          <div class="ml-auto flex items-center gap-3">
            <span v-if="hayCambios" class="text-xs text-laton-texto">Cambios sin guardar</span>
            <KmButton :disabled="!hayCambios" :cargando="guardandoPrecios" @click="guardarPrecios">
              Guardar precios
            </KmButton>
          </div>
        </div>

        <div class="mt-4 overflow-x-auto border-t border-linea">
          <table class="w-full min-w-[900px] text-sm">
            <thead>
              <tr class="border-b border-linea text-left text-xs text-tenue">
                <th class="px-6 py-2.5 font-medium">Código</th>
                <th class="px-3 py-2.5 font-medium">Vendible</th>
                <th class="px-3 py-2.5 text-right font-medium">Carta</th>
                <th class="w-40 px-3 py-2.5 font-medium">Precio en la lista</th>
                <th class="px-3 py-2.5 font-medium">Descuento</th>
                <th class="px-6 py-2.5 text-right font-medium">
                  Se cobra hoy · {{ nombreCanal(lista.canalIds[0] ?? '') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in filas"
                :key="v.id"
                class="border-b border-linea last:border-0"
                :class="v.activo ? '' : 'opacity-60'"
              >
                <td class="px-6 py-2 text-xs text-tenue tabular-nums">{{ v.codigo }}</td>
                <td class="px-3 py-2">
                  <p class="text-tinta">{{ v.nombre }}</p>
                  <p class="text-xs text-tenue">{{ etiquetaTipoVendible[v.tipo] }}</p>
                </td>
                <td class="px-3 py-2 text-right text-tenue tabular-nums">
                  {{ formatearSoles(v.precioReferencia) }}
                </td>
                <td class="px-3 py-1.5">
                  <KmNumero
                    :model-value="lineas[v.id]?.precio ?? null"
                    :min="0"
                    :decimales="2"
                    prefijo="S/"
                    :controles="false"
                    :placeholder="heredado(v).toFixed(2)"
                    :aria-label="`Precio de ${v.nombre} en la lista`"
                    @update:model-value="fijarPrecio(v.id, $event)"
                  />
                </td>
                <td class="px-3 py-2">
                  <button
                    type="button"
                    class="rounded-control px-2 py-1 text-xs hover:bg-seleccion"
                    :class="lineas[v.id]?.descuento ? 'font-semibold text-vino' : 'text-tenue'"
                    :aria-label="`Descuento de ${v.nombre}`"
                    @click="abrirDescuento(v)"
                  >
                    <template v-if="lineas[v.id]?.descuento">
                      −{{ lineas[v.id]!.descuento!.porcentaje }} % hasta
                      {{ formatearDia(lineas[v.id]!.descuento!.hasta) }}
                    </template>
                    <template v-else>Agregar</template>
                  </button>
                </td>
                <td class="px-6 py-2 text-right tabular-nums">
                  <template v-if="cobraHoy(v)">
                    <span
                      v-if="cobraHoy(v)!.descuentoPorcentaje"
                      class="mr-1.5 text-xs text-tenue line-through"
                    >
                      {{ formatearSoles(cobraHoy(v)!.precioLista) }}
                    </span>
                    <span class="font-semibold text-tinta">{{
                      formatearSoles(cobraHoy(v)!.precio)
                    }}</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="border-t border-linea px-6 py-3 text-xs text-tenue">
          Vacío = toma el precio indicado en gris ({{
            lista.derivadaDe ? 'lista de origen con su ajuste' : 'precio de la carta'
          }}). «Se cobra hoy» usa lo guardado.
        </p>
      </KmCard>
      <KmCard v-else titulo="Sin listas en este local">
        <p class="max-w-2xl text-sm text-tenue">
          Sin listas, cada canal cobra el precio de la carta. Crea una lista base para fijar precios
          por canal, o una de temporada para un periodo.
        </p>
        <KmButton class="mt-4" @click="abrir()">Crear lista</KmButton>
      </KmCard>
    </div>

    <KmCard
      titulo="¿Cuánto se cobra?"
      subtitulo="Resuelve el precio de un vendible por local, canal y fecha, con su IGV."
    >
      <div class="grid gap-4 md:grid-cols-4">
        <KmField v-slot="{ id }" label="Local">
          <KmSelect :id="id" v-model="consultaLocal" :opciones="opcionesLocal" />
        </KmField>
        <KmField v-slot="{ id }" label="Canal">
          <KmSelect :id="id" v-model="consultaCanal" :opciones="opcionesCanal" />
        </KmField>
        <KmField v-slot="{ id }" label="Fecha">
          <KmFecha :id="id" v-model="consultaFecha" />
        </KmField>
        <KmField v-slot="{ id }" label="Vendible">
          <KmSelect :id="id" v-model="consultaVendible" :opciones="opcionesVendible" />
        </KmField>
      </div>
      <div v-if="consulta" class="mt-5 grid gap-5 md:grid-cols-2">
        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt class="text-tenue">Lista</dt>
          <dd class="text-tinta">{{ consulta.listaNombre ?? 'Ninguna' }}</dd>
          <dt class="text-tenue">De dónde sale</dt>
          <dd class="text-tinta">{{ etiquetaOrigen[consulta.origen] }}</dd>
          <dt class="text-tenue">Precio de lista</dt>
          <dd class="text-tinta tabular-nums">{{ formatearSoles(consulta.precioLista) }}</dd>
          <dt class="text-tenue">Descuento</dt>
          <dd class="text-tinta tabular-nums">
            {{ consulta.descuentoPorcentaje ? `${consulta.descuentoPorcentaje} %` : '—' }}
          </dd>
          <dt class="font-semibold text-tinta">Se cobra</dt>
          <dd class="font-semibold text-tinta tabular-nums">
            {{
              formatearSoles(
                consulta.igvIncluido ? consulta.precio : consulta.precio + consulta.igv,
              )
            }}
          </dd>
          <dt class="text-tenue">Valor de venta</dt>
          <dd class="text-tinta tabular-nums">{{ formatearSoles(consulta.valorVenta) }}</dd>
          <dt class="text-tenue">IGV {{ consulta.tasaIgv }} %</dt>
          <dd class="text-tinta tabular-nums">
            {{ formatearSoles(consulta.igv) }}
            <span class="text-xs text-tenue">
              ({{ consulta.igvIncluido ? 'incluido en el precio' : 'se suma al precio' }})
            </span>
          </dd>
        </dl>
        <div v-if="reparto.length">
          <p class="rs-etiqueta text-laton-texto">Reparto del combo</p>
          <p class="mt-1 mb-2 text-xs text-tenue">
            El comprobante lleva una sola línea; el reparto sirve para costos y ventas por producto.
          </p>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-linea text-left text-xs text-tenue">
                <th class="py-1.5 font-medium">Componente</th>
                <th class="py-1.5 text-right font-medium">Precio suelto</th>
                <th class="py-1.5 text-right font-medium">Asignado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in reparto" :key="i" class="border-b border-linea last:border-0">
                <td class="py-1.5 text-tinta">{{ r.nombre }}</td>
                <td class="py-1.5 text-right text-tenue tabular-nums">
                  {{ formatearSoles(r.precioVigente) }}
                </td>
                <td class="py-1.5 text-right font-medium text-tinta tabular-nums">
                  {{ formatearSoles(r.asignado) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? `Editar ${editando.nombre}` : 'Nueva lista de precios'"
    >
      <div class="flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <KmField v-slot="{ id }" label="Nombre" requerido :error="errores.nombre">
            <KmInput :id="id" v-model="form.nombre" placeholder="Carta Miraflores" />
          </KmField>
          <KmField v-slot="{ id }" label="Código" requerido :error="errores.codigo">
            <KmInput :id="id" v-model="form.codigo" placeholder="LP-MIR-01" />
          </KmField>
        </div>
        <!-- El local es el activo de la cabecera: una lista creada para otro
             local desaparecía de esta pantalla en cuanto se guardaba. -->
        <div class="rounded-control border border-linea px-3 py-2 text-sm">
          <span class="text-tenue">Local</span>
          <strong class="ml-1.5 text-tinta">{{ nombreLocal(form.localId) }}</strong>
          <p class="mt-0.5 text-xs text-tenue">
            Para otro local, cámbialo en la cabecera y crea la lista allí.
          </p>
        </div>

        <KmField
          v-slot="{ id }"
          label="Tipo"
          ayuda="Solo es una etiqueta para encontrarla. Lo que decide cuál cobra es ponerla en uso, o sus fechas."
        >
          <KmSelect :id="id" v-model="form.tipo" :opciones="opcionesTipoLista" />
        </KmField>

        <div class="flex flex-col gap-1">
          <div class="grid gap-4 sm:grid-cols-2">
            <KmField v-slot="{ id }" label="Desde">
              <KmFecha
                :id="id"
                :model-value="form.desde ?? null"
                @update:model-value="form.desde = $event ?? undefined"
              />
            </KmField>
            <KmField v-slot="{ id }" label="Hasta">
              <KmFecha
                :id="id"
                :model-value="form.hasta ?? null"
                @update:model-value="form.hasta = $event ?? undefined"
              />
            </KmField>
          </div>
          <p v-if="errores.vigencia" class="text-xs font-medium text-vino">
            {{ errores.vigencia }}
          </p>
          <p v-else class="text-xs text-tenue">
            Opcionales. Con fechas, la lista entra y sale sola en ese periodo. Sin fechas, manda
            solo cuando la pongas en uso.
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Canales</p>
          <KmCheckbox
            v-for="c in canales"
            :key="c.id"
            :model-value="form.canalIds.includes(c.id)"
            @update:model-value="alternarCanal(c.id, $event)"
          >
            {{ c.nombre }}
          </KmCheckbox>
          <p v-if="errores.canalIds" class="text-xs font-medium text-vino">
            {{ errores.canalIds }}
          </p>
        </div>
        <KmField v-slot="{ id }" label="Deriva de" :error="errores.derivadaDe">
          <KmSelect
            :id="id"
            :model-value="form.derivadaDe ?? ''"
            :opciones="opcionesOrigen"
            @update:model-value="form.derivadaDe = String($event ?? '') || undefined"
          />
        </KmField>
        <KmField
          v-if="form.derivadaDe"
          v-slot="{ id }"
          label="Ajuste sobre la lista de origen"
          ayuda="Positivo sube, negativo baja. Se redondea a 10 céntimos."
          :error="errores.ajustePorcentaje"
        >
          <KmNumero :id="id" v-model="form.ajustePorcentaje" :decimales="2" sufijo="%" />
        </KmField>
        <KmField v-slot="{ id }" label="IGV en los precios">
          <KmSelect :id="id" v-model="igv" :opciones="opcionesIgv" />
        </KmField>
        <KmSwitch v-model="form.activa" etiqueta="Lista activa" />
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar</KmButton>
      </template>
    </KmDrawer>

    <KmModal v-model="modalDescuento" titulo="Descuento en la lista" ancho="sm">
      <div class="flex flex-col gap-4">
        <p class="text-sm text-tenue">{{ vendibleDescuento?.nombre }}</p>
        <KmField v-slot="{ id }" label="Porcentaje" requerido>
          <KmNumero :id="id" v-model="descuento.porcentaje" :min="0" :max="100" sufijo="%" />
        </KmField>
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Desde" requerido>
            <KmFecha :id="id" v-model="descuento.desde" />
          </KmField>
          <KmField v-slot="{ id }" label="Hasta" requerido>
            <KmFecha :id="id" v-model="descuento.hasta" />
          </KmField>
        </div>
      </div>
      <template #footer>
        <KmButton
          v-if="vendibleDescuento && lineas[vendibleDescuento.id]?.descuento"
          variante="fantasma"
          class="mr-auto text-vino"
          @click="aplicarDescuento(true)"
        >
          Quitar descuento
        </KmButton>
        <KmButton variante="secundario" @click="modalDescuento = false">Cancelar</KmButton>
        <KmButton @click="aplicarDescuento()">Aplicar</KmButton>
      </template>
    </KmModal>

    <KmConfirm
      v-model="confirmar"
      titulo="¿Eliminar la lista?"
      :mensaje="`Los canales de «${lista?.nombre ?? ''}» pasarán a cobrar el precio de su lista base o de la carta.`"
      texto-confirmar="Eliminar"
      peligroso
      @confirmar="eliminar"
    />
  </div>
</template>
