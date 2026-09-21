<script setup lang="ts">
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { proveedoresService } from '@/services/erp.service'
import type { Proveedor } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

/** Proveedores: maestro global del ERP, solo consulta. */

const columnas: ColumnaTabla[] = [
  { clave: 'razonSocial', etiqueta: 'Proveedor', ordenable: true },
  { clave: 'ruc', etiqueta: 'RUC', clase: 'w-36', ordenable: true },
  { clave: 'contacto', etiqueta: 'Contacto', clase: 'w-48' },
  { clave: 'diasCredito', etiqueta: 'Condición', clase: 'w-32', ordenable: true },
]

const vacio = (): Omit<Proveedor, 'id'> => ({
  razonSocial: '',
  ruc: '',
  diasCredito: 0,
  activo: true,
})
const condicion = (dias: number) => (dias ? `Crédito ${dias} días` : 'Contado')
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <KmCatalogo
      titulo="Proveedores"
      subtitulo="Quién abastece a la cadena y en qué condiciones de pago."
      entidad="proveedor"
      solo-lectura
      :servicio="proveedoresService"
      :columnas="columnas"
      :nuevo="vacio"
      :nombre-de="(p: Proveedor) => p.razonSocial"
      :orden="{ campo: 'razonSocial', direccion: 'asc' }"
      :exportacion="[
        { etiqueta: 'Razón social', valor: (p: Proveedor) => p.razonSocial },
        { etiqueta: 'RUC', valor: (p: Proveedor) => p.ruc },
        { etiqueta: 'Contacto', valor: (p: Proveedor) => p.contacto },
        { etiqueta: 'Teléfono', valor: (p: Proveedor) => p.telefono },
        { etiqueta: 'Correo', valor: (p: Proveedor) => p.email },
        { etiqueta: 'Días de crédito', valor: (p: Proveedor) => p.diasCredito },
        { etiqueta: 'Activo', valor: (p: Proveedor) => p.activo },
      ]"
      archivo="proveedores-erp"
    >
      <template #col-razonSocial="{ fila }">
        <span class="font-medium text-tinta">{{ fila.razonSocial }}</span>
      </template>
      <template #col-ruc="{ fila }">
        <span class="font-mono text-xs text-tenue">{{ fila.ruc }}</span>
      </template>
      <template #col-contacto="{ fila }">
        <p class="text-tinta">{{ fila.contacto || '—' }}</p>
        <p v-if="fila.telefono" class="text-xs text-tenue">{{ fila.telefono }}</p>
      </template>
      <template #col-diasCredito="{ fila }">{{ condicion(fila.diasCredito) }}</template>

      <template #formulario="{ borrador }">
        <KmField v-slot="{ id }" label="Razón social">
          <KmInput :id="id" :model-value="borrador.razonSocial" />
        </KmField>
        <div class="grid grid-cols-2 gap-4">
          <KmField v-slot="{ id }" label="RUC">
            <KmInput :id="id" :model-value="borrador.ruc" />
          </KmField>
          <KmField v-slot="{ id }" label="Condición de pago">
            <KmInput :id="id" :model-value="condicion(borrador.diasCredito)" />
          </KmField>
          <KmField v-slot="{ id }" label="Contacto">
            <KmInput :id="id" :model-value="borrador.contacto ?? ''" />
          </KmField>
          <KmField v-slot="{ id }" label="Teléfono">
            <KmInput :id="id" :model-value="borrador.telefono ?? ''" />
          </KmField>
        </div>
        <KmField v-slot="{ id }" label="Correo">
          <KmInput :id="id" :model-value="borrador.email ?? ''" />
        </KmField>
      </template>
    </KmCatalogo>
  </div>
</template>
