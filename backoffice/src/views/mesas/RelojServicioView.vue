<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { mesasService } from '@/services/mesas.service'
import { reservasService, etiquetaEstadoReserva } from '@/services/clientes.service'
import { salonesService } from '@/services/salones.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Mesa, Reserva, Salon } from '@/types'
import type { OpcionSelect } from '@/types/ui'

/**
 * El reloj del servicio: mesas en filas, el turno en columnas de cuarto de hora.
 *
 * El plano de salón responde «¿dónde está cada mesa?» y el tablero «¿cómo va el
 * servicio ahora?». Esta pantalla responde la única pregunta que se hace en la
 * puerta con gente esperando: **«¿cuánto hay que esperar y dónde los siento?»**.
 *
 * El eje de tiempo de un restaurante no son días, son minutos, y la rotación
 * —cuántas veces gira una mesa en un servicio— es el número del negocio. Por
 * eso el reloj se lee en cuartos de hora y lleva una línea de «ahora» que se
 * mueve sola.
 */

const PASO_MIN = 15
const ANCHO_MESA = 156
/** Cuánto se considera «se libera enseguida» al buscar sitio. */
const MARGEN_ESPERA = 90

const localStore = useLocalStore()
const auth = useAuthStore()
const ui = useUiStore()

const mesas = ref<Mesa[]>([])
const salones = ref<Salon[]>([])
const reservas = ref<Reserva[]>([])
const { cargando, refrescando, iniciar, terminar } = useCarga()
const ahora = ref(new Date())

const seleccionada = ref<Reserva | null>(null)
const panelAbierto = ref(false)
const moviendoA = ref<string | number | undefined>('')

/** El grupo que acaba de entrar por la puerta, sin reserva. */
const enLaPuerta = ref(0)

const arrastre = ref<{
  reservaId: string
  sobre: string | null
  vetada: boolean
  dy: number
} | null>(null)

let reloj: number | undefined

const hoy = computed(() => ahora.value.toISOString().slice(0, 10))

// ── El eje de tiempo ─────────────────────────────────────────────────────────

const aMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

const aHora = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/**
 * La ventana del servicio se calcula de los datos, no se fija a mano: empieza
 * una hora antes de la primera reserva y termina una después de la última, y
 * si no hay nada reservado se enseña la tarde entera.
 */
const ventana = computed(() => {
  const vivas = reservas.value.filter((r) => r.estado !== 'cancelada' && r.estado !== 'noShow')
  if (!vivas.length) return { desde: 12 * 60, hasta: 24 * 60 }
  const inicios = vivas.map((r) => aMinutos(r.hora))
  const finales = vivas.map((r) => aMinutos(r.hora) + r.duracionMin)
  const desde = Math.floor((Math.min(...inicios) - 60) / 60) * 60
  const hasta = Math.ceil((Math.max(...finales) + 60) / 60) * 60
  return { desde: Math.max(0, desde), hasta: Math.min(24 * 60 + 60, hasta) }
})

const franjas = computed(() => {
  const { desde, hasta } = ventana.value
  return Array.from({ length: Math.ceil((hasta - desde) / PASO_MIN) }, (_, i) => {
    const min = desde + i * PASO_MIN
    return { min, hora: aHora(min), enPunto: min % 60 === 0, media: min % 30 === 0 }
  })
})

const columnas = computed(() => franjas.value.length)

const minutosAhora = computed(() => ahora.value.getHours() * 60 + ahora.value.getMinutes())

/** Posición de la línea de «ahora», en % del ancho del reloj. */
const posicionAhora = computed(() => {
  const { desde, hasta } = ventana.value
  if (minutosAhora.value < desde || minutosAhora.value > hasta) return null
  return ((minutosAhora.value - desde) / (hasta - desde)) * 100
})

// ── Los turnos ───────────────────────────────────────────────────────────────

interface Turno {
  reserva: Reserva
  izquierda: number
  ancho: number
}

function turnosDe(mesaId: string): Turno[] {
  const { desde, hasta } = ventana.value
  const total = hasta - desde
  return reservas.value
    .filter((r) => r.mesaIds.includes(mesaId) && r.estado !== 'cancelada' && r.estado !== 'noShow')
    .map((reserva) => {
      const i = Math.max(desde, aMinutos(reserva.hora))
      const f = Math.min(hasta, aMinutos(reserva.hora) + reserva.duracionMin)
      return {
        reserva,
        izquierda: ((i - desde) / total) * 100,
        ancho: ((f - i) / total) * 100,
      }
    })
    .filter((t) => t.ancho > 0)
}

