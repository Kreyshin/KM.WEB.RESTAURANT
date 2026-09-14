<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { articulosService, marcasService } from '@/services/erp.service'
import type { Articulo, Marca } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

/** Marcas de los artículos: maestro del ERP, solo consulta. */

const articulos = shallowRef<Articulo[]>([])
onMounted(async () => (articulos.value = await articulosService.todos()))
const deMarca = (id: string) => articulos.value.filter((a) => a.marcaId === id)

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Marca', ordenable: true },
  { clave: 'articulos', etiqueta: 'Artículos', clase: 'w-32 text-right' },
]
const vacio = (): Omit<Marca, 'id'> => ({ nombre: '', activo: true })
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6">
    <KmCatalogo
      titulo="Marcas"
      subtitulo="Marcas de los artículos que compra el ERP. Sirven para expresar una preferencia al solicitar."
      entidad="marca"
      femenino
      solo-lectura
      :servicio="marcasService"
      :columnas="columnas"
      :nuevo="vacio"
      :nombre-de="(m: Marca) => m.nombre"
      :orden="{ campo: 'nombre', direccion: 'asc' }"
    >
      <template #col-nombre="{ fila }">
        <span class="font-medium text-tinta">{{ fila.nombre }}</span>
      </template>
      <template #col-articulos="{ fila }">
        <span class="tabular-nums">{{ deMarca(fila.id).length }}</span>
      </template>

      <template #formulario="{ borrador }">
        <KmField v-slot="{ id }" label="Marca">
          <KmInput :id="id" :model-value="borrador.nombre" />
        </KmField>
      </template>
    </KmCatalogo>
  </div>
</template>
