<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useLocales } from '@/composables/useLocales'
import { estacionesService, impresorasService } from '@/services/produccion.service'
import { dependenciasService } from '@/services/dependencias.service'
import type {
  Consulta,
  EstacionProduccion,
  Impresora,
  NuevaEstacion,
  NuevaImpresora,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana } from '@/types/ui'
import { etiquetaUsoImpresora, opcionesUsoImpresora } from '@/utils/configuracion'
import { validarIpv4 } from '@/utils/validaciones'

const { opciones: opcionesLocal, nombreLocal } = useLocales()

const pestana = ref('estaciones')
const pestanas: Pestana[] = [
  { valor: 'estaciones', etiqueta: 'Estaciones de producción' },
  { valor: 'impresoras', etiqueta: 'Impresoras' },
]

/** Impresoras para el select de la estación y para mostrar su nombre en la tabla. */
const impresoras = shallowRef<Impresora[]>([])
async function cargarImpresoras() {
  impresoras.value = await impresorasService.todos()
}
onMounted(cargarImpresoras)

const nombreImpresora = (id?: string) => impresoras.value.find((i) => i.id === id)?.nombre

function opcionesImpresora(localId: string): OpcionSelect[] {
  return [
    { valor: '', etiqueta: 'Sin impresora' },
    ...impresoras.value
      .filter((i) => i.localId === localId && i.uso === 'comandas')
      .map((i) => ({ valor: i.id, etiqueta: i.nombre })),
  ]
}

const filtroLocalOpciones = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los locales' },
  ...opcionesLocal.value,
])

function filtroLocal(consulta: Consulta) {
  return {
    get: () => (consulta.filtros?.localId as string | undefined) ?? '',
    set: (v: string | number | undefined) =>
      (consulta.filtros = { ...consulta.filtros, localId: v || undefined }),
  }
}

// ── Estaciones ──
const columnasEstaciones: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Estación', ordenable: true },
  { clave: 'localId', etiqueta: 'Local', clase: 'w-40', ordenable: true },
  { clave: 'impresoraId', etiqueta: 'Imprime en', clase: 'w-48' },
]

const nuevaEstacion = (): NuevaEstacion => ({
  nombre: '',
  localId: opcionesLocal.value[0]?.valor as string,
  impresoraId: '',
  activo: true,
})

function validarEstacion(e: NuevaEstacion) {
  const errores: Record<string, string> = {}
  if (!e.nombre.trim()) errores.nombre = 'El nombre es obligatorio.'
  if (!e.localId) errores.localId = 'Elige un local.'
  if (!e.impresoraId) e.impresoraId = undefined
  return errores
}

// ── Impresoras ──
const columnasImpresoras: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Impresora', ordenable: true },
  { clave: 'localId', etiqueta: 'Local', clase: 'w-36', ordenable: true },
  { clave: 'uso', etiqueta: 'Uso', clase: 'w-36', ordenable: true },
  { clave: 'conexion', etiqueta: 'Conexión', clase: 'w-44' },
]

const nuevaImpresora = (): NuevaImpresora => ({
  nombre: '',
  localId: opcionesLocal.value[0]?.valor as string,
  uso: 'comandas',
  ancho: '80mm',
  conexion: 'red',
  direccionIp: '',
  activo: true,
})

