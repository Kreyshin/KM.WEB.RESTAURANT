<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import MesaFormModal from './MesaFormModal.vue'
import PlanoSalon from './PlanoSalon.vue'
import { mesasService } from '@/services/mesas.service'
import { salonesService } from '@/services/salones.service'
import { usuariosService } from '@/services/usuarios.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, EstadoMesa, Mesa, NuevaMesa, Salon, Usuario } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { estadosMesa, etiquetaEstado, etiquetaForma, tonoEstado } from '@/utils/mesas'

const auth = useAuthStore()
const ui = useUiStore()

const salones = ref<Salon[]>([])
const mesas = ref<Mesa[]>([])
const meseros = ref<Usuario[]>([])
const cargando = ref(true)

const vista = ref<'plano' | 'lista'>('plano')
const salonActivo = ref<string>('')
const filtroEstado = ref<EstadoMesa | ''>('')
const busqueda = ref('')

const modalAbierto = ref(false)
const mesaEnEdicion = ref<Mesa | null>(null)
const formRef = ref<InstanceType<typeof MesaFormModal> | null>(null)

const confirmAbierto = ref(false)
const mesaAEliminar = ref<Mesa | null>(null)
const eliminando = ref(false)

/** Solo el administrador configura la sala; el resto ve y cambia estados. */
const puedeConfigurar = computed(() => auth.puede(['admin']))

const columnas: ColumnaTabla[] = [
  { clave: 'codigo', etiqueta: 'Código', clase: 'w-28' },
  { clave: 'salon', etiqueta: 'Salón' },
  { clave: 'capacidad', etiqueta: 'Capacidad', clase: 'w-28' },
  { clave: 'forma', etiqueta: 'Forma', clase: 'w-32' },
  { clave: 'mesero', etiqueta: 'Mesero' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-40' },
  { clave: 'acciones', etiqueta: '', clase: 'w-32 text-right' },
]

const opcionesFiltroEstado: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los estados' },
  ...estadosMesa.map((e) => ({ valor: e, etiqueta: etiquetaEstado[e] })),
]

const mesasDelSalon = computed(() => mesas.value.filter((m) => m.salonId === salonActivo.value))

const mesasFiltradas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return mesasDelSalon.value.filter((m) => {
    if (filtroEstado.value && m.estado !== filtroEstado.value) return false
    if (texto && !m.codigo.toLowerCase().includes(texto)) return false
    return true
  })
})

const resumenSalon = computed(() =>
  estadosMesa
    .map((estado) => ({
      estado,
      cantidad: mesasDelSalon.value.filter((m) => m.estado === estado).length,
    }))
    .filter((r) => r.cantidad > 0),
)

function nombreSalon(id: string) {
  return salones.value.find((s) => s.id === id)?.nombre ?? '—'
}

function nombreMesero(id?: string) {
  if (!id) return null
  return meseros.value.find((m) => m.id === id)?.nombre ?? 'Desconocido'
}

