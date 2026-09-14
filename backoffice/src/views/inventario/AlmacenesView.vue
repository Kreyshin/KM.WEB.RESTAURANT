<script setup lang="ts">
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { almacenesService } from '@/services/inventario.service'
import type { Almacen } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

/** Almacenes: vienen del ERP y aquí solo se consultan (D-005). */

const { nombreLocal, insumos } = useCatalogos(['locales', 'insumos'])

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Almacén', ordenable: true },
  { clave: 'localId', etiqueta: 'Local', clase: 'w-40', ordenable: true },
  { clave: 'insumos', etiqueta: 'Insumos con stock', clase: 'w-40 text-right' },
]

const vacio = (): Omit<Almacen, 'id'> => ({ nombre: '', localId: '', activo: true })

const conStock = (id: string) =>
  insumos.value.filter((i) => i.existencias.some((x) => x.almacenId === id && x.cantidad > 0))
    .length
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCatalogo
      titulo="Almacenes"
      subtitulo="Lugares donde se guarda la mercadería de cada local: cámara de frío, secos, barra."
      entidad="almacén"
      solo-lectura
      :servicio="almacenesService"
      :columnas="columnas"
      :nuevo="vacio"
      :nombre-de="(a: Almacen) => a.nombre"
      :exportacion="[
        { etiqueta: 'Almacén', valor: (a: Almacen) => a.nombre },
        { etiqueta: 'Local', valor: (a: Almacen) => nombreLocal(a.localId) },
        { etiqueta: 'Descripción', valor: (a: Almacen) => a.descripcion },
        { etiqueta: 'Activo', valor: (a: Almacen) => a.activo },
      ]"
      archivo="almacenes"
    >
      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p v-if="fila.descripcion" class="text-xs text-tenue">{{ fila.descripcion }}</p>
      </template>
      <template #col-localId="{ fila }">{{ nombreLocal(fila.localId) }}</template>
      <template #col-insumos="{ fila }">
        <span class="tabular-nums">{{ conStock(fila.id) }}</span>
      </template>

      <template #formulario="{ borrador }">
        <KmField v-slot="{ id }" label="Nombre">
          <KmInput :id="id" :model-value="borrador.nombre" />
        </KmField>
        <KmField v-slot="{ id }" label="Local">
          <KmInput :id="id" :model-value="nombreLocal(borrador.localId)" />
        </KmField>
        <KmField v-slot="{ id }" label="Descripción">
          <KmInput :id="id" :model-value="borrador.descripcion ?? ''" />
        </KmField>
      </template>
    </KmCatalogo>
  </div>
</template>
