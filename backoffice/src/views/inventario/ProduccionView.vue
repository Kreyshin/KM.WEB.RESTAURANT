<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useAccesoZonas } from '@/composables/useAccesoZonas'
import { useCatalogos } from '@/composables/useCatalogos'
import { transformacionesService } from '@/services/abastecimiento.service'
import { valorConfig } from '@/services/parametros.service'
import { partesService, type DatosParte } from '@/services/partes.service'
import { recepcionService } from '@/services/recepcion.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  EntradaParte,
  EstadoParte,
  ParteProduccion,
  PorProcesar,
  SalidaParte,
  Transformacion,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana, TonoMesa } from '@/types/ui'
import { formatearCantidad, formatearFecha, formatearSoles } from '@/utils/formato'

/**
 * Producción (F4.5): lo recibido que queda por procesar y las partes de
 * producción que registran cada transformación real. En modo simple se aplica
 * lo esperado; en modo detallado se anotan reales y la diferencia se explica.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()
const catalogos = useCatalogos(['insumos', 'zonas'])
const { insumo, zonas, nombreZona } = catalogos
const acceso = useAccesoZonas(zonas)

const transformaciones = shallowRef<Transformacion[]>([])
const partes = shallowRef<ParteProduccion[]>([])
const porProcesar = shallowRef<PorProcesar[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  error.value = ''
  try {
    const [ts, ps, pp] = await Promise.all([
      transformacionesService.todos(),
      partesService.listar(localStore.localId),
      recepcionService.porProcesar(localStore.localId),
      catalogos.recargar(),
    ])
    transformaciones.value = ts.filter((t) => t.activo)
    partes.value = ps
    porProcesar.value = pp.filter((p) => acceso.puedeVer(p.zonaId))
  } catch (e) {
    error.value = (e as ApiError).mensaje ?? 'No se pudo cargar la producción.'
  } finally {
    cargando.value = false
  }
}
watch(() => localStore.localId, cargar, { immediate: true })

const modo = computed(() =>
  localStore.localId ? partesService.modoProduccion(localStore.localId) : 'simple',
)
const vidaUtilValidada = computed(() => valorConfig<string>('produccion.vidaUtil') === 'validada')

const zonasGestion = computed<OpcionSelect[]>(() =>
  acceso.permitidos.value
    .filter((a) => acceso.puedeGestionar(a.id))
    .map((a) => ({ valor: a.id, etiqueta: a.nombre })),
)
const transformacion = (id: string) => transformaciones.value.find((t) => t.id === id)
const cantidadInsumo = (id: string | undefined, n: number) => {
  const i = insumo(id)
  return i ? formatearCantidad(n, i.unidad) : String(n)
}

// ── Pestañas ──

type Pestanya = 'procesar' | 'proceso' | 'cerradas'
const pestana = ref<Pestanya>('procesar')
const enProceso = computed(() => partes.value.filter((p) => p.estado === 'enProceso'))
const cerradas = computed(() => partes.value.filter((p) => p.estado !== 'enProceso'))
const pestanas = computed<Pestana[]>(() => [
  { valor: 'procesar', etiqueta: 'Por procesar', contador: porProcesar.value.length },
  { valor: 'proceso', etiqueta: 'En proceso', contador: enProceso.value.length },
  { valor: 'cerradas', etiqueta: 'Partes cerradas', contador: cerradas.value.length },
])

const tonoEstado: Record<EstadoParte, TonoMesa> = {
  enProceso: 'laton',
  terminada: 'verde',
  rechazada: 'vino',
}
const etiquetaEstado: Record<EstadoParte, string> = {
  enProceso: 'En proceso',
  terminada: 'Terminada',
  rechazada: 'Rechazada',
}

const columnasPartes: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Parte', clase: 'w-40' },
  { clave: 'transformacion', etiqueta: 'Transformación' },
  { clave: 'zona', etiqueta: 'Zona', clase: 'w-44' },
  { clave: 'resultado', etiqueta: 'Resultado' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-40' },
  { clave: 'acciones', etiqueta: '', clase: 'w-16 text-right' },
]
const columnasProcesar: ColumnaTabla[] = [
  { clave: 'insumo', etiqueta: 'Insumo' },
  { clave: 'zona', etiqueta: 'Zona', clase: 'w-48' },
  { clave: 'pendiente', etiqueta: 'Pendiente', clase: 'w-40 text-right' },
  { clave: 'fecha', etiqueta: 'Recibido', clase: 'w-40' },
  { clave: 'acciones', etiqueta: '', clase: 'w-32 text-right' },
]

/** Transformación activa que consume un insumo. */
const queConsume = (insumoId: string) =>
  transformaciones.value.find((t) => t.entradas.some((e) => e.insumoId === insumoId))

