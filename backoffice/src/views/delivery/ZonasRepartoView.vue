<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { zonasRepartoService } from '@/services/delivery.service'
import { tienePermiso, valorConfig } from '@/services/parametros.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, NuevaZonaReparto, ZonaReparto } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { formatearSoles } from '@/utils/formato'

/**
 * Zonas de reparto del local (F6.2, D-011). La zona es del local porque la
 * cobertura y el tiempo prometido dependen de dónde está la cocina, y solo
 * vale para el reparto propio: las apps de delivery ponen su logística.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()

const zonas = shallowRef<ZonaReparto[]>([])
const cargando = ref(false)
const puedeEditar = computed(() => tienePermiso(auth.usuario?.id, 'delivery.zonas'))

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  try {
    zonas.value = await zonasRepartoService.listar(localStore.localId)
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar las zonas.')
  } finally {
    cargando.value = false
  }
}
watch(() => localStore.localId, cargar, { immediate: true })

/** Cómo trata este local lo que queda fuera de su cobertura. */
const fueraDeCobertura = computed(() =>
  localStore.localId
    ? valorConfig<string>('delivery.fueraDeCobertura', localStore.localId)
    : 'avisar',
)
const cobraEnvio = computed(() =>
  localStore.localId ? valorConfig<boolean>('delivery.cobrarEnvio', localStore.localId) : true,
)

const distritosCubiertos = computed(() =>
  zonas.value.filter((z) => z.activa).reduce((s, z) => s + z.distritos.length, 0),
)

// ── Editor ───────────────────────────────────────────────────────────────────

const abierto = ref(false)
const editando = shallowRef<ZonaReparto | null>(null)
const guardando = ref(false)
const errores = ref<Record<string, string>>({})

const nombre = ref('')
const distritos = ref<string[]>([])
const nuevoDistrito = ref('')
const costoEnvio = ref(0)
const pedidoMinimo = ref(0)
const tiempoEstimadoMin = ref(40)
const conEnvioGratis = ref(false)
const envioGratisDesde = ref(0)
const nota = ref('')
const activa = ref(true)

const sugerencias = computed<OpcionSelect[]>(() =>
  zonasRepartoService
    .distritosConocidos()
    .filter((d) => !distritos.value.some((x) => x.toLowerCase() === d.toLowerCase()))
    .map((d) => ({ valor: d, etiqueta: d })),
)

function abrir(z?: ZonaReparto) {
  editando.value = z ?? null
  errores.value = {}
  nombre.value = z?.nombre ?? ''
  distritos.value = [...(z?.distritos ?? [])]
  nuevoDistrito.value = ''
  costoEnvio.value = z?.costoEnvio ?? 0
  pedidoMinimo.value = z?.pedidoMinimo ?? 0
  tiempoEstimadoMin.value = z?.tiempoEstimadoMin ?? 40
  conEnvioGratis.value = z?.envioGratisDesde !== undefined
  envioGratisDesde.value = z?.envioGratisDesde ?? 0
  nota.value = z?.nota ?? ''
  activa.value = z?.activa ?? true
  abierto.value = true
}

function agregarDistrito(valor?: string) {
  const d = (valor ?? nuevoDistrito.value).trim()
  if (!d) return
  if (distritos.value.some((x) => x.toLowerCase() === d.toLowerCase())) {
    ui.error(`${d} ya está en esta zona.`)
    return
  }
  distritos.value = [...distritos.value, d]
  nuevoDistrito.value = ''
}

const quitarDistrito = (d: string) => (distritos.value = distritos.value.filter((x) => x !== d))

async function guardar() {
  if (!localStore.localId) return
  guardando.value = true
  errores.value = {}
  const datos: NuevaZonaReparto = {
    nombre: nombre.value,
    localId: localStore.localId,
    distritos: distritos.value,
    costoEnvio: costoEnvio.value,
    pedidoMinimo: pedidoMinimo.value,
    tiempoEstimadoMin: tiempoEstimadoMin.value,
    envioGratisDesde: conEnvioGratis.value ? envioGratisDesde.value : undefined,
    nota: nota.value,
    activa: activa.value,
  }
  try {
    if (editando.value)
      await zonasRepartoService.actualizar(editando.value.id, datos, auth.usuario?.id)
    else await zonasRepartoService.crear(datos, auth.usuario?.id)
    ui.exito(`Zona «${datos.nombre.trim()}» guardada.`)
    abierto.value = false
    await cargar()
  } catch (e) {
    const error = e as ApiError
    errores.value = error.campos ?? {}
    ui.error(error.mensaje ?? 'No se pudo guardar la zona.')
  } finally {
    guardando.value = false
  }
}

