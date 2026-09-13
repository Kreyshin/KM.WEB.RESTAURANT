<script setup lang="ts">
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import { computed, ref } from 'vue'
import GuiaEjemplo from './GuiaEjemplo.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import KmPaginacion from '@/components/ui/KmPaginacion.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useListado } from '@/composables/useListado'
import { aplicarConsulta } from '@/services/mock/consulta'
import { simularRed } from '@/services/mock/red'
import type { ApiError, Consulta } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { exportarCsv, exportarExcel, type ColumnaExportable } from '@/utils/exportar'
import { formatearSoles } from '@/utils/formato'
import { useUiStore } from '@/stores/ui.store'

interface Plato {
  id: string
  nombre: string
  categoria: string
  precio: number
  disponible: boolean
}

/** Datos locales de la demo: no tocan la base mock del resto de la app. */
const platos: Plato[] = [
  ['Ceviche clásico', 'Fríos', 38],
  ['Tiradito de lenguado', 'Fríos', 42],
  ['Causa limeña', 'Fríos', 24],
  ['Leche de tigre', 'Fríos', 22],
  ['Lomo saltado', 'Fondos', 48],
  ['Ají de gallina', 'Fondos', 36],
  ['Arroz con mariscos', 'Fondos', 45],
  ['Seco de cabrito', 'Fondos', 52],
  ['Tacu tacu con lomo', 'Fondos', 49],
  ['Anticuchos', 'Entradas', 28],
  ['Papa a la huancaína', 'Entradas', 18],
  ['Choclo con queso', 'Entradas', 16],
  ['Suspiro limeño', 'Postres', 16],
  ['Picarones', 'Postres', 18],
  ['Chicha morada', 'Bebidas', 9],
  ['Pisco sour', 'Bebidas', 24],
  ['Inca Kola 500 ml', 'Bebidas', 7],
].map(([nombre, categoria, precio], i) => ({
  id: `demo-${i}`,
  nombre: nombre as string,
  categoria: categoria as string,
  precio: precio as number,
  disponible: i % 5 !== 3,
}))

const ui = useUiStore()

/** Conmutadores para ver cada estado de la tabla a voluntad. */
const forzarError = ref(false)
const forzarVacio = ref(false)
const latencia = ref(350)

function cargador(consulta: Consulta) {
  if (forzarError.value) {
    return new Promise<never>((_, reject) =>
      setTimeout(() => reject({ mensaje: 'Error de red simulado.' } as ApiError), latencia.value),
    )
  }
  const base = forzarVacio.value ? [] : platos
  return simularRed(aplicarConsulta(base, consulta, ['nombre', 'categoria']), latencia.value)
}

const { consulta, items, total, cargando, error, recargar } = useListado(cargador, {
  porPagina: 5,
})

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Plato', ordenable: true },
  { clave: 'categoria', etiqueta: 'Categoría', clase: 'w-36', ordenable: true },
  { clave: 'precio', etiqueta: 'Precio', clase: 'w-28 text-right', ordenable: true },
  { clave: 'disponible', etiqueta: 'Estado', clase: 'w-32', ordenable: true },
]

const opcionesCategoria: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todas las categorías' },
  ...['Entradas', 'Fríos', 'Fondos', 'Postres', 'Bebidas'].map((c) => ({ valor: c, etiqueta: c })),
]

const categoria = computed({
  get: () => (consulta.filtros?.categoria as string | undefined) ?? '',
  set: (v: string | number | undefined) => {
    consulta.filtros = { ...consulta.filtros, categoria: v || undefined }
  },
})

const columnasExport: ColumnaExportable<Plato>[] = [
  { etiqueta: 'Plato', valor: (p) => p.nombre },
  { etiqueta: 'Categoría', valor: (p) => p.categoria },
  { etiqueta: 'Precio', valor: (p) => p.precio },
  { etiqueta: 'Disponible', valor: (p) => p.disponible },
]

function exportar(formato: 'csv' | 'excel') {
  const { items: todo } = aplicarConsulta(platos, { ...consulta, pagina: 1, porPagina: 1000 }, [
    'nombre',
    'categoria',
  ])
  if (formato === 'csv') exportarCsv('platos-demo', todo, columnasExport)
  else exportarExcel('platos-demo', todo, columnasExport)
  ui.exito(`Exportados ${todo.length} platos.`)
}

