<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmOrigenErp from '@/components/ui/KmOrigenErp.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import {
  clientesService,
  etiquetaEstadoReserva,
  etiquetaTipoDocumento,
  reservasService,
} from '@/services/clientes.service'
import { salonesService } from '@/services/salones.service'
import { useUiStore } from '@/stores/ui.store'
import type { Alergeno, ApiError, Cliente, FichaCliente, Reserva, Salon } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { alergenos, etiquetaAlergeno, formatearFecha } from '@/utils/formato'

/**
 * Clientes (F6.1). El cliente vive en el ERP: aquí se consulta y se le agrega
 * la **ficha de sala** —alergias, etiquetas y notas— que solo le sirve al
 * restaurante, más sus reservas.
 */

const ui = useUiStore()

const clientes = shallowRef<Cliente[]>([])
const fichas = shallowRef<FichaCliente[]>([])
const reservas = shallowRef<Reserva[]>([])
const salones = shallowRef<Salon[]>([])
const { cargando, iniciar, terminar } = useCarga()
const busqueda = ref('')

async function cargar() {
  iniciar()
  try {
    ;[clientes.value, fichas.value, reservas.value, salones.value] = await Promise.all([
      clientesService.todos(),
      clientesService.fichas(),
      reservasService.listar(),
      salonesService.listar(),
    ])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar los clientes.')
  } finally {
    terminar()
  }
}
onMounted(cargar)

const fichaDe = (clienteId: string) => fichas.value.find((f) => f.clienteId === clienteId)
const reservasDe = (clienteId: string) =>
  reservas.value
    .filter((r) => r.clienteId === clienteId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

const filas = computed(() => {
  const t = busqueda.value.trim().toLowerCase()
  return clientes.value.filter(
    (c) =>
      !t ||
      c.nombre.toLowerCase().includes(t) ||
      c.documento.includes(t) ||
      (c.distrito ?? '').toLowerCase().includes(t),
  )
})

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Cliente' },
  { clave: 'documento', etiqueta: 'Documento', clase: 'w-48' },
  { clave: 'contacto', etiqueta: 'Contacto', clase: 'w-56' },
  { clave: 'ficha', etiqueta: 'Ficha de sala' },
  { clave: 'acciones', etiqueta: '', clase: 'w-16 text-right' },
]

// ── Ficha de sala ──

const abierto = ref(false)
const editando = shallowRef<Cliente | null>(null)
const seleccionados = ref<Alergeno[]>([])
const etiquetas = ref('')
const notas = ref('')
const salonPreferidoId = ref('')
const guardando = ref(false)

const opcionesSalon = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Sin preferencia' },
  ...salones.value.map((s) => ({ valor: s.id, etiqueta: s.nombre })),
])
const nombreSalon = (id?: string) => salones.value.find((s) => s.id === id)?.nombre

function abrir(c: Cliente) {
  const ficha = fichaDe(c.id)
  editando.value = c
  seleccionados.value = [...(ficha?.alergenos ?? [])]
  etiquetas.value = (ficha?.etiquetas ?? []).join(', ')
  notas.value = ficha?.notas ?? ''
  salonPreferidoId.value = ficha?.salonPreferidoId ?? ''
  abierto.value = true
}

function alternarAlergeno(a: Alergeno) {
  seleccionados.value = seleccionados.value.includes(a)
    ? seleccionados.value.filter((x) => x !== a)
    : [...seleccionados.value, a]
}

