<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmHora from '@/components/ui/KmHora.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import {
  clientesService,
  etiquetaEstadoReserva,
  reservasService,
} from '@/services/clientes.service'
import { mesasService } from '@/services/mesas.service'
import { valorConfig, tienePermiso } from '@/services/parametros.service'
import { salonesService } from '@/services/salones.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  Alergeno,
  ApiError,
  CanalReserva,
  Cliente,
  EstadoReserva,
  FichaCliente,
  Mesa,
  NuevaReserva,
  Reserva,
  Salon,
} from '@/types'
import type { OpcionSelect, TonoMesa } from '@/types/ui'
import { etiquetaAlergeno, formatearFecha } from '@/utils/formato'

/**
 * Reservas (F6.1): la agenda del día del local. La mesa se aparta por el
 * tiempo configurado y no se puede reservar dos veces a la misma hora.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()

const hoy = new Date().toISOString().slice(0, 10)
const fecha = ref<string | null>(hoy)
const reservas = shallowRef<Reserva[]>([])
const clientes = shallowRef<Cliente[]>([])
const fichas = shallowRef<FichaCliente[]>([])
const mesas = shallowRef<Mesa[]>([])
const salones = shallowRef<Salon[]>([])
const resumen = shallowRef<{ personas: number; cupo: number; pendientes: number } | null>(null)

const localId = computed(() => localStore.localId ?? localStore.locales[0]?.id ?? '')
const puedeGestionar = computed(() => tienePermiso(auth.usuario?.id, 'reservas.gestionar'))

async function cargar() {
  if (!localId.value) return
  const dia = fecha.value ?? hoy
  const [rs, cs, fs, ms, ss, agenda] = await Promise.all([
    reservasService.listar({ localId: localId.value, fecha: dia }),
    clientesService.todos(),
    clientesService.fichas(),
    mesasService.listar(),
    salonesService.listar(),
    reservasService.agenda(localId.value, dia),
  ])
  reservas.value = rs
  clientes.value = cs
  fichas.value = fs
  mesas.value = ms
  salones.value = ss
  resumen.value = agenda
}
watch([localId, fecha], cargar, { immediate: true })

const mesasDelLocal = computed(() => {
  const ids = salones.value.filter((s) => s.localId === localId.value).map((s) => s.id)
  return mesas.value.filter((m) => ids.includes(m.salonId) && m.estado !== 'inactiva')
})
const nombreMesa = (id: string) => mesas.value.find((m) => m.id === id)?.codigo ?? id
const nombreSalon = (m: Mesa) => salones.value.find((s) => s.id === m.salonId)?.nombre ?? ''
const fichaDe = (clienteId?: string) =>
  clienteId ? fichas.value.find((f) => f.clienteId === clienteId) : undefined
const alergenosDe = (r: Reserva): Alergeno[] => fichaDe(r.clienteId)?.alergenos ?? []

const tono: Record<EstadoReserva, TonoMesa> = {
  pendiente: 'laton',
  confirmada: 'verde',
  sentada: 'pizarra',
  noShow: 'vino',
  cancelada: 'neutro',
}
const etiquetaCanal: Record<CanalReserva, string> = {
  telefono: 'Teléfono',
  web: 'Web',
  mostrador: 'Mostrador',
  app: 'App',
}

// ── Editor ──

const abierto = ref(false)
const editando = shallowRef<Reserva | null>(null)
const form = ref<NuevaReserva>(vacia())
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

function vacia(): NuevaReserva {
  return {
    localId: localId.value,
    clienteId: undefined,
    nombreContacto: '',
    telefono: '',
    personas: 2,
    fecha: fecha.value ?? hoy,
    hora: '13:00',
    duracionMin: valorConfig<number>('reservas.duracionMin', localId.value),
    mesaIds: [],
    canal: 'telefono',
    nota: '',
  }
}

const opcionesCliente = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Sin cliente registrado' },
  ...clientes.value
    .filter((c) => c.activo)
    .map((c) => ({ valor: c.id, etiqueta: `${c.nombre} · ${c.documento}` })),
])
const opcionesCanal: OpcionSelect[] = (
  ['telefono', 'web', 'mostrador', 'app'] as CanalReserva[]
).map((c) => ({ valor: c, etiqueta: etiquetaCanal[c] }))

function abrir(r?: Reserva) {
  editando.value = r ?? null
  errores.value = {}
  if (r) {
    const { id: _id, estado: _e, creada: _c, usuarioId: _u, motivo: _m, ...resto } = r
    form.value = JSON.parse(JSON.stringify(resto))
  } else form.value = vacia()
  abierto.value = true
}

/** Al elegir cliente se copian su nombre y teléfono, que es lo que busca la sala. */
function elegirCliente(clienteId: string) {
  form.value.clienteId = clienteId || undefined
  const c = clientes.value.find((x) => x.id === clienteId)
  if (c) {
    form.value.nombreContacto = c.nombre
    form.value.telefono = c.telefono ?? ''
  }
}

function alternarMesa(id: string, marcado: boolean) {
  form.value.mesaIds = marcado
    ? [...form.value.mesaIds, id]
    : form.value.mesaIds.filter((x) => x !== id)
}

