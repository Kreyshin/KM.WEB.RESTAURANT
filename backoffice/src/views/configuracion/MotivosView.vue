<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { motivosService, tiposMotivoService } from '@/services/comercial.service'
import { dependenciasService } from '@/services/dependencias.service'
import type { Motivo, NuevoMotivo, NuevoTipoMotivo, OperacionMotivo, TipoMotivo } from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana } from '@/types/ui'
import { etiquetaOperacionMotivo, opcionesOperacionMotivo } from '@/utils/configuracion'

/**
 * Motivos y sus tipos (D-017). Los tipos los define el restaurante; lo cerrado
 * son las operaciones, que son los puntos del flujo donde el sistema se detiene
 * a pedir un motivo.
 */

const tipos = ref<TipoMotivo[]>([])
const tipoId = ref('')

async function cargarTipos() {
  tipos.value = await tiposMotivoService.todos()
  if (!tipos.value.some((t) => t.id === tipoId.value)) {
    tipoId.value = tipos.value[0]?.id ?? ''
  }
}
onMounted(cargarTipos)

const pestanas = computed<Pestana[]>(() => [
  ...tipos.value.map((t) => ({ valor: t.id, etiqueta: t.nombre })),
  { valor: 'tipos', etiqueta: 'Tipos de motivo' },
])

const tipoActivo = computed(() => tipos.value.find((t) => t.id === tipoId.value))

/** Dónde se pedirán los motivos del tipo que se está mirando. */
const dondeSePiden = computed(() => {
  const ops = tipoActivo.value?.operaciones ?? []
  if (!ops.length)
    return 'Este tipo no está enganchado a ninguna operación: sus motivos no se ofrecerán en ningún sitio.'
  return `Se ofrecen al: ${ops.map((o) => etiquetaOperacionMotivo[o].toLowerCase()).join('; ')}.`
})

const columnas: ColumnaTabla[] = [
  { clave: 'descripcion', etiqueta: 'Motivo', ordenable: true },
  { clave: 'requiereAutorizacion', etiqueta: 'Autorización', clase: 'w-44', ordenable: true },
]

const nuevo = (): NuevoMotivo => ({
  tipoId: tipoId.value,
  descripcion: '',
  requiereAutorizacion: false,
  activo: true,
})

function validar(m: NuevoMotivo): Record<string, string> {
  return m.descripcion.trim() ? {} : { descripcion: 'La descripción es obligatoria.' }
}

function nombreTipo(id: string) {
  return tipos.value.find((t) => t.id === id)?.nombre ?? '—'
}

const opcionesTipo = computed<OpcionSelect[]>(() =>
  tipos.value.map((t) => ({ valor: t.id, etiqueta: t.nombre })),
)

// ── Tipos de motivo ──

const columnasTipos: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Tipo', ordenable: true },
  { clave: 'operaciones', etiqueta: 'Dónde se piden' },
  { clave: 'motivos', etiqueta: 'Motivos', clase: 'w-28' },
]

const nuevoTipo = (): NuevoTipoMotivo => ({ nombre: '', operaciones: [], activo: true })

function validarTipo(t: NuevoTipoMotivo): Record<string, string> {
  if (!t.nombre.trim()) return { nombre: 'El nombre es obligatorio.' }
  if (!t.operaciones.length) {
    return { operaciones: 'Elige al menos una operación, o sus motivos no se ofrecerán.' }
  }
  return {}
}

function alternarOperacion(borrador: NuevoTipoMotivo, op: OperacionMotivo, marcado: boolean) {
  borrador.operaciones = marcado
    ? [...borrador.operaciones, op]
    : borrador.operaciones.filter((o) => o !== op)
}

const motivosPorTipo = ref<Record<string, number>>({})
async function contarMotivos() {
  const todos = await motivosService.todos()
  const cuenta: Record<string, number> = {}
  for (const m of todos) cuenta[m.tipoId] = (cuenta[m.tipoId] ?? 0) + 1
  motivosPorTipo.value = cuenta
}
onMounted(contarMotivos)