async function eliminar(z: ZonaReparto) {
  try {
    await zonasRepartoService.eliminar(z.id, auth.usuario?.id)
    ui.exito(`Zona «${z.nombre}» eliminada.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar la zona.')
  }
}

// ── ¿Se llega? ───────────────────────────────────────────────────────────────

const pruebaDistrito = ref('')
const pruebaMonto = ref(60)
const prueba = computed(() =>
  localStore.localId && pruebaDistrito.value
    ? zonasRepartoService.cobertura(localStore.localId, pruebaDistrito.value, pruebaMonto.value)
    : null,
)
const opcionesPrueba = computed<OpcionSelect[]>(() =>
  zonasRepartoService.distritosConocidos().map((d) => ({ valor: d, etiqueta: d })),
)
const tonoPrueba = computed(() =>
  prueba.value?.estado === 'cubierto' ? 'verde' : prueba.value?.bloquea ? 'vino' : 'laton',
)
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <p class="rs-etiqueta text-laton-texto">Reparto propio</p>
          <h2 class="rs-titulo-seccion mt-1 text-tinta">Zonas de reparto</h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            Hasta dónde llega la moto de este local, qué cuesta el envío y en cuánto tiempo se
            promete. Las apps de delivery no tienen zona: ponen su logística y cobran su comisión.
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-tenue">
            <KmBadge :tono="fueraDeCobertura === 'bloquear' ? 'vino' : 'laton'">
              Fuera de cobertura: {{ fueraDeCobertura === 'bloquear' ? 'se bloquea' : 'se avisa' }}
            </KmBadge>
            <KmBadge v-if="!cobraEnvio" tono="verde">Este local no cobra envío</KmBadge>
            <span>
              {{ distritosCubiertos }} distrito(s) cubiertos por
              {{ zonas.filter((z) => z.activa).length }} zona(s) activa(s)
            </span>
          </div>
        </div>
        <KmButton :disabled="!localStore.localId || !puedeEditar" @click="abrir()">
          Nueva zona
        </KmButton>
      </div>

      <div class="px-6 pt-4 pb-6">
        <ul class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <li
            v-for="z in zonas"
            :key="z.id"
            class="flex flex-col gap-3 rounded-card border border-linea p-4"
            :class="z.activa ? '' : 'opacity-60'"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-tinta">{{ z.nombre }}</p>
                <p class="text-xs text-tenue">{{ z.tiempoEstimadoMin }} min estimados</p>
              </div>
              <KmBadge v-if="!z.activa" tono="neutro">Inactiva</KmBadge>
            </div>

            <ul class="flex flex-wrap gap-1.5">
              <li v-for="d in z.distritos" :key="d">
                <KmBadge tono="pizarra">{{ d }}</KmBadge>
              </li>
            </ul>

            <dl class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt class="text-xs text-tenue">Envío</dt>
                <dd class="font-semibold text-tinta tabular-nums">
                  {{ formatearSoles(z.costoEnvio) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-tenue">Pedido mínimo</dt>
                <dd class="font-semibold text-tinta tabular-nums">
                  {{ z.pedidoMinimo ? formatearSoles(z.pedidoMinimo) : 'Sin mínimo' }}
                </dd>
              </div>
              <div v-if="z.envioGratisDesde !== undefined" class="col-span-2">
                <dt class="text-xs text-tenue">Envío gratis desde</dt>
                <dd class="font-semibold text-verde tabular-nums">
                  {{ formatearSoles(z.envioGratisDesde) }}
                </dd>
              </div>
            </dl>

            <p v-if="z.nota" class="text-xs text-tenue">{{ z.nota }}</p>

            <div class="mt-auto flex justify-end gap-1">
              <KmBotonIcono
                icono="editar"
                etiqueta="Editar"
                :contexto="z.nombre"
                :disabled="!puedeEditar"
                @click="abrir(z)"
              />
              <KmBotonIcono
                icono="eliminar"
                tono="peligro"
                etiqueta="Eliminar"
                :contexto="z.nombre"
                :disabled="!puedeEditar"
                @click="eliminar(z)"
              />
            </div>
          </li>
          <li v-if="!zonas.length && !cargando" class="text-sm text-tenue">
            Este local todavía no reparte a ninguna zona: crea la primera con los distritos vecinos.
          </li>
        </ul>
      </div>
    </KmCard>

    <KmCard>
      <h3 class="rs-titulo-seccion text-tinta">¿Se llega?</h3>
      <p class="mt-1 max-w-3xl text-sm text-tenue">
        Lo que contestaría el POS con una dirección y una cuenta delante. Es la misma respuesta que
        verá el cajero, palabra por palabra.
      </p>
      <div class="mt-4 flex flex-wrap items-end gap-3">
        <KmField v-slot="{ id }" label="Distrito">
          <KmSelect
            :id="id"
            v-model="pruebaDistrito"
            :opciones="opcionesPrueba"
            placeholder="Elige un distrito"
          />
        </KmField>
        <KmField v-slot="{ id }" label="Cuenta">
          <KmNumero :id="id" v-model="pruebaMonto" prefijo="S/" :decimales="2" :min="0" />
        </KmField>
      </div>
      <div v-if="prueba" class="mt-4 flex flex-col gap-2 rounded-card border border-linea p-4">
        <div class="flex flex-wrap items-center gap-2">
          <KmBadge :tono="tonoPrueba" punto>
            {{
              prueba.estado === 'cubierto'
                ? 'Se llega'
                : prueba.estado === 'bajoMinimo'
                  ? 'Bajo el mínimo'
                  : 'Fuera de cobertura'
            }}
          </KmBadge>
          <KmBadge v-if="prueba.bloquea" tono="vino">No se deja cobrar</KmBadge>
          <KmBadge v-else-if="prueba.estado !== 'cubierto'" tono="laton">Se avisa y sigue</KmBadge>
        </div>
        <p class="text-sm text-tinta">{{ prueba.explicacion }}</p>
        <p class="text-sm text-tenue tabular-nums">
          Envío:
          <span class="font-semibold text-tinta">{{ formatearSoles(prueba.costoEnvio) }}</span>
          <template v-if="prueba.tiempoEstimadoMin">
            · {{ prueba.tiempoEstimadoMin }} min
          </template>
          · Total con envío:
          <span class="font-semibold text-tinta">
            {{ formatearSoles(pruebaMonto + prueba.costoEnvio) }}
          </span>
        </p>
      </div>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? `Editar ${editando.nombre}` : 'Nueva zona de reparto'"
      subtitulo="La cobertura es de este local"
      ancho="lg"
    >
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Nombre" requerido :error="errores.nombre">
          <KmInput :id="id" v-model="nombre" placeholder="Cercana, Intermedia, Oficinas" />
        </KmField>

        <KmField
          label="Distritos"
          requerido
          :error="errores.distritos"
          ayuda="Un distrito solo puede estar en una zona de este local: el POS necesita un solo costo y un solo tiempo."
        >
          <div class="flex flex-col gap-2">
            <ul v-if="distritos.length" class="flex flex-wrap gap-1.5">
              <li v-for="d in distritos" :key="d">
                <button
                  type="button"
                  class="rs-tono rs-tono-pizarra inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                  :aria-label="`Quitar ${d}`"
                  @click="quitarDistrito(d)"
                >
                  {{ d }}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            </ul>
            <div class="flex flex-wrap items-center gap-2">
              <KmInput
                v-model="nuevoDistrito"
                placeholder="Escribe un distrito y pulsa Añadir"
                @keydown.enter.prevent="agregarDistrito()"
              />
              <KmButton variante="secundario" @click="agregarDistrito()">Añadir</KmButton>
            </div>
            <div v-if="sugerencias.length" class="flex flex-wrap items-center gap-1.5">
              <span class="text-xs text-tenue">Ya usados:</span>
              <button
                v-for="s in sugerencias.slice(0, 8)"
                :key="String(s.valor)"
                type="button"
                class="rounded-full border border-linea px-2.5 py-1 text-[11px] text-tenue hover:text-tinta"
                @click="agregarDistrito(String(s.valor))"
              >
                + {{ s.etiqueta }}
              </button>
            </div>
          </div>
        </KmField>

        <div class="grid gap-4 sm:grid-cols-3">
          <KmField v-slot="{ id }" label="Costo de envío" :error="errores.costoEnvio">
            <KmNumero :id="id" v-model="costoEnvio" prefijo="S/" :decimales="2" :min="0" />
          </KmField>
          <KmField
            v-slot="{ id }"
            label="Pedido mínimo"
            :error="errores.pedidoMinimo"
            ayuda="0: sin mínimo"
          >
            <KmNumero :id="id" v-model="pedidoMinimo" prefijo="S/" :decimales="2" :min="0" />
          </KmField>
          <KmField v-slot="{ id }" label="Tiempo estimado" :error="errores.tiempoEstimadoMin">
            <KmNumero :id="id" v-model="tiempoEstimadoMin" sufijo="min" :min="1" controles />
          </KmField>
        </div>

        <KmSwitch
          v-model="conEnvioGratis"
          etiqueta="Envío gratis desde un monto"
          descripcion="«A San Isidro, gratis desde 80»: es de la zona, no una promoción aparte."
        />
        <KmField
          v-if="conEnvioGratis"
          v-slot="{ id }"
          label="Envío gratis desde"
          :error="errores.envioGratisDesde"
        >
          <KmNumero :id="id" v-model="envioGratisDesde" prefijo="S/" :decimales="2" :min="0" />
        </KmField>

        <KmField v-slot="{ id }" label="Nota">
          <KmInput :id="id" v-model="nota" placeholder="Solo hasta las 21:00, hora punta…" />
        </KmField>

        <KmSwitch
          v-model="activa"
          etiqueta="Zona activa"
          descripcion="Una zona inactiva deja de cubrir sus distritos, sin perder su configuración."
        />
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar</KmButton>
      </template>
    </KmDrawer>
  </div>
</template>
