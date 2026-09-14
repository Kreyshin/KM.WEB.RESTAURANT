<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { articulosService, marcasService, proveedoresService } from '@/services/erp.service'
import type { Articulo, Consulta, Marca, Proveedor } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

/** Artículos que compra el ERP. En F4.3 se vinculan a los insumos del restaurante. */

const marcas = shallowRef<Marca[]>([])
const proveedores = shallowRef<Proveedor[]>([])
onMounted(async () => {
  ;[marcas.value, proveedores.value] = await Promise.all([
    marcasService.todos(),
    proveedoresService.todos(),
  ])
})

const nombreMarca = (id?: string) => marcas.value.find((m) => m.id === id)?.nombre ?? '—'
const nombreProveedor = (id?: string) =>
  proveedores.value.find((p) => p.id === id)?.razonSocial ?? '—'

const columnas: ColumnaTabla[] = [
  { clave: 'codigo', etiqueta: 'Código', clase: 'w-32', ordenable: true },
  { clave: 'nombre', etiqueta: 'Artículo', ordenable: true },
  { clave: 'unidadCompra', etiqueta: 'Se compra por', clase: 'w-36' },
  { clave: 'proveedorId', etiqueta: 'Proveedor habitual', clase: 'w-56' },
]

const vacio = (): Omit<Articulo, 'id'> => ({
  codigo: '',
  nombre: '',
  unidadCompra: '',
  activo: true,
})

function filtrar(consulta: Consulta, campo: string, valor: string | number | undefined) {
  consulta.filtros = { ...consulta.filtros, [campo]: valor || undefined }
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
    <KmCatalogo
      titulo="Artículos"
      subtitulo="Lo que el ERP compra, con su marca, cómo se compra y a quién. Se vinculan a los insumos del restaurante."
      entidad="artículo"
      solo-lectura
      :servicio="articulosService"
      :columnas="columnas"
      :nuevo="vacio"
      :nombre-de="(a: Articulo) => a.nombre"
      :orden="{ campo: 'codigo', direccion: 'asc' }"
      :exportacion="[
        { etiqueta: 'Código', valor: (a: Articulo) => a.codigo },
        { etiqueta: 'Artículo', valor: (a: Articulo) => a.nombre },
        { etiqueta: 'Marca', valor: (a: Articulo) => nombreMarca(a.marcaId) },
        { etiqueta: 'Se compra por', valor: (a: Articulo) => a.unidadCompra },
        { etiqueta: 'Proveedor habitual', valor: (a: Articulo) => nombreProveedor(a.proveedorId) },
        { etiqueta: 'Activo', valor: (a: Articulo) => a.activo },
      ]"
      archivo="articulos-erp"
    >
      <template #filtros="{ consulta }">
        <div class="w-full sm:w-44">
          <KmSelect
            :model-value="(consulta.filtros?.marcaId as string) ?? ''"
            :opciones="[
              { valor: '', etiqueta: 'Todas las marcas' },
              ...marcas.map((m) => ({ valor: m.id, etiqueta: m.nombre })),
            ]"
            etiqueta="Filtrar por marca"
            @update:model-value="filtrar(consulta, 'marcaId', $event)"
          />
        </div>
        <div class="w-full sm:w-56">
          <KmSelect
            :model-value="(consulta.filtros?.proveedorId as string) ?? ''"
            :opciones="[
              { valor: '', etiqueta: 'Todos los proveedores' },
              ...proveedores.map((p) => ({ valor: p.id, etiqueta: p.razonSocial })),
            ]"
            etiqueta="Filtrar por proveedor"
            @update:model-value="filtrar(consulta, 'proveedorId', $event)"
          />
        </div>
      </template>

      <template #col-codigo="{ fila }">
        <span class="font-mono text-xs text-tenue">{{ fila.codigo }}</span>
      </template>
      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p class="text-xs text-tenue">{{ nombreMarca(fila.marcaId) }}</p>
      </template>
      <template #col-proveedorId="{ fila }">{{ nombreProveedor(fila.proveedorId) }}</template>

      <template #formulario="{ borrador }">
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Código">
            <KmInput :id="id" :model-value="borrador.codigo" />
          </KmField>
          <KmField v-slot="{ id }" label="Marca">
            <KmInput :id="id" :model-value="nombreMarca(borrador.marcaId)" />
          </KmField>
        </div>
        <KmField v-slot="{ id }" label="Artículo">
          <KmInput :id="id" :model-value="borrador.nombre" />
        </KmField>
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Se compra por">
            <KmInput :id="id" :model-value="borrador.unidadCompra" />
          </KmField>
          <KmField v-slot="{ id }" label="Proveedor habitual">
            <KmInput :id="id" :model-value="nombreProveedor(borrador.proveedorId)" />
          </KmField>
        </div>
      </template>
    </KmCatalogo>
  </div>
</template>