// ── Editor de parte ──

const abierto = ref(false)
const editando = shallowRef<ParteProduccion | null>(null)
const transformacionId = ref('')
const zonaId = ref('')
const factor = ref(1)
const entradas = ref<EntradaParte[]>([])
const salidas = ref<SalidaParte[]>([])
const motivoDiferencia = ref('')
const vencimiento = ref('')
const guardando = ref(false)

const soloLectura = computed(() => !!editando.value && editando.value.estado !== 'enProceso')
const detallado = computed(() => modo.value === 'detallado' && !soloLectura.value)

const opcionesTransformacion = computed<OpcionSelect[]>(() =>
  transformaciones.value.map((t) => ({ valor: t.id, etiqueta: t.nombre })),
)

function recalcular() {
  if (!transformacionId.value || !(factor.value > 0)) return
  const e = partesService.escalar(transformacionId.value, factor.value)
  entradas.value = e.entradas
  salidas.value = e.salidas
  if (!vidaUtilValidada.value || !vencimiento.value) {
    vencimiento.value = partesService.vencimientoPropuesto(transformacionId.value) ?? ''
  }
}

/** La cantidad de la entrada principal define cuántas tandas se procesan. */
const principal = computed(() => transformacion(transformacionId.value)?.entradas[0])
const cantidadPrincipal = computed({
  get: () => Math.round(factor.value * (principal.value?.cantidad ?? 0) * 1000) / 1000,
  set: (v: number) => {
    if (!principal.value?.cantidad) return
    factor.value = v / principal.value.cantidad
    recalcular()
  },
})

function abrirNueva(insumoId?: string, cantidad?: number, zona?: string) {
  editando.value = null
  const t = insumoId ? queConsume(insumoId) : transformaciones.value[0]
  abriendo = transformacionId.value !== (t?.id ?? '')
  transformacionId.value = t?.id ?? ''
  zonaId.value = zona ?? (zonasGestion.value[0]?.valor as string) ?? ''
  const base =
    t?.entradas.find((e) => e.insumoId === insumoId)?.cantidad ?? t?.entradas[0]?.cantidad
  factor.value = cantidad && base ? cantidad / base : 1
  motivoDiferencia.value = ''
  vencimiento.value = ''
  recalcular()
  abierto.value = true
}

function abrir(p: ParteProduccion) {
  editando.value = p
  abriendo = transformacionId.value !== p.transformacionId
  transformacionId.value = p.transformacionId
  zonaId.value = p.zonaId
  factor.value = p.factor
  entradas.value = p.entradas.map((e) => ({ ...e }))
  salidas.value = p.salidas.map((s) => ({ ...s }))
  motivoDiferencia.value = p.motivoDiferencia ?? ''
  vencimiento.value = p.vencimiento ?? ''
  abierto.value = true
}

/** Al abrir el editor se fija la transformación por código: eso no es un cambio del usuario. */
let abriendo = false

watch(transformacionId, (id, anterior) => {
  if (abriendo) {
    abriendo = false
    return
  }
  if (id !== anterior && !soloLectura.value) {
    factor.value = 1
    recalcular()
  }
})

const dif = computed(() =>
  partesService.diferencia({ entradas: entradas.value, salidas: salidas.value }),
)

function datos(): DatosParte {
  return {
    localId: localStore.localId!,
    zonaId: zonaId.value,
    transformacionId: transformacionId.value,
    factor: factor.value,
    entradas: entradas.value,
    salidas: salidas.value,
    motivoDiferencia: motivoDiferencia.value,
    vencimiento: vencimiento.value || undefined,
  }
}