async function tiposCambiaron() {
  await Promise.all([cargarTipos(), contarMotivos()])
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <KmCard
      titulo="Motivos"
      subtitulo="Razones que el personal debe elegir para dejar trazabilidad en auditoría."
    >
      <KmTabs v-model="tipoId" :pestanas="pestanas" etiqueta="Tipo de motivo">
        <!-- Gestión de los tipos -->
        <KmCatalogo
          v-if="tipoId === 'tipos'"
          titulo="Tipos de motivo"
          entidad="tipo de motivo"
          sin-tarjeta
          :servicio="tiposMotivoService"
          :columnas="columnasTipos"
          :nuevo="nuevoTipo"
          :validar="validarTipo"
          :nombre-de="(t: TipoMotivo) => t.nombre"
          :exportacion="[
            { etiqueta: 'Tipo', valor: (t: TipoMotivo) => t.nombre },
            {
              etiqueta: 'Operaciones',
              valor: (t: TipoMotivo) =>
                t.operaciones.map((o) => etiquetaOperacionMotivo[o]).join(' · '),
            },
            { etiqueta: 'Activo', valor: (t: TipoMotivo) => t.activo },
          ]"
          archivo="tipos-de-motivo"
          @cambio="tiposCambiaron"
        >
          <template #col-nombre="{ fila }">
            <span class="font-medium text-tinta">{{ fila.nombre }}</span>
          </template>

          <template #col-operaciones="{ fila }">
            <span v-if="!fila.operaciones.length" class="text-sm font-medium text-vino">
              En ningún sitio
            </span>
            <ul v-else class="flex flex-wrap gap-1">
              <li
                v-for="o in fila.operaciones"
                :key="o"
                class="rounded-full border border-linea px-2 py-px text-xs text-tenue"
              >
                {{ etiquetaOperacionMotivo[o] }}
              </li>
            </ul>
          </template>

          <template #col-motivos="{ fila }">
            <span class="text-sm text-tenue tabular-nums">
              {{ motivosPorTipo[fila.id] ?? 0 }}
            </span>
          </template>

          <template #formulario="{ borrador, errores }">
            <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
              <KmInput
                :id="id"
                v-model="borrador.nombre"
                placeholder="Ej. Merma, Consumo del personal"
                :invalido="invalido"
              />
            </KmField>

            <KmField
              label="Dónde se piden"
              :error="errores.operaciones"
              ayuda="Las operaciones son fijas: cada una es un momento en el que el sistema ya se detiene a pedir un motivo. Los tipos y los motivos los defines tú."
            >
              <ul class="flex flex-col gap-1.5">
                <li v-for="o in opcionesOperacionMotivo" :key="o.valor">
                  <KmSwitch
                    :model-value="borrador.operaciones.includes(o.valor as OperacionMotivo)"
                    :etiqueta="o.etiqueta"
                    @update:model-value="
                      alternarOperacion(borrador, o.valor as OperacionMotivo, $event)
                    "
                  />
                </li>
              </ul>
            </KmField>
          </template>
        </KmCatalogo>

        <!-- Motivos del tipo elegido -->
        <template v-else>
          <p class="mb-4 text-sm text-tenue">{{ dondeSePiden }}</p>
          <!-- `key` fuerza un catálogo nuevo por tipo: cada uno con su filtro fijo. -->
          <KmCatalogo
            :key="tipoId"
            :titulo="`Motivos de ${nombreTipo(tipoId).toLowerCase()}`"
            entidad="motivo"
            sin-tarjeta
            :servicio="motivosService"
            :consecuencias-estado="dependenciasService.motivo"
            :columnas="columnas"
            :nuevo="nuevo"
            :validar="validar"
            :filtros-fijos="{ tipoId }"
            :nombre-de="(m: Motivo) => m.descripcion"
            :exportacion="[
              { etiqueta: 'Tipo', valor: (m: Motivo) => nombreTipo(m.tipoId) },
              { etiqueta: 'Motivo', valor: (m: Motivo) => m.descripcion },
              { etiqueta: 'Requiere autorización', valor: (m: Motivo) => m.requiereAutorizacion },
              { etiqueta: 'Activo', valor: (m: Motivo) => m.activo },
            ]"
            :archivo="`motivos-${nombreTipo(tipoId).toLowerCase()}`"
            @cambio="contarMotivos"
          >
            <template #col-descripcion="{ fila }">
              <span class="font-medium text-tinta">{{ fila.descripcion }}</span>
            </template>
            <template #col-requiereAutorizacion="{ fila }">
              <KmBadge v-if="fila.requiereAutorizacion" tono="laton" punto>
                Requiere administrador
              </KmBadge>
              <span v-else class="text-sm text-tenue">Libre</span>
            </template>

            <template #formulario="{ borrador, errores }">
              <KmField
                v-slot="{ id, invalido }"
                label="Descripción"
                requerido
                :error="errores.descripcion"
              >
                <KmInput
                  :id="id"
                  v-model="borrador.descripcion"
                  placeholder="Ej. Cliente se retiró"
                  :invalido="invalido"
                />
              </KmField>
              <KmField v-slot="{ id }" label="Tipo">
                <KmSelect :id="id" v-model="borrador.tipoId" :opciones="opcionesTipo" />
              </KmField>
              <KmSwitch
                v-model="borrador.requiereAutorizacion"
                etiqueta="Requiere autorización"
                descripcion="Un administrador debe aprobarlo con su PIN."
              />
            </template>
          </KmCatalogo>
        </template>
      </KmTabs>
    </KmCard>
  </div>
</template>
