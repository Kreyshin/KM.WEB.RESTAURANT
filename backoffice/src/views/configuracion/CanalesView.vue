<script setup lang="ts">
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { canalesService } from '@/services/comercial.service'
import { dependenciasService } from '@/services/dependencias.service'
import type { CanalVenta, NuevoCanalVenta } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { ayudaTipoCanal, etiquetaTipoCanal, opcionesTipoCanal } from '@/utils/configuracion'

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Canal', ordenable: true },
  { clave: 'condiciones', etiqueta: 'Condiciones', clase: 'w-56' },
]

const nuevo = (): NuevoCanalVenta => ({
  nombre: '',
  tipo: 'salon',
  comisionPorcentaje: 0,
  aplicaRecargoConsumo: false,
  activo: true,
})

function validar(c: NuevoCanalVenta): Record<string, string> {
  const e: Record<string, string> = {}
  if (!c.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  c.comisionPorcentaje = c.tipo === 'plataforma' ? Number(c.comisionPorcentaje) || 0 : 0
  if (!(c.comisionPorcentaje >= 0 && c.comisionPorcentaje <= 100)) {
    e.comisionPorcentaje = 'Entre 0 % y 100 %.'
  }
  return e
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <KmCatalogo
      titulo="Canales de venta"
      subtitulo="Por dónde entran los pedidos y en qué condiciones: comisión, recargo y precios propios."
      entidad="canal"
      :servicio="canalesService"
      :consecuencias-estado="dependenciasService.canal"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(c: CanalVenta) => c.nombre"
      :exportacion="[
        { etiqueta: 'Canal', valor: (c: CanalVenta) => c.nombre },
        { etiqueta: 'Modalidad', valor: (c: CanalVenta) => etiquetaTipoCanal[c.tipo] },
        { etiqueta: 'Comisión %', valor: (c: CanalVenta) => c.comisionPorcentaje },
        { etiqueta: 'Recargo al consumo', valor: (c: CanalVenta) => c.aplicaRecargoConsumo },
        { etiqueta: 'Activo', valor: (c: CanalVenta) => c.activo },
      ]"
      archivo="canales-de-venta"
    >
      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p class="text-xs text-tenue">{{ etiquetaTipoCanal[fila.tipo] }}</p>
      </template>

      <template #col-condiciones="{ fila }">
        <span class="text-sm text-tenue">
          {{
            [
              fila.tipo === 'plataforma' ? `Comisión ${fila.comisionPorcentaje} %` : '',
              fila.aplicaRecargoConsumo ? 'Con recargo al consumo' : '',
            ]
              .filter(Boolean)
              .join(' · ') || '—'
          }}
        </span>
      </template>

      <template #formulario="{ borrador, errores }">
        <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
          <KmInput
            :id="id"
            v-model="borrador.nombre"
            placeholder="Ej. Rappi, Barra, WhatsApp"
            :invalido="invalido"
          />
        </KmField>

        <KmField
          v-slot="{ id }"
          label="Modalidad de atención"
          :ayuda="`${ayudaTipoCanal[borrador.tipo]} Se aplicará al tomar pedidos (Ventas).`"
        >
          <KmSelect :id="id" v-model="borrador.tipo" :opciones="opcionesTipoCanal" />
        </KmField>

        <KmField
          v-if="borrador.tipo === 'plataforma'"
          v-slot="{ id, invalido }"
          label="Comisión de la app"
          ayuda="Porcentaje que retiene la plataforma sobre cada venta."
          :error="errores.comisionPorcentaje"
        >
          <KmNumero
            :id="id"
            v-model="borrador.comisionPorcentaje"
            :min="0"
            :max="100"
            sufijo="%"
            :decimales="2"
            :step="0.5"
            :invalido="invalido"
          />
        </KmField>

        <KmSwitch
          v-model="borrador.aplicaRecargoConsumo"
          etiqueta="Cobrar recargo al consumo"
          descripcion="Usa el porcentaje configurado en Impuestos y cargos."
        />
      </template>
    </KmCatalogo>
  </div>
</template>
