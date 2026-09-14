<script setup lang="ts">
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { mediosPagoService } from '@/services/comercial.service'
import { dependenciasService } from '@/services/dependencias.service'
import type { MedioPago, NuevoMedioPago } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { etiquetaTipoMedioPago, opcionesTipoMedioPago } from '@/utils/configuracion'

const columnas: ColumnaTabla[] = [
  { clave: 'orden', etiqueta: '#', clase: 'w-14', ordenable: true },
  { clave: 'nombre', etiqueta: 'Medio de pago', ordenable: true },
  { clave: 'tipo', etiqueta: 'Tipo', clase: 'w-40', ordenable: true },
  { clave: 'comisionPorcentaje', etiqueta: 'Comisión', clase: 'w-28 text-right', ordenable: true },
]

const nuevo = (): NuevoMedioPago => ({
  nombre: '',
  tipo: 'tarjeta',
  requiereReferencia: true,
  comisionPorcentaje: 0,
  orden: 99,
  activo: true,
})

function validar(m: NuevoMedioPago) {
  const e: Record<string, string> = {}
  if (!m.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  const comision = Number(m.comisionPorcentaje)
  if (!(comision >= 0 && comision <= 100)) e.comisionPorcentaje = 'Entre 0 % y 100 %.'
  if (!(Number(m.orden) >= 1)) e.orden = 'Un número desde 1.'
  m.comisionPorcentaje = comision
  m.orden = Number(m.orden)
  return e
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCatalogo
      solo-lectura
      titulo="Medios de pago"
      subtitulo="Formas de cobro disponibles en caja. El orden define cómo aparecen al cobrar."
      entidad="medio de pago"
      :servicio="mediosPagoService"
      :consecuencias-estado="dependenciasService.medioPago"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(m: MedioPago) => m.nombre"
      :orden="{ campo: 'orden', direccion: 'asc' }"
      :exportacion="[
        { etiqueta: 'Orden', valor: (m: MedioPago) => m.orden },
        { etiqueta: 'Medio de pago', valor: (m: MedioPago) => m.nombre },
        { etiqueta: 'Tipo', valor: (m: MedioPago) => etiquetaTipoMedioPago[m.tipo] },
        { etiqueta: 'Comisión %', valor: (m: MedioPago) => m.comisionPorcentaje },
        { etiqueta: 'Pide referencia', valor: (m: MedioPago) => m.requiereReferencia },
        { etiqueta: 'Activo', valor: (m: MedioPago) => m.activo },
      ]"
      archivo="medios-de-pago"
    >
      <template #col-orden="{ fila }">
        <span class="text-tenue tabular-nums">{{ fila.orden }}</span>
      </template>

      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p v-if="fila.requiereReferencia" class="text-xs text-tenue">Pide número de operación</p>
      </template>

      <template #col-tipo="{ fila }">
        <KmBadge>{{ etiquetaTipoMedioPago[fila.tipo] }}</KmBadge>
      </template>

      <template #col-comisionPorcentaje="{ fila }">
        <span class="tabular-nums" :class="fila.comisionPorcentaje ? 'text-tinta' : 'text-tenue'">
          {{ fila.comisionPorcentaje ? `${fila.comisionPorcentaje} %` : '—' }}
        </span>
      </template>

      <template #formulario="{ borrador, errores }">
        <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
          <KmInput :id="id" v-model="borrador.nombre" placeholder="Ej. Yape" :invalido="invalido" />
        </KmField>
        <KmField v-slot="{ id }" label="Tipo">
          <KmSelect :id="id" v-model="borrador.tipo" :opciones="opcionesTipoMedioPago" />
        </KmField>
        <div class="grid grid-cols-2 gap-4">
          <KmField
            v-slot="{ id, invalido }"
            label="Comisión (%)"
            ayuda="Lo que cobra el banco o la pasarela."
            :error="errores.comisionPorcentaje"
          >
            <KmNumero
              :id="id"
              v-model="borrador.comisionPorcentaje"
              :min="0"
              :max="100"
              :invalido="invalido"
              sufijo="%"
              :decimales="2"
              :step="0.5"
            />
          </KmField>
          <KmField v-slot="{ id, invalido }" label="Orden" :error="errores.orden">
            <KmNumero :id="id" v-model="borrador.orden" :min="1" :invalido="invalido" />
          </KmField>
        </div>
        <KmSwitch
          v-model="borrador.requiereReferencia"
          etiqueta="Pedir número de operación"
          descripcion="El cajero debe registrar el voucher o código de la transacción."
        />
      </template>
    </KmCatalogo>
  </div>
</template>
