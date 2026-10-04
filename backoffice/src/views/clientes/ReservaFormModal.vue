<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmHora from '@/components/ui/KmHora.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { reservasService } from '@/services/clientes.service'
import { valorConfig } from '@/services/parametros.service'
import { hoyLocal } from '@/utils/fechas'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, CanalReserva, Cliente, Mesa, NuevaReserva, Reserva, Salon } from '@/types'
import type { OpcionSelect } from '@/types/ui'

/**
 * Crear y editar una reserva ([D-018](../../../docs/guia/decisiones.md)). Vive
 * aquí y no dentro de una pantalla porque lo abren dos: el reloj del servicio,
 * donde se opera, y la agenda de Clientes, donde se administra. Las reglas
 * (aforo, cupo por franja, cruces, anticipación) las valida el servicio, que es
 * el mismo para las dos.
 */

const props = defineProps<{
  localId: string
  clientes: Cliente[]
  mesas: Mesa[]
  salones: Salon[]
}>()

const emit = defineEmits<{ guardada: [Reserva] }>()

const auth = useAuthStore()
const ui = useUiStore()
const hoy = hoyLocal()

const abierto = ref(false)
const editando = shallowRef<Reserva | null>(null)
const errores = ref<Record<string, string>>({})
const guardando = ref(false)
const form = ref<NuevaReserva>(vacia())

function vacia(fecha?: string, hora?: string): NuevaReserva {
  return {
    localId: props.localId,
    clienteId: undefined,
    nombreContacto: '',
    telefono: '',
    personas: 2,
    fecha: fecha ?? hoy,
    hora: hora ?? '13:00',
    duracionMin: valorConfig<number>('reservas.duracionMin', props.localId),
    mesaIds: [],
    canal: 'telefono',
    nota: '',
  }
}

/**
 * Abre el formulario. Sin reserva crea una nueva; `inicial` la precarga con el
 * hueco que se pulsó en el reloj, que es lo que ahorra el trabajo manual.
 */
function abrir(r?: Reserva, inicial?: { fecha?: string; hora?: string; mesaIds?: string[] }) {
  editando.value = r ?? null
  errores.value = {}
  if (r) {
    const { id: _id, estado: _e, creada: _c, usuarioId: _u, motivo: _m, ...resto } = r
    form.value = JSON.parse(JSON.stringify(resto))
  } else {
    form.value = vacia(inicial?.fecha, inicial?.hora)
    if (inicial?.mesaIds) form.value.mesaIds = [...inicial.mesaIds]
  }
  abierto.value = true
}
defineExpose({ abrir })

const etiquetaCanal: Record<CanalReserva, string> = {
  telefono: 'Teléfono',
  web: 'Web',
  mostrador: 'Mostrador',
  app: 'App',
}
const opcionesCanal: OpcionSelect[] = (
  ['telefono', 'web', 'mostrador', 'app'] as CanalReserva[]
).map((c) => ({ valor: c, etiqueta: etiquetaCanal[c] }))

const opcionesCliente = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Sin cliente registrado' },
  ...props.clientes
    .filter((c) => c.activo)
    .map((c) => ({ valor: c.id, etiqueta: `${c.nombre} · ${c.documento}` })),
])

const mesasDelLocal = computed(() =>
  props.mesas.filter((m) => {
    const salon = props.salones.find((s) => s.id === m.salonId)
    return salon?.localId === props.localId && m.estado !== 'inactiva'
  }),
)

const nombreSalon = (m: Mesa) => props.salones.find((s) => s.id === m.salonId)?.nombre ?? '—'

/** Al elegir cliente se copian su nombre y teléfono, que es lo que busca la sala. */
function elegirCliente(clienteId: string) {
  form.value.clienteId = clienteId || undefined
  const c = props.clientes.find((x) => x.id === clienteId)
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
    (s, id) => s + (props.mesas.find((m) => m.id === id)?.capacidad ?? 0),
    0,
  ),
)

/** Aviso antes de guardar: el servicio lo rechazaría, pero mejor verlo antes. */
const faltanAsientos = computed(
  () => form.value.mesaIds.length > 0 && capacidadElegida.value < form.value.personas,
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
    emit('guardada', r)
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar la reserva.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
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
        <KmField
          v-slot="{ id }"
          label="Duración"
          :error="errores.duracionMin"
          ayuda="La mesa queda apartada todo este rato."
        >
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
        <p class="text-xs" :class="faltanAsientos ? 'font-medium text-vino' : 'text-tenue'">
          Elegidas: {{ capacidadElegida }} asientos para {{ form.personas }} persona(s).
          <template v-if="faltanAsientos">No alcanzan: añade otra mesa.</template>
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
</template>