const capacidadElegida = computed(() =>
  form.value.mesaIds.reduce(
    (s, id) => s + (mesas.value.find((m) => m.id === id)?.capacidad ?? 0),
    0,
  ),
)

async function guardar() {
  if (!auth.usuario) return
  guardando.value = true
  errores.value = {}
  try {
    const datos: NuevaReserva = { ...form.value, fecha: form.value.fecha || hoy }
    const r = editando.value
      ? await reservasService.actualizar(editando.value.id, datos, auth.usuario.id)
      : await reservasService.crear(datos, auth.usuario.id)
    ui.exito(`Reserva de ${r.nombreContacto} guardada.`)
    abierto.value = false
    fecha.value = r.fecha
    await cargar()
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar la reserva.')
  } finally {
    guardando.value = false
  }
}

// ── Estados ──

const modalMotivo = ref(false)
const pendiente = shallowRef<{ reserva: Reserva; estado: EstadoReserva } | null>(null)
const motivo = ref('')

async function cambiar(reserva: Reserva, estado: EstadoReserva) {
  if (estado === 'cancelada' || estado === 'noShow') {
    pendiente.value = { reserva, estado }
    motivo.value = ''
    modalMotivo.value = true
    return
  }
  await aplicar(reserva, estado)
}

async function aplicar(reserva: Reserva, estado: EstadoReserva, texto?: string) {
  if (!auth.usuario) return
  try {
    await reservasService.cambiarEstado(reserva.id, estado, auth.usuario.id, texto)
    ui.exito(`Reserva ${etiquetaEstadoReserva[estado].toLowerCase()}.`)
    modalMotivo.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar la reserva.')
  }
}

