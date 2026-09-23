<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmField from '@/components/ui/KmField.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import {
  etiquetaNivel,
  etiquetaParametro,
  nivelesParametros,
  parametrosAbastecimientoService,
  type Contexto,
} from '@/services/abastecimiento.service'
import { useUiStore } from '@/stores/ui.store'
import type {
  AjusteParametros,
  ApiError,
  CategoriaInsumo,
  NivelParametros,
  ParametrosAbastecimiento,
  ParametrosResueltos,
} from '@/types'
import { etiquetaCategoriaInsumo } from '@/utils/formato'

/**
 * Parámetros de abastecimiento y su herencia (F4.3, D-004).
 *
 * La pantalla se lee de izquierda a derecha: **dónde** se ajusta (nivel y a
 * qué local, zona, categoría o insumo), **qué** se ajusta (cada parámetro
 * hereda o toma un valor propio, viendo siempre el valor resultante) y, al
 * lado, **cómo queda** para un insumo concreto en una zona.
 */

type Clave = keyof ParametrosAbastecimiento
type Valor = boolean | number | string

const ui = useUiStore()
const catalogos = useCatalogos(['insumos', 'zonas', 'locales', 'cadenas'])
const { zonas, insumos, locales, cadenas, opcionesInsumo, opcionesZona } = catalogos

const claves = Object.keys(etiquetaParametro) as Clave[]

/** Qué hace cada parámetro, en el idioma de quien recibe mercadería. */
const ayudaParametro: Record<Clave, string> = {
  controlaLote: 'Al recepcionar se pide el número de lote.',
  controlaVencimiento: 'Al recepcionar se pide la fecha de vencimiento.',
  fefo: 'Las salidas proponen primero lo que vence antes.',
  diasAlerta: 'Con cuánta anticipación se avisa de un vencimiento.',
  bloquearVencidos: 'Un lote vencido no se puede consumir ni transferir.',
  controlaUbicacion: 'Cada ingreso se guarda en pasillo, estante y fila.',
  controlaSerie: 'Al recepcionar se pide un número de serie por cada unidad.',
  tipoRecepcion:
    'Total: a ciegas, se recibe todo lo pendiente o nada. A detalle: se cuenta y se puede recibir menos. Ambos: se elige en cada recepción.',
}

/** De quién hereda cada nivel, dicho sin diagramas. */
const heredaDe: Record<NivelParametros, string> = {
  empresa: 'Base de toda la empresa: no hereda de nadie, así que todo tiene valor.',
  cadena: 'Hereda de la empresa. Vale para todos los locales de la cadena.',
  local:
    'Hereda de su cadena, si la tiene, y de la empresa. Cambia solo lo que este local haga distinto.',
  zona: 'Hereda de su local, su cadena y la empresa.',
  categoria: 'Hereda de la empresa, la cadena, el local y la zona donde se guarde.',
  insumo: 'Hereda de su categoría y de los niveles superiores.',
}

const tonoNivel: Record<NivelParametros, 'neutro' | 'pizarra' | 'laton' | 'verde' | 'vino'> = {
  empresa: 'neutro',
  cadena: 'neutro',
  local: 'pizarra',
  zona: 'laton',
  categoria: 'verde',
  insumo: 'vino',
}

const opcionesBooleano = [
  { valor: true, etiqueta: 'Sí' },
  { valor: false, etiqueta: 'No' },
]
const opcionesRecepcion = [
  { valor: 'total', etiqueta: 'Total' },
  { valor: 'detalle', etiqueta: 'A detalle' },
  { valor: 'ambos', etiqueta: 'Ambos' },
]