/** Cuántas veces gira cada mesa en el servicio: el número del negocio. */
function rotacion(mesaId: string) {
  return reservas.value.filter(
    (r) => r.mesaIds.includes(mesaId) && r.estado !== 'cancelada' && r.estado !== 'noShow',
  ).length
}

/**
 * A qué hora queda libre una mesa a partir de ahora. `null` significa que ya
 * lo está, que es la respuesta que espera quien está de pie en la puerta.
 */
function libreDesde(mesaId: string): number | null {
  const ocupaciones = reservas.value
    .filter((r) => r.mesaIds.includes(mesaId) && r.estado !== 'cancelada' && r.estado !== 'noShow')
    .map((r) => ({ desde: aMinutos(r.hora), hasta: aMinutos(r.hora) + r.duracionMin }))
    .sort((a, b) => a.desde - b.desde)

  let momento = minutosAhora.value
  for (const o of ocupaciones) {
    if (o.hasta <= momento) continue
    if (o.desde > momento) break
    momento = o.hasta
  }
  return momento === minutosAhora.value ? null : momento
}

/**
 * Dónde sentar al grupo de la puerta. No basta con que la mesa esté libre:
 * tiene que caber la gente y no puede haber una reserva encima dentro de la
 * próxima hora, o se les levanta a media cena.
 */
const candidatas = computed(() => {
  if (!enLaPuerta.value) return new Map<string, number | null>()
  const mapa = new Map<string, number | null>()
  for (const m of mesas.value) {
    if (m.estado === 'inactiva' || m.capacidad < enLaPuerta.value) continue
    const libre = libreDesde(m.id)
    const espera = libre === null ? 0 : libre - minutosAhora.value
    if (espera <= MARGEN_ESPERA) mapa.set(m.id, libre)
  }
  return mapa
})

const mejorEspera = computed(() => {
  const esperas = [...candidatas.value.values()].map((l) =>
    l === null ? 0 : l - minutosAhora.value,
  )
  return esperas.length ? Math.min(...esperas) : null
})

/** Reservas cuya hora ya pasó y que todavía no se han sentado. */
const porSentar = computed(() =>
  reservas.value.filter(
    (r) =>
      (r.estado === 'confirmada' || r.estado === 'pendiente') &&
      aMinutos(r.hora) <= minutosAhora.value,
  ),
)

const porSalon = computed(() =>
  salones.value
    .map((s) => ({ salon: s, mesas: mesas.value.filter((m) => m.salonId === s.id) }))
    .filter((g) => g.mesas.length),
)

const opcionesMesa = computed<OpcionSelect[]>(() =>
  mesas.value
    .filter((m) => m.estado !== 'inactiva')
    .map((m) => ({ valor: m.id, etiqueta: `${m.codigo} · ${m.capacidad} pax` })),
)

const tonos: Record<string, string> = {
  pendiente: 'rs-turno-pendiente',
  confirmada: 'rs-turno-confirmada',
  sentada: 'rs-turno-sentada',
}

const glifos: Record<string, string> = { pendiente: '◷', confirmada: '◆', sentada: '●' }

// ── Carga ────────────────────────────────────────────────────────────────────

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    const [listaSalones, listaMesas, agenda] = await Promise.all([
      salonesService.listar(),
      mesasService.listar(),
      reservasService.agenda(localId, hoy.value),
    ])
    // El servicio es de una sede: los salones de otras no pintan aquí.
    salones.value = listaSalones.filter((s) => s.localId === localId && s.activo)
    mesas.value = listaMesas.filter((m) => salones.value.some((s) => s.id === m.salonId))
    reservas.value = agenda.reservas
  } catch {
    ui.error('No se pudo cargar el servicio.')
  } finally {
    terminar()
  }
}

onMounted(() => {
  cargar()
  // La línea de ahora se mueve sola: un reloj parado no es un reloj.
  reloj = window.setInterval(() => (ahora.value = new Date()), 30_000)
})

onBeforeUnmount(() => window.clearInterval(reloj))

watch(() => localStore.localId, cargar)

// ── Mover una reserva de mesa ────────────────────────────────────────────────

