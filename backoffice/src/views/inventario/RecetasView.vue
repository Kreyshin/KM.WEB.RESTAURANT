<script setup lang="ts">
import { copiar } from '@/utils/copiar'
import { computed, onMounted, ref, shallowRef } from 'vue'
import EditorIngredientes from './EditorIngredientes.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { cartaService } from '@/services/carta.service'
import { inventarioService } from '@/services/inventario.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, IngredienteReceta, Insumo, Producto, Receta } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { exportarCsv, exportarExcel } from '@/utils/exportar'
import { formatearSoles } from '@/utils/formato'

const ui = useUiStore()

/**
 * Referencia de food cost en restaurantes: por debajo del 30 % es sano,
 * entre 30 y 35 % conviene vigilarlo y por encima el plato pierde margen.
 */
const FOOD_COST_OBJETIVO = 30
const FOOD_COST_ALERTA = 35

const productos = shallowRef<Producto[]>([])
const recetas = shallowRef<Receta[]>([])
const insumos = shallowRef<Insumo[]>([])
const cargando = ref(true)
const busqueda = ref('')
const filtro = ref<'' | 'sin' | 'alto'>('')

async function cargar() {
  cargando.value = true
  try {
    ;[productos.value, recetas.value, insumos.value] = await Promise.all([
      cartaService.listarProductos(),
      inventarioService.listarRecetas(),
      inventarioService.listarInsumos(),
    ])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar las recetas.')
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const insumoPor = (id: string) => insumos.value.find((i) => i.id === id)
const costo = (ingredientes: IngredienteReceta[]) =>
  ingredientes.reduce((t, g) => t + (insumoPor(g.insumoId)?.costoUnitario ?? 0) * g.cantidad, 0)

interface FilaPlato {
  id: string
  producto: Producto
  receta?: Receta
  costo: number
  margen: number
  foodCost: number | null
}

const filas = computed<FilaPlato[]>(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return productos.value
    .map((p) => {
      const receta = recetas.value.find((r) => r.productoId === p.id)
      const c = receta ? costo(receta.ingredientes) : 0
      return {
        id: p.id,
        producto: p,
        receta,
        costo: c,
        margen: p.precio - c,
        foodCost: receta && p.precio > 0 ? (c / p.precio) * 100 : null,
      }
    })
    .filter((f) => !texto || f.producto.nombre.toLowerCase().includes(texto))
    .filter((f) =>
      filtro.value === 'sin'
        ? !f.receta
        : filtro.value === 'alto'
          ? (f.foodCost ?? 0) > FOOD_COST_ALERTA
          : true,
    )
})

const resumen = computed(() => {
  const conReceta = filas.value.filter((f) => f.foodCost !== null)
  const promedio = conReceta.length
    ? conReceta.reduce((t, f) => t + f.foodCost!, 0) / conReceta.length
    : 0
  return {
    conReceta: productos.value.filter((p) => recetas.value.some((r) => r.productoId === p.id))
      .length,
    total: productos.value.length,
    promedio,
    altos: conReceta.filter((f) => f.foodCost! > FOOD_COST_ALERTA).length,
  }
})

const columnas: ColumnaTabla[] = [
  { clave: 'producto', etiqueta: 'Plato' },
  { clave: 'precio', etiqueta: 'Precio', clase: 'w-28 text-right' },
  { clave: 'costo', etiqueta: 'Costo', clase: 'w-28 text-right' },
  { clave: 'margen', etiqueta: 'Margen', clase: 'w-28 text-right' },
  { clave: 'foodCost', etiqueta: 'Food cost', clase: 'w-36 text-right' },
  { clave: 'acciones', etiqueta: '', clase: 'w-16 text-right' },
]

function tonoFoodCost(v: number | null) {
  if (v === null) return 'neutro'
  if (v <= FOOD_COST_OBJETIVO) return 'verde'
  if (v <= FOOD_COST_ALERTA) return 'laton'
  return 'vino'
}

// ── Editor de receta ──
const editorAbierto = ref(false)
const editando = shallowRef<Producto | null>(null)
const borrador = ref<IngredienteReceta[]>([])
const guardando = ref(false)

function editar(f: FilaPlato) {
  editando.value = f.producto
  borrador.value = copiar(f.receta?.ingredientes ?? [])
  if (borrador.value.length === 0) borrador.value.push({ insumoId: '', cantidad: 0 })
  editorAbierto.value = true
}

const costoBorrador = computed(() => costo(borrador.value.filter((g) => g.insumoId)))

async function guardarReceta() {
  if (!editando.value) return
  guardando.value = true
  try {
    await inventarioService.guardarReceta({
      productoId: editando.value.id,
      ingredientes: borrador.value,
    })
    ui.exito(`Receta de ${editando.value.nombre} guardada.`)
    editorAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar la receta.')
  } finally {
    guardando.value = false
  }
}

function exportar(formato: 'csv' | 'excel') {
  const columnasExport = [
    { etiqueta: 'Plato', valor: (f: FilaPlato) => f.producto.nombre },
    { etiqueta: 'Precio', valor: (f: FilaPlato) => f.producto.precio },
    { etiqueta: 'Costo', valor: (f: FilaPlato) => Math.round(f.costo * 100) / 100 },
    { etiqueta: 'Margen', valor: (f: FilaPlato) => Math.round(f.margen * 100) / 100 },
    {
      etiqueta: 'Food cost %',
      valor: (f: FilaPlato) => (f.foodCost === null ? null : Math.round(f.foodCost * 10) / 10),
    },
  ]
  if (formato === 'csv') exportarCsv('costo-platos', filas.value, columnasExport)
  else exportarExcel('costo-platos', filas.value, columnasExport)
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Platos con receta</p>
        <p class="rs-cifra mt-2 text-tinta">
          {{ resumen.conReceta }}<span class="text-lg text-tenue"> / {{ resumen.total }}</span>
        </p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Food cost promedio</p>
        <p
          class="rs-cifra mt-2"
          :class="resumen.promedio > FOOD_COST_ALERTA ? 'text-vino' : 'text-tinta'"
        >
          {{ resumen.promedio.toFixed(1) }} %
        </p>
        <p class="mt-1 text-xs text-tenue">Objetivo: hasta {{ FOOD_COST_OBJETIVO }} %</p>
      </div>
      <div class="rounded-card border border-linea bg-panel px-5 py-4">
        <p class="rs-etiqueta text-tenue">Platos sobre {{ FOOD_COST_ALERTA }} %</p>
        <p class="rs-cifra mt-2" :class="resumen.altos ? 'text-vino' : 'text-tinta'">
          {{ resumen.altos }}
        </p>
      </div>
    </div>

    <KmCard
      titulo="Recetas y costos"
      subtitulo="Qué consume cada plato, cuánto cuesta prepararlo y cuánto deja."
    >
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <KmBusqueda v-model="busqueda" placeholder="Buscar plato" />
        <div class="w-full sm:w-48">
          <KmSelect
            v-model="filtro"
            :opciones="[
              { valor: '', etiqueta: 'Todos los platos' },
              { valor: 'sin', etiqueta: 'Sin receta' },
              { valor: 'alto', etiqueta: `Food cost > ${FOOD_COST_ALERTA} %` },
            ]"
            etiqueta="Filtrar platos"
          />
        </div>
        <div class="flex-1" />
        <KmExportar :disabled="filas.length === 0" @exportar="exportar" />
      </div>

      <div class="overflow-hidden rounded-card border border-linea">
        <KmTable
          :columnas="columnas"
          :filas="filas"
          :cargando="cargando"
          mensaje-vacio="Ningún plato coincide."
        >
          <template #col-producto="{ fila }">
            <p class="font-medium text-tinta">{{ fila.producto.nombre }}</p>
            <p class="text-xs text-tenue">
              {{ fila.receta ? `${fila.receta.ingredientes.length} ingredientes` : 'Sin receta' }}
            </p>
          </template>
          <template #col-precio="{ fila }">
            <span class="tabular-nums">{{ formatearSoles(fila.producto.precio) }}</span>
          </template>
          <template #col-costo="{ fila }">
            <span class="tabular-nums" :class="fila.receta ? 'text-tinta' : 'text-tenue'">
              {{ fila.receta ? formatearSoles(fila.costo) : '—' }}
            </span>
          </template>
          <template #col-margen="{ fila }">
            <span class="font-medium tabular-nums">{{
              fila.receta ? formatearSoles(fila.margen) : '—'
            }}</span>
          </template>
          <template #col-foodCost="{ fila }">
            <KmBadge v-if="fila.foodCost !== null" :tono="tonoFoodCost(fila.foodCost)" punto>
              {{ fila.foodCost.toFixed(1) }} %
            </KmBadge>
            <span v-else class="text-tenue">—</span>
          </template>
          <template #col-acciones="{ fila }">
            <div class="flex justify-end">
              <KmBotonIcono
                icono="editar"
                etiqueta="Editar receta"
                :contexto="fila.producto.nombre"
                @click="editar(fila)"
              />
            </div>
          </template>
        </KmTable>
      </div>
    </KmCard>

    <KmDrawer
      v-model="editorAbierto"
      :titulo="editando ? `Receta · ${editando.nombre}` : 'Receta'"
      subtitulo="Cantidades por porción servida, en la unidad de cada insumo."
      ancho="lg"
    >
      <div v-if="editando" class="flex flex-col gap-5">
        <EditorIngredientes v-model="borrador" :insumos="insumos" />
        <dl
          class="grid grid-cols-3 gap-3 rounded-card border border-dashed border-linea p-4 text-sm"
        >
          <div>
            <dt class="rs-etiqueta text-tenue">Precio</dt>
            <dd class="mt-1 tabular-nums">{{ formatearSoles(editando.precio) }}</dd>
          </div>
          <div>
            <dt class="rs-etiqueta text-tenue">Margen</dt>
            <dd class="mt-1 font-semibold tabular-nums">
              {{ formatearSoles(editando.precio - costoBorrador) }}
            </dd>
          </div>
          <div>
            <dt class="rs-etiqueta text-tenue">Food cost</dt>
            <dd class="mt-1">
              <KmBadge
                :tono="
                  tonoFoodCost(editando.precio ? (costoBorrador / editando.precio) * 100 : null)
                "
                punto
              >
                {{ editando.precio ? ((costoBorrador / editando.precio) * 100).toFixed(1) : '—' }} %
              </KmBadge>
            </dd>
          </div>
        </dl>
        <p class="text-xs text-tenue">
          Los precios de la carta incluyen IGV; el food cost se calcula sobre el precio de venta,
          como es habitual en la gestión de cocina.
        </p>
      </div>
      <template #footer>
        <KmButton variante="secundario" :disabled="guardando" @click="editorAbierto = false"
          >Cancelar</KmButton
        >
        <KmButton :cargando="guardando" @click="guardarReceta">Guardar receta</KmButton>
      </template>
    </KmDrawer>
  </div>
</template>
