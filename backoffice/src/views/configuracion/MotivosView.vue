<script setup lang="ts">
import { ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { motivosService } from '@/services/comercial.service'
import type { Motivo, NuevoMotivo, TipoMotivo } from '@/types'
import type { ColumnaTabla, Pestana } from '@/types/ui'
import { etiquetaTipoMotivo } from '@/utils/configuracion'

const tipo = ref<TipoMotivo>('anulacion')

const pestanas: Pestana[] = [
  { valor: 'anulacion', etiqueta: 'Anulación' },
  { valor: 'descuento', etiqueta: 'Descuento' },
  { valor: 'cortesia', etiqueta: 'Cortesía' },
]

const ayuda: Record<TipoMotivo, string> = {
  anulacion: 'Se piden al anular un producto ya enviado a cocina o una venta cobrada.',
  descuento: 'Justifican una rebaja sobre el precio de un producto o de la cuenta.',
  cortesia: 'Productos que la casa invita y salen a precio cero.',
}

const columnas: ColumnaTabla[] = [
  { clave: 'descripcion', etiqueta: 'Motivo', ordenable: true },
  { clave: 'requiereAutorizacion', etiqueta: 'Autorización', clase: 'w-44', ordenable: true },
]

const nuevo = (): NuevoMotivo => ({
  tipo: tipo.value,
  descripcion: '',
  requiereAutorizacion: false,
  activo: true,
})

function validar(m: NuevoMotivo): Record<string, string> {
  return m.descripcion.trim() ? {} : { descripcion: 'La descripción es obligatoria.' }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCard
      titulo="Motivos"
      subtitulo="Razones que el personal debe elegir para dejar trazabilidad en auditoría."
    >
      <KmTabs v-model="tipo" :pestanas="pestanas" etiqueta="Tipo de motivo">
        <p class="mb-4 text-sm text-tenue">{{ ayuda[tipo] }}</p>
        <!-- `key` fuerza un catálogo nuevo por tipo: cada uno con su filtro fijo. -->
        <KmCatalogo
          :key="tipo"
          :titulo="`Motivos de ${etiquetaTipoMotivo[tipo].toLowerCase()}`"
          entidad="motivo"
          sin-tarjeta
          :servicio="motivosService"
          :columnas="columnas"
          :nuevo="nuevo"
          :validar="validar"
          :filtros-fijos="{ tipo }"
          :nombre-de="(m: Motivo) => m.descripcion"
          :exportacion="[
            { etiqueta: 'Tipo', valor: (m: Motivo) => etiquetaTipoMotivo[m.tipo] },
            { etiqueta: 'Motivo', valor: (m: Motivo) => m.descripcion },
            { etiqueta: 'Requiere autorización', valor: (m: Motivo) => m.requiereAutorizacion },
            { etiqueta: 'Activo', valor: (m: Motivo) => m.activo },
          ]"
          :archivo="`motivos-${tipo}`"
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
            <KmSwitch
              v-model="borrador.requiereAutorizacion"
              etiqueta="Requiere autorización"
              descripcion="Un administrador debe aprobarlo con su PIN."
            />
          </template>
        </KmCatalogo>
      </KmTabs>
    </KmCard>
  </div>
</template>