function cabeEn(mesaId: string, reserva: Reserva) {
  const mesa = mesas.value.find((m) => m.id === mesaId)
  if (!mesa || mesa.estado === 'inactiva') return false
  if (mesa.capacidad < reserva.personas) return false
  const inicio = aMinutos(reserva.hora)
  const fin = inicio + reserva.duracionMin
  return !reservas.value.some(
    (r) =>
      r.id !== reserva.id &&
      r.estado !== 'cancelada' &&
      r.estado !== 'noShow' &&
      r.mesaIds.includes(mesaId) &&
      aMinutos(r.hora) < fin &&
      aMinutos(r.hora) + r.duracionMin > inicio,
  )
}

const huboArrastre = ref(false)

function empezarArrastre(evento: PointerEvent, reserva: Reserva) {
  if (evento.button !== 0) return
  const yInicial = evento.clientY
  arrastre.value = { reservaId: reserva.id, sobre: null, vetada: false, dy: 0 }

  const alMover = (e: PointerEvent) => {
    const fila = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-mesa]')
    if (!arrastre.value) return
    const id = fila?.dataset.mesa ?? null
    arrastre.value.sobre = id
    arrastre.value.dy = e.clientY - yInicial
    if (Math.abs(arrastre.value.dy) > 4) huboArrastre.value = true
    arrastre.value.vetada = Boolean(id) && !reserva.mesaIds.includes(id!) && !cabeEn(id!, reserva)
  }

  const alSoltar = async () => {
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('pointerup', alSoltar)
    const destino = arrastre.value?.sobre
    arrastre.value = null
    setTimeout(() => (huboArrastre.value = false), 0)
    if (!destino || reserva.mesaIds.includes(destino)) return
    await mover(reserva, [destino])
  }

  window.addEventListener('pointermove', alMover)
  window.addEventListener('pointerup', alSoltar)
}