async function ejecutar(accion: 'proceso' | 'terminar') {
  guardando.value = true
  try {
    const p =
      accion === 'proceso'
        ? await partesService.guardarEnProceso(datos(), auth.usuario!.id, editando.value?.id)
        : await partesService.terminar(datos(), auth.usuario!.id, editando.value?.id)
    ui.exito(
      accion === 'proceso'
        ? `${p.numero} guardada en proceso.`
        : `${p.numero} terminada: el stock ya refleja lo producido.`,
    )
    abierto.value = false
    pestana.value = accion === 'proceso' ? 'proceso' : 'cerradas'
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar la parte.')
  } finally {
    guardando.value = false
  }
}

async function eliminar() {
  if (!editando.value) return
  try {
    await partesService.eliminarEnProceso(editando.value.id)
    ui.exito(`${editando.value.numero} eliminada.`)
    abierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  }
}

const modalRechazo = ref(false)
const motivoRechazo = ref('')
async function rechazar() {
  try {
    const p = await partesService.rechazar(
      datos(),
      motivoRechazo.value,
      auth.usuario!.id,
      editando.value?.id,
    )
    ui.exito(`${p.numero} rechazada: se consumieron las entradas y no entró nada al stock.`)
    modalRechazo.value = false
    abierto.value = false
    pestana.value = 'cerradas'
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo rechazar.')
  }
}