function textoValor(clave: Clave, valor: unknown) {
  if (valor === undefined || valor === null || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (clave === 'tipoRecepcion') {
    return valor === 'detalle' ? 'A detalle' : valor === 'ambos' ? 'Ambos' : 'Total'
  }
  return `${valor} ${Number(valor) === 1 ? 'día' : 'días'}`
}

// ── Dónde: nivel y destino ──

const ajustes = shallowRef<AjusteParametros[]>([])
const nivel = ref<NivelParametros>('empresa')
const referencia = ref('')

async function cargarAjustes() {
  ajustes.value = await parametrosAbastecimientoService.ajustes()
}

function ajusteDe(n: NivelParametros, r: string) {
  return ajustes.value.find(
    (a) => a.nivel === n && (a.referencia ?? '') === (n === 'empresa' ? '' : r),
  )
}

interface Destino {
  valor: string
  etiqueta: string
  detalle?: string
  propios: number
}

const destinos = computed<Destino[]>(() => {
  const n = nivel.value
  const contar = (r: string) => Object.keys(ajusteDe(n, r)?.valores ?? {}).length
  const nombreLocal = (id: string) => locales.value.find((l) => l.id === id)?.nombre
  if (n === 'cadena') {
    return cadenas.value.map((c) => ({
      valor: c.id,
      etiqueta: c.nombre,
      detalle: `${c.localIds.length} ${c.localIds.length === 1 ? 'local' : 'locales'}`,
      propios: contar(c.id),
    }))
  }
  if (n === 'local') {
    return locales.value.map((l) => ({ valor: l.id, etiqueta: l.nombre, propios: contar(l.id) }))
  }
  if (n === 'zona') {
    return zonas.value
      .filter((a) => a.activo)
      .map((a) => ({
        valor: a.id,
        etiqueta: a.nombre,
        detalle: nombreLocal(a.localId),
        propios: contar(a.id),
      }))
  }
  if (n === 'categoria') {
    return (Object.keys(etiquetaCategoriaInsumo) as CategoriaInsumo[]).map((c) => ({
      valor: c,
      etiqueta: etiquetaCategoriaInsumo[c],
      propios: contar(c),
    }))
  }
  if (n === 'insumo') {
    // Solo los insumos con algo propio, más el elegido: la lista completa no cabe.
    return insumos.value
      .filter((i) => i.activo && (contar(i.id) > 0 || i.id === referencia.value))
      .map((i) => ({
        valor: i.id,
        etiqueta: i.nombre,
        detalle: etiquetaCategoriaInsumo[i.categoria],
        propios: contar(i.id),
      }))
  }
  return []
})

const conteoPorNivel = computed(() =>
  Object.fromEntries(
    nivelesParametros.map((n) => [n, ajustes.value.filter((a) => a.nivel === n).length]),
  ),
)

/** El nivel Cadena solo aparece cuando la empresa usa cadenas (D-008). */
const nivelesVisibles = computed(() =>
  nivelesParametros.filter((n) => n !== 'cadena' || cadenas.value.length > 0),
)

const esCadena = computed(() => nivel.value === 'empresa')
const destinoListo = computed(() => esCadena.value || !!referencia.value)

const nombreDestino = computed(() => {
  if (esCadena.value) return 'Toda la empresa'
  return destinos.value.find((d) => d.valor === referencia.value)?.etiqueta ?? ''
})

function elegirNivel(n: NivelParametros) {
  if (n === nivel.value) return
  nivel.value = n
  referencia.value = n === 'empresa' || n === 'insumo' ? '' : (destinos.value[0]?.valor ?? '')
}

const insumoParaAgregar = ref('')
watch(insumoParaAgregar, (id) => {
  if (!id) return
  referencia.value = id
  insumoParaAgregar.value = ''
})

// ── Qué: valores propios frente a heredados ──

/** Valores propios del destino; lo que no está, se hereda. */
const borrador = ref<Partial<Record<Clave, Valor>>>({})
const original = ref<Partial<Record<Clave, Valor>>>({})
const heredado = shallowRef<ParametrosResueltos | null>(null)
const guardando = ref(false)

/** Contexto del nivel superior: de ahí sale lo que se hereda. */
function contextoPadre(): Contexto | null {
  if (nivel.value === 'empresa') return null
  if (nivel.value === 'local') {
    return { cadenaId: cadenas.value.find((c) => c.localIds.includes(referencia.value))?.id }
  }
  if (nivel.value === 'zona') {
    return { localId: zonas.value.find((a) => a.id === referencia.value)?.localId }
  }
  if (nivel.value === 'insumo') {
    return { categoria: insumos.value.find((i) => i.id === referencia.value)?.categoria }
  }
  return {}
}

async function cargarNivel() {
  const valores = { ...(ajusteDe(nivel.value, referencia.value)?.valores ?? {}) }
  original.value = { ...valores }
  borrador.value = { ...valores }
  const padre = contextoPadre()
  heredado.value =
    padre && destinoListo.value ? await parametrosAbastecimientoService.resolver(padre) : null
}

watch([nivel, referencia, ajustes], () => void cargarNivel())

const cambios = computed(() => claves.filter((c) => borrador.value[c] !== original.value[c]).length)

function propio(clave: Clave) {
  return esCadena.value || borrador.value[clave] !== undefined
}

function heredar(clave: Clave) {
  const { [clave]: _quitado, ...resto } = borrador.value
  borrador.value = resto
}

function hacerPropio(clave: Clave) {
  fijar(clave, heredado.value?.[clave].valor as Valor)
}

function fijar(clave: Clave, valor: Valor) {
  borrador.value = { ...borrador.value, [clave]: valor }
}

function descartar() {
  borrador.value = { ...original.value }
}

async function guardar() {
  guardando.value = true
  try {
    await parametrosAbastecimientoService.guardarAjuste(
      nivel.value,
      esCadena.value ? undefined : referencia.value,
      borrador.value as Partial<ParametrosAbastecimiento>,
    )
    ui.exito(`Parámetros de «${nombreDestino.value}» guardados.`)
    await cargarAjustes()
    await comprobar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron guardar los parámetros.')
  } finally {
    guardando.value = false
  }
}

// ── Cómo queda: un insumo en una zona ──

const insumoId = ref('')
const zonaId = ref('')
const resuelto = shallowRef<ParametrosResueltos | null>(null)

async function comprobar() {
  resuelto.value = insumoId.value
    ? await parametrosAbastecimientoService.resolver({
        insumoId: insumoId.value,
        zonaId: zonaId.value || undefined,
      })
    : null
}
watch([insumoId, zonaId], comprobar)

onMounted(async () => {
  await Promise.all([catalogos.recargar(), cargarAjustes()])
  insumoId.value = (opcionesInsumo.value[0]?.valor as string) ?? ''
  zonaId.value = (opcionesZona.value[0]?.valor as string) ?? ''
})
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <p class="max-w-4xl text-sm text-tenue">
      Qué se exige al recibir y sacar mercadería: lote, vencimiento, ubicación y orden de salida. Se
      define una vez para la empresa y solo se cambia donde haga falta —una cadena, un local, una
      zona, una categoría o un insumo—. Lo más específico manda.
    </p>

    <div
      class="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[270px_minmax(0,1fr)_380px]"
    >
      <!-- 1 · Dónde -->
      <nav aria-label="Dónde se ajusta" class="flex flex-col gap-5">
        <div>
          <p class="rs-etiqueta mb-2 text-laton-texto">1 · Nivel</p>
          <ol class="flex flex-col gap-1">
            <li v-for="(n, i) in nivelesVisibles" :key="n">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors"
                :class="
                  nivel === n
                    ? 'rs-opcion-activa bg-seleccion text-tinta'
                    : 'text-tenue hover:bg-seleccion hover:text-tinta'
                "
                :aria-current="nivel === n ? 'true' : undefined"
                @click="elegirNivel(n)"
              >
                <span
                  class="grid size-6 shrink-0 place-items-center rounded-full border border-linea text-[11px] font-semibold tabular-nums"
                >
                  {{ i + 1 }}
                </span>
                <span class="flex-1 font-medium">{{ etiquetaNivel[n] }}</span>
                <span
                  v-if="n !== 'empresa' && conteoPorNivel[n]"
                  class="text-xs text-tenue tabular-nums"
                  :title="`${conteoPorNivel[n]} con ajustes propios`"
                >
                  {{ conteoPorNivel[n] }}
                </span>
              </button>
            </li>
          </ol>
        </div>

        <div v-if="!esCadena">
          <p class="rs-etiqueta mb-2 text-laton-texto">2 · {{ etiquetaNivel[nivel] }}</p>
          <div v-if="nivel === 'insumo'" class="mb-2">
            <KmSelect
              v-model="insumoParaAgregar"
              placeholder="Elegir insumo…"
              aria-label="Elegir insumo"
              :opciones="opcionesInsumo"
            />
          </div>
          <ul class="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            <li v-for="d in destinos" :key="d.valor">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-control border px-3 py-2 text-left transition-colors"
                :class="
                  referencia === d.valor
                    ? 'border-verde bg-seleccion text-tinta'
                    : 'border-transparent text-tenue hover:bg-seleccion hover:text-tinta'
                "
                :aria-current="referencia === d.valor ? 'true' : undefined"
                @click="referencia = d.valor"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ d.etiqueta }}</span>
                  <span v-if="d.detalle" class="block truncate text-xs opacity-75">
                    {{ d.detalle }}
                  </span>
                </span>
                <span
                  class="shrink-0 text-xs"
                  :class="d.propios ? 'font-semibold text-laton-texto' : 'opacity-60'"
                >
                  {{ d.propios ? `${d.propios} propios` : 'Hereda' }}
                </span>
              </button>
            </li>
            <li v-if="!destinos.length" class="px-3 py-2 text-xs text-tenue">
              Ningún insumo tiene ajustes propios. Elige uno arriba para crearlos.
            </li>
          </ul>
        </div>
      </nav>

      <!-- 2 · Qué -->
      <KmCard
        :titulo="
          destinoListo
            ? nombreDestino
            : `Elige ${nivel === 'categoria' ? 'una' : 'un'} ${etiquetaNivel[nivel].toLowerCase()}`
        "
        :subtitulo="heredaDe[nivel]"
        sin-padding
      >
        <template #acciones>
          <KmBadge :tono="tonoNivel[nivel]" punto>{{ etiquetaNivel[nivel] }}</KmBadge>
        </template>

        <p v-if="!destinoListo" class="p-6 text-sm text-tenue">
          Elige a la izquierda a qué {{ etiquetaNivel[nivel].toLowerCase() }} quieres cambiarle los
          parámetros.
        </p>

        <template v-else>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-linea text-left text-xs text-tenue">
                  <th class="px-6 py-3 font-medium">Parámetro</th>
                  <th v-if="!esCadena" class="px-3 py-3 font-medium">En este nivel</th>
                  <th class="px-6 py-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="clave in claves"
                  :key="clave"
                  class="border-b border-linea transition-colors last:border-0"
                  :class="!esCadena && propio(clave) ? 'bg-seleccion/50' : ''"
                >
                  <td class="px-6 py-3.5">
                    <p class="font-medium text-tinta">{{ etiquetaParametro[clave] }}</p>
                    <p class="mt-0.5 text-xs text-tenue">{{ ayudaParametro[clave] }}</p>
                  </td>

                  <td v-if="!esCadena" class="px-3 py-3.5">
                    <div
                      class="inline-flex rounded-control border border-linea p-0.5 text-xs"
                      role="radiogroup"
                      :aria-label="`${etiquetaParametro[clave]}: heredar o propio`"
                    >
                      <button
                        type="button"
                        role="radio"
                        :aria-checked="!propio(clave)"
                        class="rounded-[6px] px-2.5 py-1 font-medium transition-colors"
                        :class="
                          !propio(clave) ? 'bg-panel-2 text-tinta' : 'text-tenue hover:text-tinta'
                        "
                        @click="heredar(clave)"
                      >
                        Heredar
                      </button>
                      <button
                        type="button"
                        role="radio"
                        :aria-checked="propio(clave)"
                        class="rounded-[6px] px-2.5 py-1 font-medium transition-colors"
                        :class="
                          propio(clave) ? 'bg-accion text-white' : 'text-tenue hover:text-tinta'
                        "
                        @click="!propio(clave) && hacerPropio(clave)"
                      >
                        Propio
                      </button>
                    </div>
                  </td>

                  <td class="px-6 py-3.5">
                    <!-- Heredado: valor y procedencia, sin controles que confundan. -->
                    <p v-if="!propio(clave)" class="text-tinta">
                      {{ textoValor(clave, heredado?.[clave].valor) }}
                      <span v-if="heredado" class="ml-1 text-xs text-tenue">
                        · viene de {{ etiquetaNivel[heredado[clave].nivel].toLowerCase() }}
                      </span>
                    </p>

                    <KmNumero
                      v-else-if="clave === 'diasAlerta'"
                      class="max-w-44"
                      :model-value="Number(borrador.diasAlerta ?? 0)"
                      :min="0"
                      sufijo="días"
                      :aria-label="etiquetaParametro[clave]"
                      @update:model-value="fijar(clave, $event ?? 0)"
                    />

                    <div
                      v-else
                      class="inline-flex rounded-control border border-linea p-0.5"
                      role="radiogroup"
                      :aria-label="etiquetaParametro[clave]"
                    >
                      <button
                        v-for="op in clave === 'tipoRecepcion'
                          ? opcionesRecepcion
                          : opcionesBooleano"
                        :key="String(op.valor)"
                        type="button"
                        role="radio"
                        :aria-checked="borrador[clave] === op.valor"
                        class="min-w-12 rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors"
                        :class="
                          borrador[clave] === op.valor
                            ? 'bg-accion text-white'
                            : 'text-tenue hover:text-tinta'
                        "
                        @click="fijar(clave, op.valor)"
                      >
                        {{ op.etiqueta }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer
            class="flex flex-wrap items-center justify-end gap-3 border-t border-linea px-6 py-4"
          >
            <p
              class="mr-auto text-xs"
              :class="cambios ? 'font-semibold text-laton-texto' : 'text-tenue'"
            >
              {{
                cambios
                  ? `${cambios} ${cambios === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}`
                  : 'Sin cambios'
              }}
            </p>
            <KmButton variante="secundario" :disabled="!cambios" @click="descartar">
              Descartar
            </KmButton>
            <KmButton :cargando="guardando" :disabled="!cambios" @click="guardar">
              Guardar cambios
            </KmButton>
          </footer>
        </template>
      </KmCard>

      <!-- 3 · Cómo queda -->
      <KmCard
        titulo="Comprobar un insumo"
        subtitulo="Qué se le exigirá en una zona y qué nivel lo decide."
        class="lg:col-start-2 2xl:col-start-auto"
      >
        <div class="mb-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
          <KmField v-slot="{ id }" label="Insumo">
            <KmSelect :id="id" v-model="insumoId" :opciones="opcionesInsumo" />
          </KmField>
          <KmField v-slot="{ id }" label="Zona">
            <KmSelect :id="id" v-model="zonaId" :opciones="opcionesZona" />
          </KmField>
        </div>

        <dl v-if="resuelto" class="grid gap-x-8 sm:grid-cols-2 2xl:grid-cols-1">
          <div
            v-for="clave in claves"
            :key="clave"
            class="flex items-center justify-between gap-3 border-b border-linea py-2.5"
          >
            <dt class="text-sm text-tenue">{{ etiquetaParametro[clave] }}</dt>
            <dd class="flex items-center gap-2">
              <span class="text-sm font-semibold text-tinta">
                {{ textoValor(clave, resuelto[clave].valor) }}
              </span>
              <KmBadge :tono="tonoNivel[resuelto[clave].nivel]" punto>
                {{ etiquetaNivel[resuelto[clave].nivel] }}
              </KmBadge>
            </dd>
          </div>
        </dl>
        <p v-else class="text-sm text-tenue">Elige un insumo para ver cómo queda.</p>
      </KmCard>
    </div>
  </div>
</template>

<style scoped>
.rs-opcion-activa {
  box-shadow: inset 3px 0 0 0 var(--rs-laton-500);
}
</style>