async function mover(reserva: Reserva, mesaIds: string[]) {
  try {
    await reservasService.moverAMesa(reserva.id, mesaIds, auth.usuario?.id ?? '')
    const codigo = mesas.value.find((m) => m.id === mesaIds[0])?.codigo
    ui.exito(`${reserva.nombreContacto} pasa a la ${codigo}.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo mover la reserva.')
  }
}

function abrirReserva(reserva: Reserva) {
  if (huboArrastre.value) return
  seleccionada.value = reserva
  moviendoA.value = reserva.mesaIds[0] ?? ''
  panelAbierto.value = true
}

async function sentar(reserva: Reserva) {
  try {
    await reservasService.cambiarEstado(reserva.id, 'sentada', auth.usuario?.id ?? '')
    ui.exito(`${reserva.nombreContacto} sentado.`)
    panelAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo sentar la reserva.')
  }
}

function esperaDe(minutos: number | null | undefined) {
  if (minutos === null || minutos === undefined) return 'ahora'
  const falta = minutos - minutosAhora.value
  return falta <= 0 ? 'ahora' : `en ${falta} min`
}
</script>

<template>
  <div class="rs-operacion flex flex-col gap-4">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="rs-titulo-pagina text-tinta">El servicio de hoy</h2>
        <p class="mt-1 text-sm text-tenue">
          {{ reservas.length }} reserva{{ reservas.length === 1 ? '' : 's' }} ·
          {{ mesas.length }} mesas ·
          {{ ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }}
        </p>
      </div>

      <!--
        La puerta: la pregunta con la que de verdad se usa esta pantalla.
        Se escribe cuánta gente ha entrado y el reloj señala dónde caben.
      -->
      <div class="flex items-end gap-3 rounded-card border border-linea bg-panel px-4 py-3">
        <div>
          <p class="rs-etiqueta text-tenue">En la puerta</p>
          <div class="mt-1.5 w-28">
            <KmNumero v-model="enLaPuerta" :min="0" :max="20" />
          </div>
        </div>
        <p v-if="enLaPuerta" class="pb-1.5 text-sm">
          <template v-if="candidatas.size">
            <span class="font-semibold text-tinta">{{ candidatas.size }} mesas</span>
            <span class="text-tenue">
              · siéntalos {{ esperaDe(minutosAhora + (mejorEspera ?? 0)) }}</span
            >
          </template>
          <span v-else class="font-semibold text-vino-texto">
            ⚠ No hay mesa para {{ enLaPuerta }} en la próxima hora y media
          </span>
        </p>
      </div>
    </header>

    <!-- Lo que ya debería estar sentado y no lo está. -->
    <section
      v-if="porSentar.length"
      class="rs-tono rs-tono-laton flex flex-wrap items-center gap-2 rounded-card border px-4 py-2.5"
    >
      <p class="rs-etiqueta">◷ Su hora ya pasó · {{ porSentar.length }}</p>
      <button
        v-for="r in porSentar"
        :key="r.id"
        type="button"
        class="rounded-control border border-current/25 px-2.5 py-1 text-xs font-semibold transition-colors hover:border-current"
        @click="abrirReserva(r)"
      >
        {{ r.hora }} · {{ r.nombreContacto }} ({{ r.personas }})
      </button>
    </section>

    <p v-if="cargando" class="py-16 text-center text-sm text-tenue">Cargando el servicio…</p>

    <div
      v-else
      class="overflow-x-auto rounded-card border border-linea bg-panel"
      :class="{ 'rs-refrescando': refrescando }"
      :aria-busy="refrescando"
    >
      <div class="relative min-w-[56rem]">
        <!-- Cabecera de horas -->
        <div
          class="sticky top-0 z-20 grid border-b border-linea bg-panel-2"
          :style="{ gridTemplateColumns: `${ANCHO_MESA}px repeat(${columnas}, 1fr)` }"
        >
          <div class="rs-etiqueta flex items-end px-3 py-2 text-tenue">Mesa</div>
          <div
            v-for="f in franjas"
            :key="f.min"
            class="rs-reloj-celda border-b-0 py-2 text-center"
            :class="f.enPunto ? 'rs-reloj-hora' : ''"
          >
            <p v-if="f.enPunto" class="text-xs leading-none font-semibold text-tinta tabular-nums">
              {{ f.hora }}
            </p>
            <p v-else-if="f.media" class="text-[10px] leading-none text-tenue tabular-nums">
              {{ f.hora.slice(3) }}
            </p>
            <p v-else class="text-[10px] leading-none text-transparent">·</p>
          </div>
        </div>

        <!-- Una sección por salón -->
        <section v-for="grupo in porSalon" :key="grupo.salon.id">
          <p class="rs-etiqueta border-b border-linea bg-panel-2 px-3 py-1.5 text-tenue">
            {{ grupo.salon.nombre }}
          </p>

          <div
            v-for="m in grupo.mesas"
            :key="m.id"
            :data-mesa="m.id"
            class="relative grid"
            :class="[
              arrastre?.sobre === m.id
                ? arrastre.vetada
                  ? 'rs-reloj-destino-vetado'
                  : 'rs-reloj-destino'
                : candidatas.has(m.id)
                  ? 'rs-reloj-candidata'
                  : '',
            ]"
            :style="{ gridTemplateColumns: `${ANCHO_MESA}px repeat(${columnas}, 1fr)` }"
          >
            <!-- Columna fija: la mesa y su rotación -->
            <div
              class="rs-reloj-celda flex items-center gap-2 px-3 py-2"
              :class="m.estado === 'inactiva' ? 'rs-reloj-cerrado' : ''"
            >
              <span class="rs-display shrink-0 text-sm leading-none font-semibold text-tinta">
                {{ m.codigo }}
              </span>
              <span class="shrink-0 text-[10px] leading-none text-tenue"> {{ m.capacidad }}p </span>
              <!-- La rotación manda sobre la espera: es el número del servicio. -->
              <span
                v-if="rotacion(m.id) > 1"
                class="ml-auto shrink-0 text-[10px] leading-none font-bold text-verde-texto"
                :title="`${rotacion(m.id)} turnos en el servicio`"
              >
                ×{{ rotacion(m.id) }}
              </span>
              <span
                v-else-if="candidatas.has(m.id)"
                class="ml-auto shrink-0 text-[10px] leading-none font-bold text-verde-texto"
              >
                {{ esperaDe(candidatas.get(m.id)) }}
              </span>
            </div>

            <div
              v-for="f in franjas"
              :key="f.min"
              class="rs-reloj-celda h-[var(--km-celda,2.25rem)]"
              :class="[
                f.enPunto ? 'rs-reloj-hora' : '',
                m.estado === 'inactiva' ? 'rs-reloj-cerrado' : '',
              ]"
            />

            <!-- Los turnos, por encima de la rejilla -->
            <div
              class="pointer-events-none absolute inset-y-0 right-0"
              :style="{ left: `${ANCHO_MESA}px` }"
            >
              <div class="pointer-events-auto relative h-full">
                <button
                  v-for="t in turnosDe(m.id)"
                  :key="t.reserva.id"
                  type="button"
                  class="rs-turno absolute inset-y-1 flex items-center gap-1.5 overflow-hidden px-2 text-left"
                  :class="[
                    tonos[t.reserva.estado] ?? 'rs-turno-confirmada',
                    arrastre?.reservaId === t.reserva.id ? 'rs-turno-arrastrando' : '',
                  ]"
                  :style="{
                    left: `${t.izquierda}%`,
                    width: `${t.ancho}%`,
                    transform:
                      arrastre?.reservaId === t.reserva.id
                        ? `translateY(${arrastre.dy}px)`
                        : undefined,
                  }"
                  :title="`${t.reserva.hora} · ${t.reserva.nombreContacto} · ${t.reserva.personas} personas · ${etiquetaEstadoReserva[t.reserva.estado]}`"
                  @pointerdown="empezarArrastre($event, t.reserva)"
                  @click="abrirReserva(t.reserva)"
                >
                  <span class="shrink-0 text-[10px] leading-none opacity-80" aria-hidden="true">
                    {{ glifos[t.reserva.estado] ?? '◆' }}
                  </span>
                  <span class="truncate text-[11px] leading-none font-semibold">
                    {{ t.reserva.nombreContacto }}
                  </span>
                  <span v-if="t.ancho > 8" class="shrink-0 text-[10px] leading-none opacity-75">
                    {{ t.reserva.personas }}p
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Ahora -->
        <div
          v-if="posicionAhora !== null"
          class="rs-reloj-ahora"
          :style="{
            left: `calc(${ANCHO_MESA}px + (100% - ${ANCHO_MESA}px) * ${posicionAhora / 100})`,
          }"
          aria-hidden="true"
        />
      </div>
    </div>

    <p class="text-xs text-tenue">
      Arrastra una reserva a otra fila para cambiarla de mesa. Escribe cuánta gente hay en la puerta
      y el reloj marca las mesas donde caben, con la espera.
    </p>
  </div>

  <KmDrawer v-model="panelAbierto" :titulo="seleccionada?.nombreContacto ?? 'Reserva'" ancho="md">
    <div v-if="seleccionada" class="flex flex-col gap-5">
      <header>
        <p class="rs-display text-2xl leading-none font-semibold text-tinta tabular-nums">
          {{ seleccionada.hora }}
        </p>
        <p class="mt-1.5 text-sm text-tenue">
          {{ seleccionada.personas }} persona{{ seleccionada.personas === 1 ? '' : 's' }} ·
          {{ seleccionada.duracionMin }} min
          <span v-if="seleccionada.telefono"> · {{ seleccionada.telefono }}</span>
        </p>
        <div class="mt-3">
          <KmBadge :tono="seleccionada.estado === 'sentada' ? 'verde' : 'pizarra'" punto>
            {{ etiquetaEstadoReserva[seleccionada.estado] }}
          </KmBadge>
        </div>
      </header>

      <div class="rounded-card border border-linea bg-panel-2 p-4">
        <p class="rs-etiqueta text-tenue">Mesa</p>
        <div class="mt-2 flex items-end gap-2">
          <KmSelect
            v-model="moviendoA"
            :opciones="opcionesMesa"
            etiqueta="Mover a"
            placeholder="Elige mesa"
            class="flex-1"
          />
          <KmButton
            variante="secundario"
            :disabled="!moviendoA || seleccionada.mesaIds.includes(String(moviendoA))"
            @click="mover(seleccionada, [String(moviendoA)])"
          >
            Mover
          </KmButton>
        </div>
      </div>

      <p v-if="seleccionada.nota" class="text-sm text-tenue">{{ seleccionada.nota }}</p>
    </div>

    <template #footer>
      <KmButton variante="fantasma" @click="panelAbierto = false">Cerrar</KmButton>
      <KmButton
        v-if="seleccionada && seleccionada.estado !== 'sentada'"
        @click="sentar(seleccionada)"
      >
        Sentar
      </KmButton>
    </template>
  </KmDrawer>
</template>
