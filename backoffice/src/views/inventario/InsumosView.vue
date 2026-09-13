<script setup lang="ts">
import { computed, ref } from 'vue'
import EditorUnidadOperativa from './EditorUnidadOperativa.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo, { type ServicioCatalogo } from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { estadoStock, inventarioService } from '@/services/inventario.service'
import type { CategoriaInsumo, Consulta, Insumo } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import {
  etiquetaCategoriaInsumo,
  etiquetaUnidad,
  formatearCantidad,
  formatearSoles,
  unidadesMedida,
} from '@/utils/formato'

const catalogos = useCatalogos(['almacenes', 'proveedores', 'insumos', 'locales'])
const { opcionesProveedor, nombreProveedor } = catalogos

/** Adaptador: la ficha no toca el stock; el alta carga el stock inicial como entrada. */
const servicio: ServicioCatalogo<Insumo> = {
  consultar: (c) => inventarioService.consultarInsumos(c),
  crear: ({ stock, existencias: _e, ...d }) =>
    inventarioService.crearInsumo({ ...d, stockInicial: Number(stock) || 0 }, almacenInicial.value),
  actualizar: (id, { stock: _s, existencias: _e, ...d }) =>
    inventarioService.actualizarInsumo(id, d),
  eliminar: (id) => inventarioService.eliminarInsumo(id),
}

const almacenInicial = ref('')

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Insumo', ordenable: true },
  { clave: 'stock', etiqueta: 'Stock', clase: 'w-44 text-right', ordenable: true },
  { clave: 'costoUnitario', etiqueta: 'Costo', clase: 'w-32 text-right', ordenable: true },
  { clave: 'valor', etiqueta: 'Valorizado', clase: 'w-32 text-right' },
]

const tonoEstado = { agotado: 'vino', bajo: 'laton', ok: 'verde' } as const
const textoEstado = { agotado: 'Agotado', bajo: 'Bajo mínimo', ok: 'Normal' } as const

const opcionesUnidad: OpcionSelect[] = unidadesMedida.map((u) => ({
  valor: u,
  etiqueta: `${u} · ${etiquetaUnidad[u]}`,
}))
const opcionesCategoria: OpcionSelect[] = (
  Object.keys(etiquetaCategoriaInsumo) as CategoriaInsumo[]
).map((c) => ({ valor: c, etiqueta: etiquetaCategoriaInsumo[c] }))
const opcionesAlmacenFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los almacenes' },
  ...catalogos.opcionesAlmacen.value,
])

function nuevo(): Omit<Insumo, 'id'> {
  almacenInicial.value = (catalogos.opcionesAlmacen.value[0]?.valor as string) ?? ''
  return {
    nombre: '',
    unidad: 'kg',
    categoria: 'abarrotes',
    stock: 0,
    existencias: [],
    stockMinimo: 0,
    costoUnitario: 0,
    proveedorId: undefined,
    activo: true,
  }
}

