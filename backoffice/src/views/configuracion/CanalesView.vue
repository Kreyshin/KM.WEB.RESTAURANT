<script setup lang="ts">
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { canalesService } from '@/services/comercial.service'
import { dependenciasService } from '@/services/dependencias.service'
import type { CanalVenta, NuevoCanalVenta } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { etiquetaTipoCanal, opcionesTipoCanal } from '@/utils/configuracion'

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Canal', ordenable: true },
  { clave: 'tipo', etiqueta: 'Tipo', clase: 'w-44', ordenable: true },
  { clave: 'comisionPorcentaje', etiqueta: 'Comisión', clase: 'w-28 text-right', ordenable: true },
]

const nuevo = (): NuevoCanalVenta => ({
  nombre: '',
  tipo: 'plataforma',
  comisionPorcentaje: 0,
  activo: true,
})

function validar(c: NuevoCanalVenta) {
  const e: Record<string, string> = {}
  if (!c.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  const comision = Number(c.comisionPorcentaje)
  if (!(comision >= 0 && comision <= 100)) e.comisionPorcentaje = 'Entre 0 % y 100 %.'
  c.comisionPorcentaje = comision
  return e
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCatalogo
      titulo="Canales de venta"
      subtitulo="Por dónde entran los pedidos. Permite separar ventas y comisiones en los reportes."
      entidad="canal"
      :servicio="canalesService"
      :consecuencias-estado="dependenciasService.canal"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(c: CanalVenta) => c.nombre"
      :exportacion="[
        { etiqueta: 'Canal', valor: (c: CanalVenta) => c.nombre },
        { etiqueta: 'Tipo', valor: (c: CanalVenta) => etiquetaTipoCanal[c.tipo] },
        { etiqueta: 'Comisión %', valor: (c: CanalVenta) => c.comisionPorcentaje },
        { etiqueta: 'Activo', valor: (c: CanalVenta) => c.activo },
      ]"
      archivo="canales-de-venta"
    >
      <template #col-nombre="{ fila }">
        <span class="font-medium text-tinta">{{ fila.nombre }}</span>
      </template>

      <template #col-tipo="{ fila }">
        <KmBadge :tono="fila.tipo === 'plataforma' ? 'laton' : 'neutro'">
          {{ etiquetaTipoCanal[fila.tipo] }}
        </KmBadge>
      </template>

      <template #col-comisionPorcentaje="{ fila }">
        <span class="tabular-nums" :class="fila.comisionPorcentaje ? 'text-tinta' : 'text-tenue'">
          {{ fila.comisionPorcentaje ? `${fila.comisionPorcentaje} %` : '—' }}
        </span>
      </template>

      <template #formulario="{ borrador, errores }">
        <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
          <KmInput
            :id="id"
            v-model="borrador.nombre"
            placeholder="Ej. Rappi"
            :invalido="invalido"
          />
        </KmField>
        <KmField v-slot="{ id }" label="Tipo">
          <KmSelect :id="id" v-model="borrador.tipo" :opciones="opcionesTipoCanal" />
        </KmField>
        <KmField
          v-slot="{ id, invalido }"
          label="Comisión del canal (%)"
          ayuda="Porcentaje que retiene la plataforma sobre cada venta."
          :error="errores.comisionPorcentaje"
        >
          <KmInput
            :id="id"
            v-model="borrador.comisionPorcentaje"
            type="number"
            min="0"
            max="100"
            :invalido="invalido"
          />
        </KmField>
      </template>
    </KmCatalogo>
  </div>
</template>