const acciones: Record<EstadoReserva, { estado: EstadoReserva; etiqueta: string }[]> = {
  pendiente: [
    { estado: 'confirmada', etiqueta: 'Confirmar' },
    { estado: 'sentada', etiqueta: 'Sentar' },
    { estado: 'noShow', etiqueta: 'No vino' },
    { estado: 'cancelada', etiqueta: 'Cancelar' },
  ],
  confirmada: [
    { estado: 'sentada', etiqueta: 'Sentar' },
    { estado: 'noShow', etiqueta: 'No vino' },
    { estado: 'cancelada', etiqueta: 'Cancelar' },
  ],
  sentada: [],
  noShow: [],
  cancelada: [],
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Reservas del día</p>
        <p class="rs-cifra mt-2 text-tinta">{{ reservas.length }}</p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Personas esperadas</p>
        <p class="rs-cifra mt-2 text-tinta">{{ resumen?.personas ?? 0 }}</p>
        <p v-if="resumen?.cupo" class="mt-1 text-xs text-tenue">
          Cupo por franja: {{ resumen.cupo }}
        </p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Por confirmar</p>
        <p class="rs-cifra mt-2" :class="resumen?.pendientes ? 'text-laton-texto' : 'text-tinta'">
          {{ resumen?.pendientes ?? 0 }}
        </p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Día</p>
        <div class="mt-2"><KmFecha v-model="fecha" /></div>
      </div>
    </div>

    <KmCard
      :titulo="`Agenda del ${formatearFecha(fecha ?? hoy)}`"
      subtitulo="La mesa queda apartada por la duración de la reserva. Cancelar o marcar «no vino» pide motivo y queda en la bitácora."
      sin-padding
    >
      <template #acciones>
        <KmButton :disabled="!puedeGestionar" @click="abrir()">Nueva reserva</KmButton>
      </template>

      <p v-if="!puedeGestionar" class="border-b border-linea px-6 py-3 text-sm text-tenue">
        Necesitas el permiso «Gestionar reservas» para crear o cambiar reservas.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead>
            <tr class="border-b border-linea text-left text-xs text-tenue">
              <th class="px-6 py-2.5 font-medium">Hora</th>
              <th class="px-3 py-2.5 font-medium">A nombre de</th>
              <th class="px-3 py-2.5 font-medium">Personas</th>
              <th class="px-3 py-2.5 font-medium">Mesas</th>
              <th class="px-3 py-2.5 font-medium">Estado</th>
              <th class="px-6 py-2.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reservas" :key="r.id" class="border-b border-linea last:border-0">
              <td class="px-6 py-2.5 whitespace-nowrap tabular-nums">
                <p class="font-medium text-tinta">{{ r.hora }}</p>
                <p class="text-xs text-tenue">{{ r.duracionMin }} min</p>
              </td>
              <td class="px-3 py-2.5">
                <p class="font-medium text-tinta">{{ r.nombreContacto }}</p>
                <p class="text-xs text-tenue tabular-nums">
                  {{ r.telefono ?? 'sin teléfono' }} · {{ etiquetaCanal[r.canal] }}
                </p>
                <div v-if="alergenosDe(r).length" class="mt-1 flex flex-wrap gap-1">
                  <KmBadge v-for="a in alergenosDe(r)" :key="a" tono="vino">
                    {{ etiquetaAlergeno[a] }}
                  </KmBadge>
                </div>
                <p v-if="r.nota" class="text-xs text-laton-texto">{{ r.nota }}</p>
                <p v-if="r.motivo" class="text-xs text-vino">{{ r.motivo }}</p>
              </td>
              <td class="px-3 py-2.5 tabular-nums">{{ r.personas }}</td>
              <td class="px-3 py-2.5">{{ r.mesaIds.map(nombreMesa).join(', ') }}</td>
              <td class="px-3 py-2.5">
                <KmBadge :tono="tono[r.estado]" punto>
                  {{ etiquetaEstadoReserva[r.estado] }}
                </KmBadge>
              </td>
              <td class="px-6 py-2">
                <div class="flex flex-wrap items-center gap-1">
                  <KmButton
                    v-for="a in acciones[r.estado]"
                    :key="a.estado"
                    tamano="sm"
                    :variante="a.estado === 'sentada' ? 'primario' : 'fantasma'"
                    :class="a.estado === 'cancelada' || a.estado === 'noShow' ? 'text-vino' : ''"
                    :disabled="!puedeGestionar"
                    @click="cambiar(r, a.estado)"
                  >
                    {{ a.etiqueta }}
                  </KmButton>
                  <KmBotonIcono
                    v-if="r.estado === 'pendiente' || r.estado === 'confirmada'"
                    icono="editar"
                    etiqueta="Editar reserva"
                    :contexto="r.nombreContacto"
                    :disabled="!puedeGestionar"
                    @click="abrir(r)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!reservas.length">
              <td colspan="6" class="px-6 py-8 text-center text-sm text-tenue">
                Este día no tiene reservas.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? `Editar reserva de ${editando.nombreContacto}` : 'Nueva reserva'"
    >
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Cliente del ERP" :error="errores.clienteId">
          <KmSelect
            :id="id"
            :model-value="form.clienteId ?? ''"
            :opciones="opcionesCliente"
            @update:model-value="elegirCliente(String($event ?? ''))"
          />
        </KmField>
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="A nombre de" requerido :error="errores.nombreContacto">
            <KmInput :id="id" v-model="form.nombreContacto" placeholder="Quién reserva" />
          </KmField>
          <KmField v-slot="{ id }" label="Teléfono">
            <KmInput :id="id" v-model="form.telefono" placeholder="987 654 321" />
          </KmField>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <KmField v-slot="{ id }" label="Fecha" requerido :error="errores.fecha">
            <KmFecha
              :id="id"
              :model-value="form.fecha"
              :min="hoy"
              @update:model-value="form.fecha = $event ?? hoy"
            />
          </KmField>
          <KmField label="Hora" requerido :error="errores.hora">
            <KmHora v-model="form.hora" etiqueta="Hora de la reserva" />
          </KmField>
          <KmField v-slot="{ id }" label="Duración" :error="errores.duracionMin">
            <KmNumero :id="id" v-model="form.duracionMin" :min="15" :step="15" sufijo="min" />
          </KmField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Personas" requerido :error="errores.personas">
            <KmNumero :id="id" v-model="form.personas" :min="1" />
          </KmField>
          <KmField v-slot="{ id }" label="Por dónde reservó">
            <KmSelect :id="id" v-model="form.canal" :opciones="opcionesCanal" />
          </KmField>
        </div>

        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Mesas</p>
          <p class="text-xs text-tenue">
            Elegidas: {{ capacidadElegida }} asientos para {{ form.personas }} persona(s).
          </p>
          <KmCheckbox
            v-for="m in mesasDelLocal"
            :key="m.id"
            :model-value="form.mesaIds.includes(m.id)"
            @update:model-value="alternarMesa(m.id, $event)"
          >
            {{ m.codigo }} · {{ m.capacidad }} asientos · {{ nombreSalon(m) }}
          </KmCheckbox>
          <p v-if="errores.mesaIds" class="text-xs font-medium text-vino">{{ errores.mesaIds }}</p>
        </div>

        <KmField v-slot="{ id }" label="Nota para la sala">
          <KmInput :id="id" v-model="form.nota" placeholder="Cumpleaños, silla para bebé…" />
        </KmField>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar</KmButton>
      </template>
    </KmDrawer>

    <KmModal
      v-model="modalMotivo"
      :titulo="pendiente?.estado === 'cancelada' ? 'Cancelar la reserva' : 'Marcar como no vino'"
      ancho="sm"
    >
      <div class="flex flex-col gap-3">
        <p v-if="pendiente" class="text-sm text-tenue">
          {{ pendiente.reserva.nombreContacto }} · {{ pendiente.reserva.hora }} ·
          {{ pendiente.reserva.personas }} persona(s)
        </p>
        <KmField v-slot="{ id }" label="Motivo" requerido>
          <KmInput :id="id" v-model="motivo" placeholder="El cliente avisó que no viene" />
        </KmField>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="modalMotivo = false">Volver</KmButton>
        <KmButton
          :disabled="!motivo.trim()"
          @click="pendiente && aplicar(pendiente.reserva, pendiente.estado, motivo)"
        >
          Confirmar
        </KmButton>
      </template>
    </KmModal>
  </div>
</template>
