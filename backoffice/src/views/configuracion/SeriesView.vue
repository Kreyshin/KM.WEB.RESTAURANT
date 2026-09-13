<script setup lang="ts">
import { computed } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useLocales } from '@/composables/useLocales'
import { seriesService } from '@/services/produccion.service'
import { dependenciasService } from '@/services/dependencias.service'
import type { Consulta, NuevaSerie, SerieComprobante } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import {
  etiquetaTipoComprobante,
  opcionesTipoComprobante,
  tonoTipoComprobante,
} from '@/utils/configuracion'
import { ejemploSerie, formatearNumeroComprobante, validarSerie } from '@/utils/validaciones'

const { opciones: opcionesLocal, nombreLocal } = useLocales()

const columnas: ColumnaTabla[] = [
  { clave: 'serie', etiqueta: 'Serie', clase: 'w-28', ordenable: true },
  { clave: 'tipo', etiqueta: 'Comprobante', clase: 'w-40', ordenable: true },
  { clave: 'localId', etiqueta: 'Local', ordenable: true },
  { clave: 'correlativo', etiqueta: 'Siguiente número', clase: 'w-48 text-right', ordenable: true },
]

const nuevo = (): NuevaSerie => ({
  localId: opcionesLocal.value[0]?.valor as string,
  tipo: 'boleta',
  serie: '',
  correlativo: 0,
  activo: true,
})

function validar(s: NuevaSerie) {
  const e: Record<string, string> = {}
  s.serie = s.serie.trim().toUpperCase()
  s.correlativo = Number(s.correlativo)
  if (!s.localId) e.localId = 'Elige un local.'
  if (!validarSerie(s.tipo, s.serie)) e.serie = `Formato no válido. Ej. ${ejemploSerie[s.tipo]}.`
  if (!Number.isInteger(s.correlativo) || s.correlativo < 0) {
    e.correlativo = 'Un número entero desde 0.'
  }
  return e
}

const opcionesFiltroLocal = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los locales' },
  ...opcionesLocal.value,
])
const opcionesFiltroTipo: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los comprobantes' },
  ...opcionesTipoComprobante,
]

function filtrar(consulta: Consulta, campo: string, valor: string | number | undefined) {
  consulta.filtros = { ...consulta.filtros, [campo]: valor || undefined }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCatalogo
      titulo="Series de comprobantes"
      subtitulo="Numeración de boletas, facturas y notas por local. Una serie no se repite en todo el RUC."
      entidad="serie"
      femenino
      :servicio="seriesService"
      :consecuencias-estado="dependenciasService.serie"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(s: SerieComprobante) => s.serie"
      :orden="{ campo: 'serie', direccion: 'asc' }"
      :exportacion="[
        { etiqueta: 'Serie', valor: (s: SerieComprobante) => s.serie },
        {
          etiqueta: 'Comprobante',
          valor: (s: SerieComprobante) => etiquetaTipoComprobante[s.tipo],
        },
        { etiqueta: 'Local', valor: (s: SerieComprobante) => nombreLocal(s.localId) },
        { etiqueta: 'Último emitido', valor: (s: SerieComprobante) => s.correlativo },
        { etiqueta: 'Activa', valor: (s: SerieComprobante) => s.activo },
      ]"
      archivo="series"
    >
      <template #filtros="{ consulta }">
        <div class="w-full sm:w-44">
          <KmSelect
            :model-value="(consulta.filtros?.localId as string) ?? ''"
            :opciones="opcionesFiltroLocal"
            etiqueta="Filtrar por local"
            @update:model-value="filtrar(consulta, 'localId', $event)"
          />
        </div>
        <div class="w-full sm:w-48">
          <KmSelect
            :model-value="(consulta.filtros?.tipo as string) ?? ''"
            :opciones="opcionesFiltroTipo"
            etiqueta="Filtrar por comprobante"
            @update:model-value="filtrar(consulta, 'tipo', $event)"
          />
        </div>
      </template>

      <template #col-serie="{ fila }">
        <span class="font-mono font-semibold text-tinta">{{ fila.serie }}</span>
      </template>
      <template #col-tipo="{ fila }">
        <KmBadge :tono="tonoTipoComprobante[fila.tipo]">
          {{ etiquetaTipoComprobante[fila.tipo] }}
        </KmBadge>
      </template>
      <template #col-localId="{ fila }">{{ nombreLocal(fila.localId) }}</template>
      <template #col-correlativo="{ fila }">
        <span class="font-mono text-xs text-tinta tabular-nums">
          {{ formatearNumeroComprobante(fila.serie, fila.correlativo + 1) }}
        </span>
      </template>

      <template #formulario="{ borrador, errores, editando }">
        <div class="grid grid-cols-2 gap-4">
          <KmField v-slot="{ id }" label="Comprobante">
            <KmSelect
              :id="id"
              v-model="borrador.tipo"
              :opciones="opcionesTipoComprobante"
              :disabled="editando"
            />
          </KmField>
          <KmField v-slot="{ id, invalido }" label="Local" requerido :error="errores.localId">
            <KmSelect
              :id="id"
              v-model="borrador.localId"
              :opciones="opcionesLocal"
              :invalido="invalido"
              :disabled="editando"
            />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Serie"
            requerido
            :ayuda="`Cuatro caracteres. Ej. ${ejemploSerie[borrador.tipo]}.`"
            :error="errores.serie"
          >
            <KmInput
              :id="id"
              v-model="borrador.serie"
              class="font-mono uppercase"
              :invalido="invalido"
              :disabled="editando"
            />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Último número emitido"
            ayuda="0 si la serie es nueva."
            :error="errores.correlativo"
          >
            <KmNumero :id="id" v-model="borrador.correlativo" :min="0" :invalido="invalido" />
          </KmField>
        </div>

        <div class="rounded-card border border-dashed border-linea bg-panel-2 px-4 py-3">
          <p class="rs-etiqueta text-tenue">Próximo comprobante</p>
          <p class="mt-1 font-mono text-lg text-tinta tabular-nums">
            {{
              formatearNumeroComprobante(borrador.serie || '····', Number(borrador.correlativo) + 1)
            }}
          </p>
        </div>

        <p v-if="editando" class="text-xs text-tenue">
          El tipo, el local y la serie no se cambian una vez creada: los comprobantes ya emitidos
          dependen de ellos. El correlativo solo puede avanzar.
        </p>
      </template>
    </KmCatalogo>
  </div>
</template>