function validar(i: Omit<Insumo, 'id'>): Record<string, string> {
  const e: Record<string, string> = {}
  if (!i.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (!(Number(i.stockMinimo) >= 0)) e.stockMinimo = 'No puede ser negativo.'
  if (!(Number(i.costoUnitario) >= 0)) e.costoUnitario = 'No puede ser negativo.'
  i.proveedorId = i.proveedorId || undefined
  for (const campo of ['unidadPedido', 'unidadRecepcion'] as const) {
    const u = i[campo]
    if (!u || !u.nombre.trim()) i[campo] = undefined
    else if (!(u.factor > 0)) e[campo] = 'La equivalencia debe ser mayor que cero.'
    else i[campo] = { nombre: u.nombre.trim(), factor: Number(u.factor) }
  }
  return e
}

function filtrar(consulta: Consulta, campo: string, valor: string | number | undefined) {
  consulta.filtros = { ...consulta.filtros, [campo]: valor || undefined }
}

const alertas = computed(() =>
  catalogos.insumos.value.filter((i) => i.activo && estadoStock(i.stock, i.stockMinimo) !== 'ok'),
)
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5">
    <div
      v-if="alertas.length"
      class="rs-tono rs-tono-laton flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border px-4 py-3 text-sm"
      role="status"
    >
      <strong>{{ alertas.length }} insumos necesitan reposición:</strong>
      <span
        >{{
          alertas
            .slice(0, 5)
            .map((i) => i.nombre)
            .join(', ')
        }}{{ alertas.length > 5 ? '…' : '' }}</span
      >
      <RouterLink :to="{ name: 'compras-ordenes' }" class="ml-auto font-semibold underline">
        Generar órdenes de compra
      </RouterLink>
    </div>

    <KmCatalogo
      titulo="Insumos"
      subtitulo="Materia prima y preparaciones, con su stock por almacén y su costo promedio."
      entidad="insumo"
      :servicio="servicio"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(i: Insumo) => i.nombre"
      :orden="{ campo: 'nombre', direccion: 'asc' }"
      :exportacion="[
        { etiqueta: 'Insumo', valor: (i: Insumo) => i.nombre },
        { etiqueta: 'Categoría', valor: (i: Insumo) => etiquetaCategoriaInsumo[i.categoria] },
        { etiqueta: 'Unidad', valor: (i: Insumo) => i.unidad },
        { etiqueta: 'Stock', valor: (i: Insumo) => i.stock },
        { etiqueta: 'Mínimo', valor: (i: Insumo) => i.stockMinimo },
        { etiqueta: 'Costo unitario', valor: (i: Insumo) => i.costoUnitario },
        {
          etiqueta: 'Valorizado',
          valor: (i: Insumo) => Math.round(i.stock * i.costoUnitario * 100) / 100,
        },
        { etiqueta: 'Proveedor', valor: (i: Insumo) => nombreProveedor(i.proveedorId) },
      ]"
      archivo="insumos"
      @cambio="catalogos.recargar"
    >
      <template #filtros="{ consulta }">
        <div class="w-full sm:w-48">
          <KmSelect
            :model-value="(consulta.filtros?.almacenId as string) ?? ''"
            :opciones="opcionesAlmacenFiltro"
            etiqueta="Filtrar por almacén"
            @update:model-value="filtrar(consulta, 'almacenId', $event)"
          />
        </div>
        <div class="w-full sm:w-44">
          <KmSelect
            :model-value="(consulta.filtros?.estadoStock as string) ?? ''"
            :opciones="[
              { valor: '', etiqueta: 'Todo el stock' },
              { valor: 'bajo', etiqueta: 'Bajo mínimo' },
              { valor: 'agotado', etiqueta: 'Agotado' },
              { valor: 'ok', etiqueta: 'Normal' },
            ]"
            etiqueta="Filtrar por nivel de stock"
            @update:model-value="filtrar(consulta, 'estadoStock', $event)"
          />
        </div>
      </template>

      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p class="text-xs text-tenue">
          {{ etiquetaCategoriaInsumo[fila.categoria] }}
          <template v-if="fila.proveedorId"> · {{ nombreProveedor(fila.proveedorId) }}</template>
        </p>
      </template>
      <template #col-stock="{ fila }">
        <p class="font-semibold text-tinta tabular-nums">
          {{ formatearCantidad(fila.stock, fila.unidad) }}
        </p>
        <div class="mt-1 flex justify-end">
          <KmBadge :tono="tonoEstado[estadoStock(fila.stock, fila.stockMinimo)]" punto>
            {{ textoEstado[estadoStock(fila.stock, fila.stockMinimo)] }}
          </KmBadge>
        </div>
      </template>
      <template #col-costoUnitario="{ fila }">
        <span class="tabular-nums">{{ formatearSoles(fila.costoUnitario) }}</span>
      </template>
      <template #col-valor="{ fila }">
        <span class="text-tenue tabular-nums">{{
          formatearSoles(fila.stock * fila.costoUnitario)
        }}</span>
      </template>

      <template #formulario="{ borrador, errores, editando }">
        <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
          <KmInput
            :id="id"
            v-model="borrador.nombre"
            placeholder="Ej. Limón sutil"
            :invalido="invalido"
          />
        </KmField>
        <div class="grid grid-cols-2 gap-4">
          <KmField v-slot="{ id }" label="Categoría">
            <KmSelect :id="id" v-model="borrador.categoria" :opciones="opcionesCategoria" />
          </KmField>
          <KmField
            v-slot="{ id }"
            label="Unidad"
            :ayuda="editando ? 'Cambiarla no convierte el stock.' : undefined"
          >
            <KmSelect :id="id" v-model="borrador.unidad" :opciones="opcionesUnidad" />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Stock mínimo"
            :error="errores.stockMinimo"
            ayuda="Por debajo se avisa."
          >
            <KmNumero
              :id="id"
              v-model="borrador.stockMinimo"
              :min="0"
              :decimales="3"
              :sufijo="etiquetaUnidad[borrador.unidad]"
              :invalido="invalido"
            />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Costo unitario"
            :error="errores.costoUnitario"
            :ayuda="borrador.preparacion ? 'Se calcula con su receta.' : 'Sin IGV.'"
          >
            <KmNumero
              :id="id"
              v-model="borrador.costoUnitario"
              :min="0"
              :decimales="2"
              prefijo="S/"
              :disabled="!!borrador.preparacion"
              :invalido="invalido"
            />
          </KmField>
        </div>
        <KmField v-slot="{ id }" label="Proveedor habitual">
          <KmSelect
            :id="id"
            :model-value="borrador.proveedorId ?? ''"
            :opciones="[{ valor: '', etiqueta: 'Sin proveedor' }, ...opcionesProveedor]"
            @update:model-value="borrador.proveedorId = ($event as string) || undefined"
          />
        </KmField>

        <section class="flex flex-col gap-3 rounded-card border border-linea p-4">
          <div>
            <p class="text-sm font-semibold text-tinta">Unidades de operación</p>
            <p class="text-xs text-tenue">
              Cómo se pide y cómo se recepciona. El stock se lleva en «{{
                etiquetaUnidad[borrador.unidad]
              }}». Con el ERP conectado, estas equivalencias llegarán desde allí.
            </p>
          </div>
          <EditorUnidadOperativa
            v-model="borrador.unidadPedido"
            etiqueta="Unidad para pedir"
            :unidad-base="etiquetaUnidad[borrador.unidad]"
            :error="errores.unidadPedido"
          />
          <EditorUnidadOperativa
            v-model="borrador.unidadRecepcion"
            etiqueta="Unidad para recepcionar"
            :unidad-base="etiquetaUnidad[borrador.unidad]"
            :error="errores.unidadRecepcion"
          />
        </section>

        <div
          v-if="!editando"
          class="grid grid-cols-2 gap-4 rounded-card border border-dashed border-linea p-4"
        >
          <KmField v-slot="{ id }" label="Stock inicial" ayuda="Se registra como entrada.">
            <KmNumero
              :id="id"
              v-model="borrador.stock"
              :min="0"
              :decimales="3"
              :sufijo="etiquetaUnidad[borrador.unidad]"
            />
          </KmField>
          <KmField v-slot="{ id }" label="En el almacén">
            <KmSelect
              :id="id"
              v-model="almacenInicial"
              :opciones="catalogos.opcionesAlmacen.value"
            />
          </KmField>
        </div>
        <p v-else class="text-xs text-tenue">
          El stock ({{ formatearCantidad(borrador.stock, borrador.unidad) }}) cambia con compras,
          pedidos internos y mermas, nunca editándolo aquí. Su historial está en Movimientos.
        </p>
      </template>
    </KmCatalogo>
  </div>
</template>
