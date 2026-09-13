<script setup lang="ts">
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { almacenesService } from '@/services/inventario.service'
import type { Almacen, NuevoAlmacen } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

const { opcionesLocal, nombreLocal, insumos, recargar } = useCatalogos(['locales', 'insumos'])

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Almacén', ordenable: true },
  { clave: 'localId', etiqueta: 'Local', clase: 'w-40', ordenable: true },
  { clave: 'insumos', etiqueta: 'Insumos con stock', clase: 'w-40 text-right' },
]

const nuevo = (): NuevoAlmacen => ({
  nombre: '',
  localId: (opcionesLocal.value[0]?.valor as string) ?? '',
  descripcion: '',
  activo: true,
})

function validar(a: NuevoAlmacen): Record<string, string> {
  const e: Record<string, string> = {}
  if (!a.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (!a.localId) e.localId = 'Elige un local.'
  return e
}

const conStock = (id: string) =>
  insumos.value.filter((i) => i.existencias.some((x) => x.almacenId === id && x.cantidad > 0))
    .length

async function consecuencias(id: string, activar: boolean) {
  if (activar) return ['Vuelve a poder recibir compras, traslados y tomas de inventario.']
  return [
    'No recibirá compras ni traslados.',
    `Tiene ${conStock(id)} insumos con stock: si hay alguno, habrá que trasladarlo antes.`,
  ]
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCatalogo
      titulo="Almacenes"
      subtitulo="Lugares donde se guarda la mercadería de cada local: cámara de frío, secos, barra."
      entidad="almacén"
      :servicio="almacenesService"
      :consecuencias-estado="consecuencias"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(a: Almacen) => a.nombre"
      :exportacion="[
        { etiqueta: 'Almacén', valor: (a: Almacen) => a.nombre },
        { etiqueta: 'Local', valor: (a: Almacen) => nombreLocal(a.localId) },
        { etiqueta: 'Descripción', valor: (a: Almacen) => a.descripcion },
        { etiqueta: 'Activo', valor: (a: Almacen) => a.activo },
      ]"
      archivo="almacenes"
      @cambio="recargar"
    >
      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p v-if="fila.descripcion" class="text-xs text-tenue">{{ fila.descripcion }}</p>
      </template>
      <template #col-localId="{ fila }">{{ nombreLocal(fila.localId) }}</template>
      <template #col-insumos="{ fila }">
        <span class="tabular-nums">{{ conStock(fila.id) }}</span>
      </template>

      <template #formulario="{ borrador, errores }">
        <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
          <KmInput
            :id="id"
            v-model="borrador.nombre"
            placeholder="Ej. Cámara de frío"
            :invalido="invalido"
          />
        </KmField>
        <KmField v-slot="{ id, invalido }" label="Local" requerido :error="errores.localId">
          <KmSelect
            :id="id"
            v-model="borrador.localId"
            :opciones="opcionesLocal"
            :invalido="invalido"
          />
        </KmField>
        <KmField v-slot="{ id }" label="Descripción" ayuda="Qué se guarda aquí.">
          <KmInput :id="id" v-model="borrador.descripcion" />
        </KmField>
      </template>
    </KmCatalogo>
  </div>
</template>
