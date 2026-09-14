<script setup lang="ts">
import { computed } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo, { type ServicioCatalogo } from '@/components/ui/KmCatalogo.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { codigoUbicacion, ubicacionesService } from '@/services/abastecimiento.service'
import type { Consulta, Ubicacion } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'

/**
 * Dónde se guarda cada cosa dentro de un almacén (F4.3, D-004). La recepción
 * deja el stock en la ubicación por defecto del almacén; sin ella, un insumo
 * que controla ubicación no se puede recepcionar.
 */

const catalogos = useCatalogos(['almacenes', 'locales'])
const { nombreAlmacen, opcionesAlmacen } = catalogos

const servicio: ServicioCatalogo<Ubicacion> = ubicacionesService

const columnas: ColumnaTabla[] = [
  { clave: 'codigo', etiqueta: 'Ubicación', ordenable: false },
  { clave: 'almacenId', etiqueta: 'Almacén', clase: 'w-56', ordenable: true },
  { clave: 'pasillo', etiqueta: 'Pasillo', clase: 'w-32', ordenable: true },
  { clave: 'estante', etiqueta: 'Estante', clase: 'w-32', ordenable: true },
]

const opcionesAlmacenFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los almacenes' },
  ...opcionesAlmacen.value,
])

function nuevo(): Omit<Ubicacion, 'id'> {
  return {
    almacenId: (opcionesAlmacen.value[0]?.valor as string) ?? '',
    pasillo: '',
    estante: '',
    fila: '',
    columna: '',
    porDefecto: false,
    activo: true,
  }
}

function validar(u: Omit<Ubicacion, 'id'>): Record<string, string> {
  const e: Record<string, string> = {}
  if (!u.almacenId) e.almacenId = 'Elige el almacén.'
  if (!codigoUbicacion(u)) e.pasillo = 'Indica al menos pasillo o estante.'
  return e
}

function filtrar(consulta: Consulta, valor: string | number | undefined) {
  consulta.filtros = { ...consulta.filtros, almacenId: valor || undefined }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-5">
    <KmCatalogo
      titulo="Ubicaciones"
      subtitulo="Pasillo, estante, fila y columna dentro de cada almacén. Una por defecto por almacén: es donde aterriza lo que se recepciona."
      entidad="ubicación"
      femenino
      :servicio="servicio"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(u: Ubicacion) => `${codigoUbicacion(u)} · ${nombreAlmacen(u.almacenId)}`"
      :orden="{ campo: 'pasillo', direccion: 'asc' }"
      :exportacion="[
        { etiqueta: 'Almacén', valor: (u: Ubicacion) => nombreAlmacen(u.almacenId) },
        { etiqueta: 'Código', valor: (u: Ubicacion) => codigoUbicacion(u) },
        { etiqueta: 'Pasillo', valor: (u: Ubicacion) => u.pasillo },
        { etiqueta: 'Estante', valor: (u: Ubicacion) => u.estante },
        { etiqueta: 'Fila', valor: (u: Ubicacion) => u.fila },
        { etiqueta: 'Columna', valor: (u: Ubicacion) => u.columna },
        { etiqueta: 'Por defecto', valor: (u: Ubicacion) => u.porDefecto },
        { etiqueta: 'Activa', valor: (u: Ubicacion) => u.activo },
      ]"
      archivo="ubicaciones"
      @cambio="catalogos.recargar"
    >
      <template #filtros="{ consulta }">
        <div class="w-full sm:w-56">
          <KmSelect
            :model-value="(consulta.filtros?.almacenId as string) ?? ''"
            :opciones="opcionesAlmacenFiltro"
            etiqueta="Filtrar por almacén"
            @update:model-value="filtrar(consulta, $event)"
          />
        </div>
      </template>

      <template #col-codigo="{ fila }">
        <p class="font-medium text-tinta tabular-nums">{{ codigoUbicacion(fila) }}</p>
        <KmBadge v-if="fila.porDefecto" tono="verde" punto>Por defecto</KmBadge>
      </template>
      <template #col-almacenId="{ fila }">{{ nombreAlmacen(fila.almacenId) }}</template>

      <template #formulario="{ borrador, errores }">
        <KmField v-slot="{ id, invalido }" label="Almacén" requerido :error="errores.almacenId">
          <KmSelect
            :id="id"
            v-model="borrador.almacenId"
            :opciones="opcionesAlmacen"
            :invalido="invalido"
          />
        </KmField>
        <div class="grid grid-cols-2 gap-4">
          <KmField v-slot="{ id, invalido }" label="Pasillo" :error="errores.pasillo">
            <KmInput :id="id" v-model="borrador.pasillo" placeholder="P1" :invalido="invalido" />
          </KmField>
          <KmField v-slot="{ id }" label="Estante">
            <KmInput :id="id" v-model="borrador.estante" placeholder="A" />
          </KmField>
          <KmField v-slot="{ id }" label="Fila">
            <KmInput :id="id" v-model="borrador.fila" placeholder="1" />
          </KmField>
          <KmField v-slot="{ id }" label="Columna">
            <KmInput :id="id" v-model="borrador.columna" placeholder="1" />
          </KmField>
        </div>
        <p class="text-xs text-tenue">
          Código resultante:
          <strong class="text-tinta">{{ codigoUbicacion(borrador) || '—' }}</strong>
        </p>
        <KmCheckbox
          v-model="borrador.porDefecto"
          ayuda="Al marcarla, deja de serlo la que lo fuera antes."
        >
          Ubicación por defecto del almacén
        </KmCheckbox>
      </template>
    </KmCatalogo>
  </div>
</template>
