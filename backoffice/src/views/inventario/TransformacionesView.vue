<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import EditorIngredientes from './EditorIngredientes.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { transformacionesService } from '@/services/abastecimiento.service'
import { inventarioService } from '@/services/inventario.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, IngredienteReceta, SalidaTransformacion, Transformacion } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { copiar } from '@/utils/copiar'
import { etiquetaUnidad, formatearCantidad, formatearSoles } from '@/utils/formato'

/**
 * Transformaciones (F4.3, D-004): qué entra y qué sale al procesar un insumo.
 * Cubre el **despiece** (10 kg de pescado → 6 de filete + 1.5 de espinazo +
 * merma) y la **preparación** o subreceta (varios insumos → uno).
 *
 * El costo de las entradas se reparte entre las salidas por porcentaje. La
 * merma no absorbe costo, así que lo que se pierde encarece lo que queda.
 * El registro de lo que salió realmente llega en F4.5.
 */

const ui = useUiStore()
const auth = useAuthStore()
const catalogos = useCatalogos(['insumos', 'almacenes', 'locales'])
const { insumo, opcionesInsumo, opcionesAlmacen } = catalogos

const transformaciones = shallowRef<Transformacion[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    transformaciones.value = await transformacionesService.todos()
    await catalogos.recargar()
  } catch (e) {
    error.value = (e as ApiError).mensaje ?? 'No se pudieron cargar las transformaciones.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

const nombreInsumo = (id?: string) => (id ? (insumo(id)?.nombre ?? '—') : 'Merma')

function cantidadDe(insumoId: string | undefined, cantidad: number, unidadPorDefecto?: string) {
  const i = insumoId ? insumo(insumoId) : undefined
  if (i) return formatearCantidad(cantidad, i.unidad)
  // La merma no tiene insumo: se mide en la unidad de lo que entra.
  return unidadPorDefecto ? `${cantidad} ${unidadPorDefecto}` : `${cantidad}`
}

/** Unidad de la primera entrada: es en lo que se pierde la merma. */
function unidadEntrada(t: Transformacion) {
  const primera = t.entradas[0]
  return primera ? etiquetaUnidad[insumo(primera.insumoId)?.unidad ?? 'unidad'] : undefined
}

/** Costo de las entradas de una tanda, para ver de dónde sale cada salida. */
const costoDe = (t: Transformacion) => transformacionesService.costoEntradas(t)

// ── Editor ──

const abierto = ref(false)
const editando = shallowRef<Transformacion | null>(null)
const nombre = ref('')
const entradas = ref<IngredienteReceta[]>([])
const salidas = ref<SalidaTransformacion[]>([])
const activo = ref(true)
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

const opcionesTipoSalida: OpcionSelect[] = [
  { valor: 'insumo', etiqueta: 'Insumo' },
  { valor: 'merma', etiqueta: 'Merma' },
]

function nuevaSalida(): SalidaTransformacion {
  return {
    id: `s${Math.random().toString(36).slice(2, 8)}`,
    tipo: 'insumo',
    insumoId: '',
    cantidad: 0,
    reparto: 0,
  }
}

function editar(t?: Transformacion) {
  errores.value = {}
  editando.value = t ?? null
  nombre.value = t?.nombre ?? ''
  entradas.value = copiar(t?.entradas ?? [{ insumoId: '', cantidad: 0 }])
  salidas.value = copiar(t?.salidas ?? [nuevaSalida()])
  activo.value = t?.activo ?? true
  abierto.value = true
}

function anadirSalida() {
  salidas.value = [...salidas.value, nuevaSalida()]
}

function quitarSalida(indice: number) {
  salidas.value = salidas.value.filter((_, i) => i !== indice)
}

/** Reparte el costo en proporción a la cantidad de cada salida que no es merma. */
function repartirProporcional() {
  const porcentajes = transformacionesService.repartoProporcional(salidas.value)
  salidas.value = salidas.value.map((s, i) => ({ ...s, reparto: porcentajes[i] ?? 0 }))
}

const sumaReparto = computed(() =>
  salidas.value
    .filter((s) => s.tipo === 'insumo')
    .reduce((total, s) => total + Number(s.reparto || 0), 0),
)

const costoEntradasBorrador = computed(() =>
  transformacionesService.costoEntradas({ entradas: entradas.value }),
)

/** Lo que costaría cada unidad de salida con el reparto actual. */
function costoUnitarioSalida(salida: SalidaTransformacion) {
  if (salida.tipo !== 'insumo' || !(salida.cantidad > 0)) return 0
  return (costoEntradasBorrador.value * (Number(salida.reparto) || 0)) / 100 / salida.cantidad
}

async function guardar() {
  errores.value = {}
  guardando.value = true
  const datos = {
    nombre: nombre.value,
    entradas: entradas.value,
    salidas: salidas.value.map((s) => ({
      ...s,
      insumoId: s.tipo === 'merma' ? undefined : s.insumoId,
      reparto: s.tipo === 'merma' ? 0 : Number(s.reparto),
      cantidad: Number(s.cantidad),
    })),
    activo: activo.value,
  }
  try {
    if (editando.value) await transformacionesService.actualizar(editando.value.id, datos)
    else await transformacionesService.crear(datos)
    ui.exito('Transformación guardada. El costo de sus salidas se recalcula solo.')
    abierto.value = false
    await cargar()
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar la transformación.')
  } finally {
    guardando.value = false
  }
}

// ── Eliminar ──

const aEliminar = shallowRef<Transformacion | null>(null)
const confirmarEliminarAbierto = ref(false)

function pedirEliminar(t: Transformacion) {
  aEliminar.value = t
  confirmarEliminarAbierto.value = true
}

async function confirmarEliminar() {
  if (!aEliminar.value) return
  try {
    await transformacionesService.eliminar(aEliminar.value.id)
    ui.exito('Transformación eliminada.')
    confirmarEliminarAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  } finally {
    aEliminar.value = null
  }
}

// ── Procesar una tanda ──

const procesarAbierto = ref(false)
const aProcesar = shallowRef<Transformacion | null>(null)
const almacenId = ref('')
const veces = ref<number | null>(1)
const procesando = ref(false)

function procesar(t: Transformacion) {
  aProcesar.value = t
  almacenId.value = (opcionesAlmacen.value[0]?.valor as string) ?? ''
  veces.value = 1
  procesarAbierto.value = true
}

async function confirmarProcesar() {
  if (!aProcesar.value) return
  procesando.value = true
  try {
    await inventarioService.transformar({
      transformacionId: aProcesar.value.id,
      almacenId: almacenId.value,
      veces: Number(veces.value),
      usuarioId: auth.usuario?.id ?? 'u1',
    })
    ui.exito('Transformación registrada: se consumieron las entradas y entraron las salidas.')
    procesarAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo procesar.')
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-5">
    <KmCard
      titulo="Transformaciones"
      subtitulo="Qué entra y qué sale al procesar un insumo: despiece de una pieza o preparación de una base. El costo de las entradas se reparte entre las salidas."
    >
      <template #acciones>
        <KmButton tamano="sm" @click="editar()">Nueva transformación</KmButton>
      </template>

      <KmEstado v-if="error" tipo="error" :mensaje="error">
        <KmButton tamano="sm" variante="secundario" @click="cargar">Reintentar</KmButton>
      </KmEstado>
      <KmEstado v-else-if="cargando" tipo="cargando" />
      <KmEstado
        v-else-if="transformaciones.length === 0"
        tipo="vacio"
        mensaje="Aún no hay transformaciones. Crea una para despiezar una pieza o preparar una base."
      />

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="t in transformaciones"
          :key="t.id"
          class="rounded-card border border-linea bg-panel p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="flex items-center gap-2 font-medium text-tinta">
                {{ t.nombre }}
                <KmBadge v-if="!t.activo" tono="neutro" punto>Inactiva</KmBadge>
              </p>
              <p class="text-xs text-tenue">
                Una tanda cuesta
                <strong class="text-tinta tabular-nums">{{ formatearSoles(costoDe(t)) }}</strong>
                en entradas
              </p>
            </div>
            <div class="flex gap-0.5">
              <KmBotonIcono
                icono="movimiento"
                etiqueta="Procesar una tanda"
                :contexto="t.nombre"
                @click="procesar(t)"
              />
              <KmBotonIcono
                icono="editar"
                etiqueta="Editar"
                :contexto="t.nombre"
                @click="editar(t)"
              />
              <KmBotonIcono
                icono="eliminar"
                etiqueta="Eliminar"
                :contexto="t.nombre"
                @click="pedirEliminar(t)"
              />
            </div>
          </div>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p class="rs-etiqueta text-tenue">Entra</p>
              <ul class="mt-1 flex flex-col gap-0.5 text-sm">
                <li v-for="e in t.entradas" :key="e.insumoId" class="text-tinta">
                  {{ cantidadDe(e.insumoId, e.cantidad) }} de {{ nombreInsumo(e.insumoId) }}
                </li>
              </ul>
            </div>
            <div>
              <p class="rs-etiqueta text-tenue">Sale</p>
              <ul class="mt-1 flex flex-col gap-0.5 text-sm">
                <li
                  v-for="s in t.salidas"
                  :key="s.id"
                  :class="s.tipo === 'merma' ? 'text-tenue' : 'text-tinta'"
                >
                  {{ cantidadDe(s.insumoId, s.cantidad, unidadEntrada(t)) }}
                  {{
                    s.tipo === 'merma'
                      ? `de merma${s.descripcion ? ` · ${s.descripcion}` : ''}`
                      : `de ${nombreInsumo(s.insumoId)}`
                  }}
                  <span v-if="s.tipo === 'insumo'" class="text-xs text-tenue"
                    >· {{ s.reparto }} % del costo</span
                  >
                </li>
              </ul>
            </div>
          </div>
        </li>
      </ul>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? `Transformación · ${editando.nombre}` : 'Nueva transformación'"
      subtitulo="Cantidades de una tanda. Al procesarla se multiplican por las tandas que se hagan."
      ancho="lg"
    >
      <div class="flex flex-col gap-5">
        <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
          <KmInput
            :id="id"
            v-model="nombre"
            placeholder="Ej. Despiece de lenguado"
            :invalido="invalido"
          />
        </KmField>

        <div>
          <p class="mb-2 text-sm font-medium text-tinta">Entra</p>
          <p v-if="errores.entradas" class="mb-2 text-xs font-medium text-vino">
            {{ errores.entradas }}
          </p>
          <EditorIngredientes v-model="entradas" :insumos="catalogos.insumos.value" />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium text-tinta">Sale</p>
            <div class="flex gap-2">
              <KmButton tamano="sm" variante="secundario" @click="repartirProporcional">
                Repartir por cantidad
              </KmButton>
              <KmButton tamano="sm" variante="secundario" @click="anadirSalida">
                Añadir salida
              </KmButton>
            </div>
          </div>
          <p v-if="errores.salidas" class="text-xs font-medium text-vino">{{ errores.salidas }}</p>

          <ul class="flex flex-col gap-2">
            <li
              v-for="(salida, indice) in salidas"
              :key="salida.id"
              class="flex flex-wrap items-end gap-2 rounded-card border border-linea p-3"
            >
              <div class="w-32">
                <KmField v-slot="{ id }" label="Tipo">
                  <KmSelect :id="id" v-model="salida.tipo" :opciones="opcionesTipoSalida" />
                </KmField>
              </div>
              <div class="min-w-48 flex-1">
                <KmField v-slot="{ id }" :label="salida.tipo === 'merma' ? 'Concepto' : 'Insumo'">
                  <KmSelect
                    v-if="salida.tipo === 'insumo'"
                    :id="id"
                    v-model="salida.insumoId"
                    placeholder="Elige un insumo"
                    :opciones="opcionesInsumo"
                  />
                  <KmInput
                    v-else
                    :id="id"
                    v-model="salida.descripcion"
                    placeholder="Ej. Vísceras y escamas"
                  />
                </KmField>
              </div>
              <div class="w-28">
                <KmField v-slot="{ id }" label="Cantidad">
                  <KmNumero
                    :id="id"
                    v-model="salida.cantidad"
                    :min="0"
                    :decimales="3"
                    :controles="false"
                  />
                </KmField>
              </div>
              <div v-if="salida.tipo === 'insumo'" class="w-28">
                <KmField v-slot="{ id }" label="% del costo">
                  <KmNumero
                    :id="id"
                    v-model="salida.reparto"
                    :min="0"
                    :max="100"
                    :decimales="2"
                    sufijo="%"
                    :controles="false"
                  />
                </KmField>
              </div>
              <KmBotonIcono
                icono="eliminar"
                etiqueta="Quitar salida"
                :contexto="nombreInsumo(salida.insumoId)"
                @click="quitarSalida(indice)"
              />
              <p
                v-if="salida.tipo === 'insumo' && salida.cantidad > 0"
                class="basis-full text-xs text-tenue"
              >
                Costo resultante:
                <strong class="text-tinta tabular-nums">{{
                  formatearSoles(costoUnitarioSalida(salida))
                }}</strong>
                por
                {{
                  salida.insumoId
                    ? etiquetaUnidad[insumo(salida.insumoId)?.unidad ?? 'unidad']
                    : 'unidad'
                }}
              </p>
            </li>
          </ul>

          <p
            class="text-xs"
            :class="Math.abs(sumaReparto - 100) > 0.01 ? 'text-vino' : 'text-tenue'"
          >
            El reparto suma
            <strong class="tabular-nums">{{ Math.round(sumaReparto * 100) / 100 }} %</strong> de
            {{ formatearSoles(costoEntradasBorrador) }}. La merma no absorbe costo: lo pagan las
            demás salidas.
          </p>
        </div>

        <KmCheckbox
          v-model="activo"
          ayuda="Una transformación inactiva no recalcula costos ni se puede procesar."
        >
          Transformación activa
        </KmCheckbox>
      </div>

      <template #footer>
        <KmButton variante="secundario" :disabled="guardando" @click="abierto = false">
          Cancelar
        </KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar transformación</KmButton>
      </template>
    </KmDrawer>

    <KmModal v-model="procesarAbierto" :titulo="`Procesar · ${aProcesar?.nombre ?? ''}`">
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Almacén" ayuda="Se consume y se produce en el mismo sitio.">
          <KmSelect :id="id" v-model="almacenId" :opciones="opcionesAlmacen" />
        </KmField>
        <KmField v-slot="{ id }" label="Tandas" ayuda="0.5 procesa media receta.">
          <KmNumero :id="id" v-model="veces" :min="0" :decimales="3" />
        </KmField>
        <div
          v-if="aProcesar && veces"
          class="rounded-card border border-dashed border-linea p-3 text-sm"
        >
          <p class="rs-etiqueta text-tenue">Se consumirá</p>
          <ul class="mt-1 flex flex-col gap-0.5">
            <li v-for="e in aProcesar.entradas" :key="e.insumoId" class="text-tinta">
              {{ cantidadDe(e.insumoId, e.cantidad * Number(veces)) }} de
              {{ nombreInsumo(e.insumoId) }}
            </li>
          </ul>
          <p class="rs-etiqueta mt-3 text-tenue">Entrará</p>
          <ul class="mt-1 flex flex-col gap-0.5">
            <li
              v-for="s in aProcesar.salidas.filter((x) => x.tipo === 'insumo')"
              :key="s.id"
              class="text-tinta"
            >
              {{ cantidadDe(s.insumoId, s.cantidad * Number(veces)) }} de
              {{ nombreInsumo(s.insumoId) }}
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <KmButton variante="secundario" :disabled="procesando" @click="procesarAbierto = false">
          Cancelar
        </KmButton>
        <KmButton :cargando="procesando" @click="confirmarProcesar">Procesar</KmButton>
      </template>
    </KmModal>

    <KmConfirm
      v-model="confirmarEliminarAbierto"
      titulo="Eliminar transformación"
      :mensaje="`Se elimina «${aEliminar?.nombre ?? ''}». Los insumos que salían de ella dejan de recalcular su costo.`"
      texto-confirmar="Eliminar"
      peligroso
      @confirmar="confirmarEliminar"
    />
  </div>
</template>
