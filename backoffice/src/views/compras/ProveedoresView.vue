<script setup lang="ts">
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import { proveedoresService } from '@/services/compras.service'
import type { NuevoProveedor, Proveedor } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { validarEmail, validarRuc } from '@/utils/validaciones'

const columnas: ColumnaTabla[] = [
  { clave: 'razonSocial', etiqueta: 'Proveedor', ordenable: true },
  { clave: 'ruc', etiqueta: 'RUC', clase: 'w-36', ordenable: true },
  { clave: 'contacto', etiqueta: 'Contacto', clase: 'w-48' },
  { clave: 'diasCredito', etiqueta: 'Condición', clase: 'w-32', ordenable: true },
]

const nuevo = (): NuevoProveedor => ({
  razonSocial: '',
  ruc: '',
  contacto: '',
  telefono: '',
  email: '',
  diasCredito: 0,
  activo: true,
})

function validar(p: NuevoProveedor): Record<string, string> {
  const e: Record<string, string> = {}
  p.ruc = p.ruc.replace(/\D/g, '')
  if (!p.razonSocial.trim()) e.razonSocial = 'La razón social es obligatoria.'
  if (!validarRuc(p.ruc)) e.ruc = 'Ingresa un RUC válido de 11 dígitos.'
  if (p.email && !validarEmail(p.email)) e.email = 'El correo no es válido.'
  p.diasCredito = Number(p.diasCredito) || 0
  return e
}

const condicion = (dias: number) => (dias ? `Crédito ${dias} días` : 'Contado')

async function consecuencias(_id: string, activar: boolean) {
  return [
    activar
      ? 'Vuelve a aparecer al crear órdenes de compra.'
      : 'No se podrán crear órdenes de compra nuevas con este proveedor. Las existentes no cambian.',
  ]
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCatalogo
      titulo="Proveedores"
      subtitulo="Quién abastece al restaurante y en qué condiciones de pago."
      entidad="proveedor"
      :servicio="proveedoresService"
      :consecuencias-estado="consecuencias"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
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
      archivo="proveedores"
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

      <template #formulario="{ borrador, errores }">
        <KmField
          v-slot="{ id, invalido }"
          label="Razón social"
          requerido
          :error="errores.razonSocial"
        >
          <KmInput :id="id" v-model="borrador.razonSocial" :invalido="invalido" />
        </KmField>
        <div class="grid grid-cols-2 gap-4">
          <KmField v-slot="{ id, invalido }" label="RUC" requerido :error="errores.ruc">
            <KmInput
              :id="id"
              v-model="borrador.ruc"
              placeholder="20XXXXXXXXX"
              :invalido="invalido"
            />
          </KmField>
          <KmField v-slot="{ id }" label="Días de crédito" ayuda="0 = pago al contado.">
            <KmNumero :id="id" v-model="borrador.diasCredito" :min="0" :max="120" sufijo="días" />
          </KmField>
          <KmField v-slot="{ id }" label="Contacto">
            <KmInput :id="id" v-model="borrador.contacto" />
          </KmField>
          <KmField v-slot="{ id }" label="Teléfono">
            <KmInput :id="id" v-model="borrador.telefono" type="tel" />
          </KmField>
        </div>
        <KmField v-slot="{ id, invalido }" label="Correo" :error="errores.email">
          <KmInput :id="id" v-model="borrador.email" type="email" :invalido="invalido" />
        </KmField>
      </template>
    </KmCatalogo>
  </div>
</template>