const codigo = `<script setup lang="ts">
const { consulta, items, total, cargando, error, recargar } =
  useListado((c) => productosService.consultar(c), { porPagina: 10 })

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Plato', ordenable: true },
  { clave: 'precio', etiqueta: 'Precio', clase: 'text-right', ordenable: true },
]
<\/script>

<template>
  <KmBusqueda v-model="consulta.buscar" placeholder="Buscar plato" />

  <KmTable
    v-model:orden="consulta.orden"
    :columnas="columnas"
    :filas="items"
    :cargando="cargando"
    :error="error"
    mensaje-vacio="Aún no hay platos."
    @reintentar="recargar"
  >
    <template #col-precio="{ fila }">{{ formatearSoles(fila.precio) }}</template>
  </KmTable>

  <KmPaginacion
    v-model:pagina="consulta.pagina"
    v-model:por-pagina="consulta.porPagina"
    :total="total"
  />
</template>`

const props = [
  {
    nombre: 'columnas',
    tipo: 'ColumnaTabla[]',
    descripcion: 'clave, etiqueta, clase y ordenable.',
  },
  { nombre: 'filas', tipo: 'T[]', descripcion: 'Registros de la página actual; cada uno con id.' },
  {
    nombre: 'cargando',
    tipo: 'boolean',
    descripcion: 'Esqueleto sin datos; atenúa filas al recargar.',
  },
  {
    nombre: 'error',
    tipo: 'string | null',
    descripcion: 'Sustituye el cuerpo por un estado de error.',
  },
  { nombre: 'mensajeVacio', tipo: 'string', descripcion: 'Texto del estado vacío.' },
  {
    nombre: 'v-model:orden',
    tipo: 'Orden | undefined',
    descripcion: 'Ciclo asc → desc → sin orden.',
  },
  {
    nombre: '@reintentar',
    tipo: '() => void',
    descripcion: 'Clic en «Reintentar» del estado de error.',
  },
  {
    nombre: '#col-<clave>',
    tipo: 'slot { fila }',
    descripcion: 'Celda personalizada por columna.',
  },
  { nombre: '#vacio', tipo: 'slot', descripcion: 'Reemplaza el estado vacío por defecto.' },
]
</script>

<template>
  <GuiaEjemplo
    titulo="KmTable + KmPaginacion + useListado"
    descripcion="Tabla completa: búsqueda con espera, filtro, orden por columna, paginación, exportación y estados de carga, vacío y error. Usa los conmutadores para forzar cada estado."
    :codigo="codigo"
    :props="props"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-tenue">
        <KmCheckbox v-model="forzarError" tamano="sm" @update:model-value="recargar"
          >Forzar error</KmCheckbox
        >
        <KmCheckbox v-model="forzarVacio" tamano="sm" @update:model-value="recargar"
          >Sin datos</KmCheckbox
        >
        <label class="flex items-center gap-2">
          Latencia
          <input
            v-model.number="latencia"
            type="range"
            min="0"
            max="2000"
            step="50"
            class="accent-[var(--rs-laton-500)]"
          />
          <span class="w-14 tabular-nums">{{ latencia }} ms</span>
        </label>
      </div>

      <div class="overflow-hidden rounded-card border border-linea bg-panel">
        <div class="flex flex-wrap items-center gap-3 border-b border-linea px-4 py-3">
          <KmBusqueda v-model="consulta.buscar" placeholder="Buscar plato" />
          <div class="w-full sm:w-52">
            <KmSelect
              v-model="categoria"
              :opciones="opcionesCategoria"
              etiqueta="Filtrar por categoría"
            />
          </div>
          <div class="flex-1" />
          <KmExportar :disabled="total === 0" @exportar="exportar" />
        </div>

        <KmTable
          v-model:orden="consulta.orden"
          :columnas="columnas"
          :filas="items"
          :cargando="cargando"
          :error="error"
          :mensaje-vacio="
            consulta.buscar
              ? 'Ningún plato coincide con la búsqueda.'
              : 'Aún no hay platos en la carta.'
          "
          @reintentar="recargar"
        >
          <template #col-nombre="{ fila }">
            <span class="font-medium text-tinta">{{ fila.nombre }}</span>
          </template>
          <template #col-precio="{ fila }">
            <span class="tabular-nums">{{ formatearSoles(fila.precio) }}</span>
          </template>
          <template #col-disponible="{ fila }">
            <KmBadge :tono="fila.disponible ? 'verde' : 'vino'" punto>
              {{ fila.disponible ? 'Disponible' : 'Agotado' }}
            </KmBadge>
          </template>
        </KmTable>

        <KmPaginacion
          v-if="!error"
          v-model:pagina="consulta.pagina"
          v-model:por-pagina="consulta.porPagina"
          :total="total"
          :opciones-por-pagina="[5, 10, 20]"
        />
      </div>
    </div>
  </GuiaEjemplo>
</template>