async function cargar() {
  cargando.value = true
  try {
    ;[salones.value, mesas.value, meseros.value] = await Promise.all([
      salonesService.listar(),
      mesasService.listar(),
      usuariosService.listarMeseros(),
    ])
    if (!salonActivo.value || !salones.value.some((s) => s.id === salonActivo.value)) {
      salonActivo.value = salones.value[0]?.id ?? ''
    }
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar las mesas.')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// Al cambiar de salón se limpian los filtros para no mostrar un listado vacío sin motivo.
watch(salonActivo, () => {
  filtroEstado.value = ''
  busqueda.value = ''
})

function abrirNueva() {
  mesaEnEdicion.value = null
  modalAbierto.value = true
}

function abrirEdicion(mesa: Mesa) {
  mesaEnEdicion.value = mesa
  modalAbierto.value = true
}

async function guardar(datos: NuevaMesa, id?: string) {
  try {
    if (id) {
      await mesasService.actualizar(id, datos)
      ui.exito('Mesa actualizada.')
    } else {
      await mesasService.crear(datos)
      ui.exito('Mesa creada.')
    }
    modalAbierto.value = false
    await cargar()
  } catch (e) {
    const err = e as ApiError
    ui.error(err.mensaje ?? 'No se pudo guardar la mesa.')
    formRef.value?.mostrarError(err)
  }
}

async function cambiarEstado(mesa: Mesa, estado: EstadoMesa) {
  if (mesa.estado === estado) return
  const anterior = mesa.estado
  mesa.estado = estado // Actualización optimista: el plano responde al instante.
  try {
    const actualizada = await mesasService.cambiarEstado(mesa.id, estado)
    Object.assign(mesa, actualizada)
  } catch (e) {
    mesa.estado = anterior
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar el estado.')
  }
}

// ── Unir y separar mesas ──
const uniendo = ref(false)
const seleccion = ref<string[]>([])

function alternarModoUnir() {
  uniendo.value = !uniendo.value
  seleccion.value = []
}

function alSeleccionarEnPlano(mesa: Mesa) {
  if (uniendo.value) {
    if (mesa.grupoId) {
      ui.notificar(`${mesa.codigo} ya está unida. Sepárala antes de unirla de nuevo.`)
      return
    }
    seleccion.value = seleccion.value.includes(mesa.id)
      ? seleccion.value.filter((id) => id !== mesa.id)
      : [...seleccion.value, mesa.id]
    return
  }
  if (puedeConfigurar.value) abrirEdicion(mesa)
}

const capacidadSeleccion = computed(() =>
  mesas.value.filter((m) => seleccion.value.includes(m.id)).reduce((t, m) => t + m.capacidad, 0),
)

/** Uniones del salón activo, con sus mesas y la capacidad total. */
const uniones = computed(() => {
  const grupos = new Map<string, Mesa[]>()
  for (const m of mesasDelSalon.value) {
    if (!m.grupoId) continue
    if (!grupos.has(m.grupoId)) grupos.set(m.grupoId, [])
    grupos.get(m.grupoId)!.push(m)
  }
  return [...grupos.entries()].map(([grupoId, lista]) => ({
    grupoId,
    mesas: lista,
    capacidad: lista.reduce((t, m) => t + m.capacidad, 0),
  }))
})

async function unirSeleccion() {
  try {
    await mesasService.unir(seleccion.value)
    ui.exito(`Mesas unidas: ${capacidadSeleccion.value} personas.`)
    uniendo.value = false
    seleccion.value = []
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron unir las mesas.')
  }
}

async function separar(grupoId: string) {
  try {
    await mesasService.separar(grupoId)
    ui.exito('Mesas separadas.')
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron separar las mesas.')
  }
}

async function moverMesa(id: string, posX: number, posY: number) {
  const mesa = mesas.value.find((m) => m.id === id)
  if (!mesa) return
  const anterior = { x: mesa.posX, y: mesa.posY }
  mesa.posX = posX
  mesa.posY = posY
  try {
    await mesasService.mover(id, posX, posY)
  } catch (e) {
    mesa.posX = anterior.x
    mesa.posY = anterior.y
    ui.error((e as ApiError).mensaje ?? 'No se pudo mover la mesa.')
  }
}

function pedirEliminar(mesa: Mesa) {
  mesaAEliminar.value = mesa
  confirmAbierto.value = true
}

async function eliminar() {
  if (!mesaAEliminar.value) return
  eliminando.value = true
  try {
    await mesasService.eliminar(mesaAEliminar.value.id)
    ui.exito('Mesa eliminada.')
    confirmAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar la mesa.')
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-4">
    <!-- Selector de salón + acciones -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-1 rounded-control bg-panel p-1 border border-linea">
        <button
          v-for="s in salones"
          :key="s.id"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            salonActivo === s.id
              ? 'bg-verde text-white'
              : 'text-tenue hover:bg-seleccion hover:text-tinta'
          "
          @click="salonActivo = s.id"
        >
          {{ s.nombre }}
        </button>
        <p v-if="!cargando && salones.length === 0" class="px-3 py-1.5 text-sm text-tenue">
          No hay salones configurados.
        </p>
      </div>

      <div class="flex-1" />

      <div class="flex gap-1 rounded-control bg-panel p-1 border border-linea">
        <button
          v-for="v in ['plano', 'lista'] as const"
          :key="v"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors"
          :class="vista === v ? 'bg-seleccion text-tinta' : 'text-tenue hover:text-tinta'"
          @click="vista = v"
        >
          {{ v }}
        </button>
      </div>

      <KmButton v-if="puedeConfigurar" :disabled="salones.length === 0" @click="abrirNueva">
        Nueva mesa
      </KmButton>
    </div>

    <!-- Resumen de estados del salón -->
    <div v-if="resumenSalon.length" class="flex flex-wrap items-center gap-2">
      <KmBadge v-for="r in resumenSalon" :key="r.estado" :tono="tonoEstado[r.estado]" punto>
        {{ etiquetaEstado[r.estado] }}: {{ r.cantidad }}
      </KmBadge>
    </div>

    <!-- Vista de plano -->
    <KmCard
      v-if="vista === 'plano'"
      :titulo="`Plano · ${nombreSalon(salonActivo)}`"
      :subtitulo="
        puedeConfigurar
          ? 'Arrastra una mesa para reubicarla. Haz clic para editarla.'
          : 'Haz clic en una mesa para ver su detalle.'
      "
    >
      <template #acciones>
        <template v-if="uniendo">
          <span class="text-sm text-tenue tabular-nums">
            {{ seleccion.length }} mesas · {{ capacidadSeleccion }} personas
          </span>
          <KmButton variante="secundario" tamano="sm" @click="alternarModoUnir">Cancelar</KmButton>
          <KmButton tamano="sm" :disabled="seleccion.length < 2" @click="unirSeleccion">
            Unir mesas
          </KmButton>
        </template>
        <KmButton v-else variante="secundario" tamano="sm" @click="alternarModoUnir">
          Unir mesas
        </KmButton>
      </template>

      <p v-if="uniendo" class="rs-tono rs-tono-laton mb-3 rounded-control border px-3 py-2 text-sm">
        Toca las mesas que quieres juntar para un grupo. Deben ser del mismo salón.
      </p>

      <PlanoSalon
        :mesas="mesasDelSalon"
        :editable="puedeConfigurar && !uniendo"
        :seleccionando="uniendo"
        :seleccionadas="seleccion"
        @mover="moverMesa"
        @seleccionar="alSeleccionarEnPlano"
      />

      <ul v-if="uniones.length" class="mt-4 flex flex-wrap gap-2">
        <li
          v-for="u in uniones"
          :key="u.grupoId"
          class="flex items-center gap-2 rounded-full border border-linea bg-panel py-1 pr-1 pl-3 text-sm"
        >
          <span class="text-tinta">{{ u.mesas.map((m) => m.codigo).join(' + ') }}</span>
          <span class="text-xs text-tenue tabular-nums">{{ u.capacidad }} p.</span>
          <KmBotonIcono
            icono="separar"
            etiqueta="Separar"
            :contexto="u.mesas.map((m) => m.codigo).join(' y ')"
            @click="separar(u.grupoId)"
          />
        </li>
      </ul>
    </KmCard>

    <!-- Vista de lista -->
    <KmCard v-else titulo="Mesas" sin-padding>
      <template #acciones>
        <KmInput v-model="busqueda" placeholder="Buscar código…" class="!w-40" />
        <KmSelect v-model="filtroEstado" :opciones="opcionesFiltroEstado" class="!w-44" />
      </template>

      <KmTable
        :columnas="columnas"
        :filas="mesasFiltradas"
        :cargando="cargando"
        mensaje-vacio="No hay mesas que coincidan con el filtro."
      >
        <template #col-codigo="{ fila }">
          <span class="font-medium text-tinta">{{ fila.codigo }}</span>
          <p v-if="fila.grupoId" class="text-xs text-laton-texto">
            Unida con
            {{
              mesas
                .filter((m) => m.grupoId === fila.grupoId && m.id !== fila.id)
                .map((m) => m.codigo)
                .join(', ')
            }}
          </p>
        </template>

        <template #col-salon="{ fila }">{{ nombreSalon(fila.salonId) }}</template>

        <template #col-capacidad="{ fila }">
          <span class="tabular-nums">{{ fila.capacidad }} p.</span>
        </template>

        <template #col-forma="{ fila }">{{ etiquetaForma[fila.forma] }}</template>

        <template #col-mesero="{ fila }">
          <span v-if="nombreMesero(fila.meseroId)">{{ nombreMesero(fila.meseroId) }}</span>
          <span v-else class="text-tenue">Sin asignar</span>
        </template>

        <template #col-estado="{ fila }">
          <KmSelect
            :model-value="fila.estado"
            :opciones="estadosMesa.map((e) => ({ valor: e, etiqueta: etiquetaEstado[e] }))"
            @update:model-value="cambiarEstado(fila, $event as EstadoMesa)"
          />
        </template>

        <template #col-acciones="{ fila }">
          <div v-if="puedeConfigurar" class="flex justify-end gap-0.5">
            <KmBotonIcono
              icono="editar"
              etiqueta="Editar"
              :contexto="`mesa ${fila.codigo}`"
              @click="abrirEdicion(fila)"
            />
            <KmBotonIcono
              icono="eliminar"
              tono="peligro"
              etiqueta="Eliminar"
              :contexto="`mesa ${fila.codigo}`"
              @click="pedirEliminar(fila)"
            />
          </div>
        </template>
      </KmTable>
    </KmCard>

    <MesaFormModal
      ref="formRef"
      v-model="modalAbierto"
      :mesa="mesaEnEdicion"
      :salones="salones"
      :meseros="meseros"
      :salon-por-defecto="salonActivo"
      @guardado="guardar"
    />

    <KmConfirm
      v-model="confirmAbierto"
      titulo="Eliminar mesa"
      :mensaje="`¿Eliminar la mesa «${mesaAEliminar?.codigo}»? Esta acción no se puede deshacer.`"
      texto-confirmar="Eliminar"
      peligroso
      :cargando="eliminando"
      @confirmar="eliminar"
    />
  </div>
</template>