function validarImpresora(i: NuevaImpresora) {
  const e: Record<string, string> = {}
  if (!i.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (!i.localId) e.localId = 'Elige un local.'
  if (i.conexion === 'red' && !validarIpv4(i.direccionIp ?? '')) {
    e.direccionIp = 'Ingresa una IP válida, p. ej. 192.168.1.50.'
  }
  return e
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCard
      titulo="Estaciones e impresoras"
      subtitulo="Dónde se prepara cada producto y en qué impresora sale su comanda."
    >
      <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Producción">
        <KmCatalogo
          v-if="pestana === 'estaciones'"
          titulo="Estaciones"
          entidad="estación"
          femenino
          sin-tarjeta
          :servicio="estacionesService"
          :consecuencias-estado="dependenciasService.estacion"
          :columnas="columnasEstaciones"
          :nuevo="nuevaEstacion"
          :validar="validarEstacion"
          :nombre-de="(e: EstacionProduccion) => e.nombre"
          :exportacion="[
            { etiqueta: 'Estación', valor: (e: EstacionProduccion) => e.nombre },
            { etiqueta: 'Local', valor: (e: EstacionProduccion) => nombreLocal(e.localId) },
            {
              etiqueta: 'Impresora',
              valor: (e: EstacionProduccion) => nombreImpresora(e.impresoraId),
            },
            { etiqueta: 'Activa', valor: (e: EstacionProduccion) => e.activo },
          ]"
          archivo="estaciones"
        >
          <template #filtros="{ consulta }">
            <div class="w-full sm:w-44">
              <KmSelect
                :model-value="filtroLocal(consulta).get()"
                :opciones="filtroLocalOpciones"
                etiqueta="Filtrar por local"
                @update:model-value="filtroLocal(consulta).set"
              />
            </div>
          </template>

          <template #col-nombre="{ fila }">
            <span class="font-medium text-tinta">{{ fila.nombre }}</span>
          </template>
          <template #col-localId="{ fila }">{{ nombreLocal(fila.localId) }}</template>
          <template #col-impresoraId="{ fila }">
            <span v-if="nombreImpresora(fila.impresoraId)" class="text-tinta">
              {{ nombreImpresora(fila.impresoraId) }}
            </span>
            <KmBadge v-else tono="laton" punto>Sin impresora</KmBadge>
          </template>

          <template #formulario="{ borrador, errores }">
            <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
              <KmInput
                :id="id"
                v-model="borrador.nombre"
                placeholder="Ej. Parrilla"
                :invalido="invalido"
              />
            </KmField>
            <KmField v-slot="{ id, invalido }" label="Local" requerido :error="errores.localId">
              <KmSelect
                :id="id"
                v-model="borrador.localId"
                :opciones="opcionesLocal"
                :invalido="invalido"
                @update:model-value="borrador.impresoraId = ''"
              />
            </KmField>
            <KmField
              v-slot="{ id, invalido }"
              label="Impresora de comandas"
              ayuda="Solo impresoras de comandas del mismo local."
              :error="errores.impresoraId"
            >
              <KmSelect
                :id="id"
                v-model="borrador.impresoraId"
                :opciones="opcionesImpresora(borrador.localId)"
                :invalido="invalido"
              />
            </KmField>
          </template>
        </KmCatalogo>

        <KmCatalogo
          v-else
          titulo="Impresoras"
          entidad="impresora"
          femenino
          sin-tarjeta
          :servicio="impresorasService"
          :consecuencias-estado="dependenciasService.impresora"
          :columnas="columnasImpresoras"
          :nuevo="nuevaImpresora"
          :validar="validarImpresora"
          :nombre-de="(i: Impresora) => i.nombre"
          :exportacion="[
            { etiqueta: 'Impresora', valor: (i: Impresora) => i.nombre },
            { etiqueta: 'Local', valor: (i: Impresora) => nombreLocal(i.localId) },
            { etiqueta: 'Uso', valor: (i: Impresora) => etiquetaUsoImpresora[i.uso] },
            { etiqueta: 'Ancho', valor: (i: Impresora) => i.ancho },
            { etiqueta: 'Conexión', valor: (i: Impresora) => i.conexion },
            { etiqueta: 'IP', valor: (i: Impresora) => i.direccionIp },
            { etiqueta: 'Activa', valor: (i: Impresora) => i.activo },
          ]"
          archivo="impresoras"
          @cambio="cargarImpresoras"
        >
          <template #filtros="{ consulta }">
            <div class="w-full sm:w-44">
              <KmSelect
                :model-value="filtroLocal(consulta).get()"
                :opciones="filtroLocalOpciones"
                etiqueta="Filtrar por local"
                @update:model-value="filtroLocal(consulta).set"
              />
            </div>
          </template>

          <template #col-nombre="{ fila }">
            <p class="font-medium text-tinta">{{ fila.nombre }}</p>
            <p class="text-xs text-tenue">Papel de {{ fila.ancho }}</p>
          </template>
          <template #col-localId="{ fila }">{{ nombreLocal(fila.localId) }}</template>
          <template #col-uso="{ fila }">
            <KmBadge>{{ etiquetaUsoImpresora[fila.uso] }}</KmBadge>
          </template>
          <template #col-conexion="{ fila }">
            <span v-if="fila.conexion === 'red'" class="font-mono text-xs text-tinta">
              {{ fila.direccionIp }}
            </span>
            <span v-else class="text-sm text-tenue">USB</span>
          </template>

          <template #formulario="{ borrador, errores }">
            <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
              <KmInput
                :id="id"
                v-model="borrador.nombre"
                placeholder="Ej. Cocina caliente"
                :invalido="invalido"
              />
            </KmField>
            <div class="grid grid-cols-2 gap-4">
              <KmField v-slot="{ id, invalido }" label="Local" requerido :error="errores.localId">
                <KmSelect
                  :id="id"
                  v-model="borrador.localId"
                  :opciones="opcionesLocal"
                  :invalido="invalido"
                />
              </KmField>
              <KmField v-slot="{ id }" label="Uso">
                <KmSelect :id="id" v-model="borrador.uso" :opciones="opcionesUsoImpresora" />
              </KmField>
              <KmField v-slot="{ id }" label="Ancho de papel">
                <KmSelect
                  :id="id"
                  v-model="borrador.ancho"
                  :opciones="[
                    { valor: '80mm', etiqueta: '80 mm' },
                    { valor: '58mm', etiqueta: '58 mm' },
                  ]"
                />
              </KmField>
              <KmField v-slot="{ id }" label="Conexión">
                <KmSelect
                  :id="id"
                  v-model="borrador.conexion"
                  :opciones="[
                    { valor: 'red', etiqueta: 'Red (IP)' },
                    { valor: 'usb', etiqueta: 'USB' },
                  ]"
                />
              </KmField>
            </div>
            <KmField
              v-if="borrador.conexion === 'red'"
              v-slot="{ id, invalido }"
              label="Dirección IP"
              requerido
              :error="errores.direccionIp"
            >
              <KmInput
                :id="id"
                v-model="borrador.direccionIp"
                inputmode="decimal"
                placeholder="192.168.1.50"
                :invalido="invalido"
              />
            </KmField>
          </template>
        </KmCatalogo>
      </KmTabs>
    </KmCard>
  </div>
</template>