async function guardar() {
  if (!editando.value) return
  guardando.value = true
  try {
    await clientesService.guardarFicha(editando.value.id, {
      alergenos: seleccionados.value,
      etiquetas: etiquetas.value.split(','),
      notas: notas.value,
      salonPreferidoId: salonPreferidoId.value || undefined,
    })
    ui.exito(`Ficha de ${editando.value.nombre} guardada.`)
    abierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar la ficha.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard
      titulo="Clientes"
      subtitulo="Los clientes y sus datos de facturación son del ERP. Aquí se les agrega lo que necesita la sala."
      sin-padding
    >
      <template #acciones>
        <KmOrigenErp />
        <KmBusqueda v-model="busqueda" placeholder="Nombre, documento o distrito" />
      </template>

      <div class="overflow-hidden">
        <KmTable
          :columnas="columnas"
          :filas="filas"
          :cargando="cargando"
          mensaje-vacio="Ningún cliente coincide."
        >
          <template #col-nombre="{ fila }">
            <p class="font-medium text-tinta">{{ fila.nombre }}</p>
            <p v-if="fila.distrito" class="text-xs text-tenue">{{ fila.distrito }}</p>
            <KmBadge v-if="!fila.activo" tono="neutro">Inactivo en el ERP</KmBadge>
          </template>
          <template #col-documento="{ fila }">
            <p class="text-tinta tabular-nums">{{ fila.documento }}</p>
            <p class="text-xs text-tenue">{{ etiquetaTipoDocumento[fila.tipoDocumento] }}</p>
          </template>
          <template #col-contacto="{ fila }">
            <p v-if="fila.telefono" class="text-tinta tabular-nums">{{ fila.telefono }}</p>
            <p v-if="fila.email" class="text-xs break-all text-tenue">{{ fila.email }}</p>
            <span v-if="!fila.telefono && !fila.email" class="text-tenue">—</span>
          </template>
          <template #col-ficha="{ fila }">
            <div class="flex flex-wrap items-center gap-1.5">
              <KmBadge v-for="a in fichaDe(fila.id)?.alergenos ?? []" :key="a" tono="vino">
                {{ etiquetaAlergeno[a] }}
              </KmBadge>
              <KmBadge v-for="e in fichaDe(fila.id)?.etiquetas ?? []" :key="e" tono="pizarra">
                {{ e }}
              </KmBadge>
              <span
                v-if="!fichaDe(fila.id)?.alergenos.length && !fichaDe(fila.id)?.etiquetas.length"
                class="text-sm text-tenue"
              >
                Sin ficha
              </span>
            </div>
            <p v-if="fichaDe(fila.id)?.notas" class="mt-1 text-xs text-tenue">
              {{ fichaDe(fila.id)!.notas }}
            </p>
          </template>
          <template #col-acciones="{ fila }">
            <div class="flex justify-end">
              <KmBotonIcono
                icono="editar"
                etiqueta="Editar ficha de sala"
                :contexto="fila.nombre"
                @click="abrir(fila)"
              />
            </div>
          </template>
        </KmTable>
      </div>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? `Ficha de sala · ${editando.nombre}` : 'Ficha de sala'"
      subtitulo="Solo de la vertical: el ERP no necesita esto para facturar."
    >
      <div v-if="editando" class="flex flex-col gap-5">
        <dl class="grid grid-cols-2 gap-3 rounded-card border border-linea p-4 text-sm">
          <div>
            <dt class="rs-etiqueta text-tenue">Documento</dt>
            <dd class="mt-1 text-tinta tabular-nums">
              {{ etiquetaTipoDocumento[editando.tipoDocumento] }} {{ editando.documento }}
            </dd>
          </div>
          <div>
            <dt class="rs-etiqueta text-tenue">Teléfono</dt>
            <dd class="mt-1 text-tinta tabular-nums">{{ editando.telefono ?? '—' }}</dd>
          </div>
        </dl>

        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Alergias e intolerancias</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="a in alergenos"
              :key="a"
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
              :class="
                seleccionados.includes(a)
                  ? 'border-vino bg-vino/10 text-vino'
                  : 'border-linea text-tenue hover:border-verde hover:text-tinta'
              "
              :aria-pressed="seleccionados.includes(a)"
              @click="alternarAlergeno(a)"
            >
              {{ etiquetaAlergeno[a] }}
            </button>
          </div>
        </div>

        <KmField v-slot="{ id }" label="Etiquetas" ayuda="Separadas por coma.">
          <KmInput :id="id" v-model="etiquetas" placeholder="Frecuente, Corporativo" />
        </KmField>
        <KmField v-slot="{ id }" label="Notas para la sala">
          <KmInput :id="id" v-model="notas" placeholder="Prefiere mesa junto a la ventana" />
        </KmField>
        <KmField v-slot="{ id }" label="Salón preferido">
          <KmSelect :id="id" v-model="salonPreferidoId" :opciones="opcionesSalon" />
        </KmField>

        <div>
          <p class="rs-etiqueta mb-2 text-laton-texto">Reservas</p>
          <ul class="flex flex-col gap-1.5 text-sm">
            <li v-for="r in reservasDe(editando.id)" :key="r.id" class="flex flex-wrap gap-2">
              <span class="text-tinta tabular-nums"
                >{{ formatearFecha(r.fecha) }} {{ r.hora }}</span
              >
              <span class="text-tenue">{{ r.personas }} persona(s)</span>
              <KmBadge
                :tono="
                  r.estado === 'sentada' || r.estado === 'confirmada'
                    ? 'verde'
                    : r.estado === 'pendiente'
                      ? 'laton'
                      : 'vino'
                "
              >
                {{ etiquetaEstadoReserva[r.estado] }}
              </KmBadge>
            </li>
            <li v-if="!reservasDe(editando.id).length" class="text-tenue">
              Todavía no ha reservado.
            </li>
          </ul>
        </div>
        <p v-if="nombreSalon(fichaDe(editando.id)?.salonPreferidoId)" class="text-xs text-tenue">
          Salón preferido guardado: {{ nombreSalon(fichaDe(editando.id)?.salonPreferidoId) }}.
        </p>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar ficha</KmButton>
      </template>
    </KmDrawer>
  </div>
</template>