function resultado(p: ParteProduccion) {
  if (p.estado === 'rechazada') return p.motivoRechazo ?? ''
  return p.salidas
    .filter((s) => s.tipo === 'insumo' && s.real > 0)
    .map((s) => `${insumo(s.insumoId)?.nombre} ${cantidadInsumo(s.insumoId, s.real)}`)
    .join(' · ')
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <h2 class="rs-titulo-seccion text-tinta">Producción en {{ localStore.local?.nombre }}</h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            Registra cada transformación real: despiece del pescado, leche de tigre del día. Consume
            las entradas y da de alta lo que sale con su lote y vencimiento.
          </p>
          <p class="mt-2 text-xs text-tenue">
            Registro
            <KmBadge :tono="modo === 'detallado' ? 'laton' : 'neutro'">
              {{ modo === 'detallado' ? 'Detallado' : 'Simple' }}
            </KmBadge>
            · vida útil {{ vidaUtilValidada ? 'validada' : 'simple' }} ·
            <RouterLink :to="{ name: 'config-local' }" class="text-verde underline">
              cambiar en Configuración
            </RouterLink>
          </p>
        </div>
        <KmButton
          :disabled="!zonasGestion.length || !transformaciones.length"
          @click="abrirNueva()"
        >
          Nueva parte
        </KmButton>
      </div>

      <div class="px-6 pt-4">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Producción">
          <span />
        </KmTabs>
      </div>

      <div class="mt-2 border-t border-linea">
        <KmTable
          v-if="pestana === 'procesar'"
          :columnas="columnasProcesar"
          :filas="porProcesar"
          :cargando="cargando"
          :error="error || null"
          mensaje-vacio="No hay nada por procesar. Aquí aparece lo recibido que llega entero."
        >
          <template #col-insumo="{ fila }">
            <p class="font-medium text-tinta">{{ insumo(fila.insumoId)?.nombre }}</p>
            <p class="text-xs text-tenue">
              {{ queConsume(fila.insumoId)?.nombre ?? 'Sin transformación que lo consuma' }}
            </p>
          </template>
          <template #col-zona="{ fila }">{{ nombreZona(fila.zonaId) }}</template>
          <template #col-pendiente="{ fila }">
            <span class="font-semibold text-tinta tabular-nums">
              {{ cantidadInsumo(fila.insumoId, fila.pendiente) }}
            </span>
          </template>
          <template #col-fecha="{ fila }">{{ formatearFecha(fila.fecha) }}</template>
          <template #col-acciones="{ fila }">
            <KmButton
              tamano="sm"
              :disabled="!queConsume(fila.insumoId) || !acceso.puedeGestionar(fila.zonaId)"
              @click="abrirNueva(fila.insumoId, fila.pendiente, fila.zonaId)"
            >
              Procesar
            </KmButton>
          </template>
        </KmTable>

        <KmTable
          v-else
          :columnas="columnasPartes"
          :filas="pestana === 'proceso' ? enProceso : cerradas"
          :cargando="cargando"
          :error="error || null"
          :mensaje-vacio="
            pestana === 'proceso' ? 'No hay partes en proceso.' : 'Aún no hay partes cerradas.'
          "
        >
          <template #col-numero="{ fila }">
            <p class="font-semibold text-tinta tabular-nums">{{ fila.numero }}</p>
            <p class="text-xs text-tenue">{{ formatearFecha(fila.fecha) }}</p>
          </template>
          <template #col-transformacion="{ fila }">
            {{ transformacion(fila.transformacionId)?.nombre ?? '—' }}
            <span class="text-xs text-tenue">× {{ Math.round(fila.factor * 100) / 100 }}</span>
          </template>
          <template #col-zona="{ fila }">{{ nombreZona(fila.zonaId) }}</template>
          <template #col-resultado="{ fila }">
            <p class="text-sm">{{ resultado(fila) }}</p>
            <p v-if="fila.mermaAdicional" class="text-xs text-laton-texto">
              Merma no esperada {{ fila.mermaAdicional }} · {{ fila.motivoDiferencia }}
            </p>
            <p v-if="fila.costoReal !== undefined" class="text-xs text-tenue">
              Costo de entradas {{ formatearSoles(fila.costoReal) }}
            </p>
          </template>
          <template #col-estado="{ fila }">
            <KmBadge :tono="tonoEstado[fila.estado]" punto>{{
              etiquetaEstado[fila.estado]
            }}</KmBadge>
          </template>
          <template #col-acciones="{ fila }">
            <KmBotonIcono
              :icono="fila.estado === 'enProceso' ? 'editar' : 'ver'"
              :etiqueta="fila.estado === 'enProceso' ? 'Continuar' : 'Ver'"
              :contexto="fila.numero"
              @click="abrir(fila)"
            />
          </template>
        </KmTable>
      </div>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? editando.numero : 'Nueva parte de producción'"
      :subtitulo="
        editando
          ? `${etiquetaEstado[editando.estado]} · ${formatearFecha(editando.fecha)}`
          : modo === 'detallado'
            ? 'Anota lo que entró y salió realmente.'
            : 'Se aplica lo esperado de la transformación.'
      "
      ancho="xl"
    >
      <div class="flex flex-col gap-5">
        <div class="grid gap-3 sm:grid-cols-3">
          <KmField v-slot="{ id }" label="Transformación" requerido>
            <KmSelect
              :id="id"
              v-model="transformacionId"
              :opciones="opcionesTransformacion"
              :disabled="soloLectura"
            />
          </KmField>
          <KmField v-slot="{ id }" label="Zona" requerido>
            <KmSelect :id="id" v-model="zonaId" :opciones="zonasGestion" :disabled="soloLectura" />
          </KmField>
          <KmField
            v-slot="{ id }"
            :label="`Cuánto ${principal ? insumo(principal.insumoId)?.nombre : ''} se procesa`"
          >
            <KmNumero
              :id="id"
              v-model="cantidadPrincipal"
              :min="0"
              :decimales="3"
              :disabled="soloLectura"
              :sufijo="principal ? insumo(principal.insumoId)?.unidad : ''"
            />
          </KmField>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <section class="rounded-card border border-linea">
            <p class="border-b border-linea px-4 py-2.5 text-sm font-medium text-tinta">Entra</p>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-tenue">
                  <th class="px-4 py-2 font-medium">Insumo</th>
                  <th class="px-2 py-2 text-right font-medium">Esperado</th>
                  <th class="w-40 px-4 py-2 font-medium">Real</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in entradas" :key="e.insumoId" class="border-t border-linea">
                  <td class="px-4 py-2">{{ insumo(e.insumoId)?.nombre }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-tenue">
                    {{ cantidadInsumo(e.insumoId, e.esperada) }}
                  </td>
                  <td class="px-4 py-2">
                    <KmNumero
                      v-if="detallado"
                      v-model="e.real"
                      :min="0"
                      :decimales="3"
                      :controles="false"
                      :aria-label="`Real de ${insumo(e.insumoId)?.nombre}`"
                    />
                    <span v-else class="tabular-nums">{{
                      cantidadInsumo(e.insumoId, e.real)
                    }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="rounded-card border border-linea">
            <p class="border-b border-linea px-4 py-2.5 text-sm font-medium text-tinta">Sale</p>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-tenue">
                  <th class="px-4 py-2 font-medium">Salida</th>
                  <th class="px-2 py-2 text-right font-medium">Esperado</th>
                  <th class="w-40 px-4 py-2 font-medium">Real</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in salidas" :key="s.salidaId" class="border-t border-linea">
                  <td class="px-4 py-2">
                    <template v-if="s.tipo === 'insumo'">{{ insumo(s.insumoId)?.nombre }}</template>
                    <KmBadge v-else tono="vino">Merma esperada</KmBadge>
                  </td>
                  <td class="px-2 py-2 text-right tabular-nums text-tenue">
                    {{ s.tipo === 'insumo' ? cantidadInsumo(s.insumoId, s.esperada) : s.esperada }}
                  </td>
                  <td class="px-4 py-2">
                    <KmNumero
                      v-if="detallado"
                      v-model="s.real"
                      :min="0"
                      :decimales="3"
                      :controles="false"
                      aria-label="Cantidad real"
                    />
                    <span v-else class="tabular-nums">
                      {{ s.tipo === 'insumo' ? cantidadInsumo(s.insumoId, s.real) : s.real }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <div
          v-if="detallado && dif !== null"
          class="rounded-card border px-4 py-3 text-sm"
          :class="
            Math.abs(dif) < 0.0005
              ? 'rs-tono rs-tono-verde'
              : dif < 0
                ? 'rs-tono rs-tono-vino'
                : 'rs-tono rs-tono-laton'
          "
        >
          <p v-if="Math.abs(dif) < 0.0005">
            <strong>Cuadra:</strong> todo lo que entró está explicado.
          </p>
          <p v-else-if="dif < 0">
            <strong>Sale {{ -dif }} más de lo que entra.</strong> Revisa las cantidades reales.
          </p>
          <div v-else class="flex flex-col gap-2">
            <p>
              <strong>Faltan {{ dif }} por explicar.</strong> Se enviarán a merma con el motivo que
              indiques.
            </p>
            <KmInput v-model="motivoDiferencia" placeholder="Por ejemplo: filete roto al cortar" />
          </div>
        </div>
        <p v-else-if="detallado" class="text-xs text-tenue">
          Entradas y salidas se miden en unidades distintas: no se calcula la diferencia.
        </p>

        <div class="grid gap-3 sm:grid-cols-3">
          <KmField
            v-slot="{ id }"
            label="Vence"
            :ayuda="
              vidaUtilValidada
                ? 'Sale de la vida útil aprobada en el insumo.'
                : 'Propuesto desde la vida útil del insumo; puedes cambiarlo.'
            "
          >
            <KmInput
              :id="id"
              v-model="vencimiento"
              type="date"
              :disabled="soloLectura || vidaUtilValidada"
            />
          </KmField>
          <p v-if="editando?.costoReal !== undefined" class="self-end text-sm text-tenue">
            Costo de entradas:
            <strong class="text-tinta tabular-nums">{{
              formatearSoles(editando.costoReal)
            }}</strong>
          </p>
        </div>
      </div>

      <template #footer>
        <template v-if="!soloLectura">
          <KmButton v-if="editando" variante="fantasma" class="mr-auto text-vino" @click="eliminar">
            Eliminar
          </KmButton>
          <KmButton
            variante="secundario"
            :class="editando ? '' : 'mr-auto'"
            @click="((motivoRechazo = ''), (modalRechazo = true))"
          >
            Rechazar
          </KmButton>
          <KmButton variante="secundario" :disabled="guardando" @click="ejecutar('proceso')">
            Guardar en proceso
          </KmButton>
          <KmButton :cargando="guardando" @click="ejecutar('terminar')">Terminar</KmButton>
        </template>
        <KmButton v-else variante="secundario" @click="abierto = false">Cerrar</KmButton>
      </template>
    </KmDrawer>

    <KmModal v-model="modalRechazo" titulo="Rechazar la producción" ancho="sm">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-tenue">
          Se consumen las entradas y no entra nada al stock. Queda registrado con su motivo.
        </p>
        <KmField v-slot="{ id }" label="Motivo" requerido>
          <KmInput
            :id="id"
            v-model="motivoRechazo"
            placeholder="Por ejemplo: pescado en mal estado"
          />
        </KmField>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="modalRechazo = false">Cancelar</KmButton>
        <KmButton variante="peligro" :disabled="!motivoRechazo.trim()" @click="rechazar">
          Rechazar
        </KmButton>
      </template>
    </KmModal>
  </div>
</template>
