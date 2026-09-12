<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmTable from '@/components/ui/KmTable.vue'
import CategoriaFormModal from './CategoriaFormModal.vue'
import ProductoFormModal from './ProductoFormModal.vue'
import { cartaService } from '@/services/carta.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Categoria, NuevaCategoria, NuevoProducto, Producto } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { etiquetaAlergeno, formatearSoles } from '@/utils/formato'

const ui = useUiStore()

const categorias = ref<Categoria[]>([])
const productos = ref<Producto[]>([])
const cargando = ref(true)

const vista = ref<'productos' | 'categorias'>('productos')
/** '' significa «todas las categorías». */
const filtroCategoria = ref<string>('')
const busqueda = ref('')

const modalProducto = ref(false)
const productoEnEdicion = ref<Producto | null>(null)
const formProducto = ref<InstanceType<typeof ProductoFormModal> | null>(null)

const modalCategoria = ref(false)
const categoriaEnEdicion = ref<Categoria | null>(null)
const formCategoria = ref<InstanceType<typeof CategoriaFormModal> | null>(null)

const confirmAbierto = ref(false)
const eliminando = ref(false)
const aEliminar = ref<{ tipo: 'producto' | 'categoria'; id: string; nombre: string } | null>(null)

const columnasProducto: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Producto' },
  { clave: 'categoria', etiqueta: 'Categoría', clase: 'w-44' },
  { clave: 'precio', etiqueta: 'Precio', clase: 'w-36' },
  { clave: 'opciones', etiqueta: 'Opciones', clase: 'w-48' },
  { clave: 'disponible', etiqueta: 'Disponible', clase: 'w-32' },
  { clave: 'acciones', etiqueta: '', clase: 'w-32 text-right' },
]

const columnasCategoria: ColumnaTabla[] = [
  { clave: 'orden', etiqueta: 'Orden', clase: 'w-28' },
  { clave: 'nombre', etiqueta: 'Categoría' },
  { clave: 'productos', etiqueta: 'Productos', clase: 'w-28' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-32' },
  { clave: 'acciones', etiqueta: '', clase: 'w-32 text-right' },
]

const ordenSugerido = computed(() => Math.max(0, ...categorias.value.map((c) => c.orden)) + 1)

const productosFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return productos.value.filter((p) => {
    if (filtroCategoria.value && p.categoriaId !== filtroCategoria.value) return false
    if (texto && !p.nombre.toLowerCase().includes(texto)) return false
    return true
  })
})

const noDisponibles = computed(() => productos.value.filter((p) => !p.disponible).length)

function nombreCategoria(id: string) {
  return categorias.value.find((c) => c.id === id)?.nombre ?? '—'
}

function productosDe(categoriaId: string) {
  return productos.value.filter((p) => p.categoriaId === categoriaId).length
}

/** Rango de precios cuando el producto tiene presentaciones. */
function precioMostrado(p: Producto) {
  const activas = p.variantes.filter((v) => v.activa)
  if (activas.length === 0) return formatearSoles(p.precio)
  const precios = activas.map((v) => v.precio)
  const min = Math.min(...precios)
  const max = Math.max(...precios)
  return min === max ? formatearSoles(min) : `${formatearSoles(min)} – ${formatearSoles(max)}`
}

async function cargar() {
  cargando.value = true
  try {
    ;[categorias.value, productos.value] = await Promise.all([
      cartaService.listarCategorias(),
      cartaService.listarProductos(),
    ])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cargar la carta.')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// ── Productos ───────────────────────────────────────────────────────────────

function nuevoProducto() {
  productoEnEdicion.value = null
  modalProducto.value = true
}

function editarProducto(p: Producto) {
  productoEnEdicion.value = p
  modalProducto.value = true
}

async function guardarProducto(datos: NuevoProducto, id?: string) {
  try {
    if (id) {
      await cartaService.actualizarProducto(id, datos)
      ui.exito('Producto actualizado.')
    } else {
      await cartaService.crearProducto(datos)
      ui.exito('Producto creado.')
    }
    modalProducto.value = false
    await cargar()
  } catch (e) {
    const err = e as ApiError
    ui.error(err.mensaje ?? 'No se pudo guardar el producto.')
    formProducto.value?.mostrarError(err)
  }
}

async function alternarDisponible(p: Producto) {
  const anterior = p.disponible
  p.disponible = !anterior // Optimista: en sala se marca agotado a toda prisa.
  try {
    await cartaService.cambiarDisponibilidad(p.id, p.disponible)
  } catch (e) {
    p.disponible = anterior
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar la disponibilidad.')
  }
}

// ── Categorías ──────────────────────────────────────────────────────────────

function nuevaCategoria() {
  categoriaEnEdicion.value = null
  modalCategoria.value = true
}

function editarCategoria(c: Categoria) {
  categoriaEnEdicion.value = c
  modalCategoria.value = true
}

async function guardarCategoria(datos: NuevaCategoria, id?: string) {
  try {
    if (id) {
      await cartaService.actualizarCategoria(id, datos)
      ui.exito('Categoría actualizada.')
    } else {
      await cartaService.crearCategoria(datos)
      ui.exito('Categoría creada.')
    }
    modalCategoria.value = false
    await cargar()
  } catch (e) {
    const err = e as ApiError
    ui.error(err.mensaje ?? 'No se pudo guardar la categoría.')
    formCategoria.value?.mostrarError(err)
  }
}

async function reordenar(id: string, direccion: 'arriba' | 'abajo') {
  categorias.value = await cartaService.reordenarCategoria(id, direccion)
}

async function alternarActiva(c: Categoria) {
  try {
    await cartaService.actualizarCategoria(c.id, { activa: !c.activa })
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar el estado.')
  }
}

// ── Eliminación ─────────────────────────────────────────────────────────────

function pedirEliminar(tipo: 'producto' | 'categoria', id: string, nombre: string) {
  aEliminar.value = { tipo, id, nombre }
  confirmAbierto.value = true
}

async function eliminar() {
  if (!aEliminar.value) return
  eliminando.value = true
  try {
    if (aEliminar.value.tipo === 'producto') {
      await cartaService.eliminarProducto(aEliminar.value.id)
      ui.exito('Producto eliminado.')
    } else {
      await cartaService.eliminarCategoria(aEliminar.value.id)
      ui.exito('Categoría eliminada.')
    }
    confirmAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5">
    <!-- Cambio de vista y acción principal -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex gap-1 rounded-control border border-linea bg-panel p-1">
        <button
          v-for="v in ['productos', 'categorias'] as const"
          :key="v"
          type="button"
          class="rounded-[5px] px-3.5 py-1.5 text-sm font-medium capitalize transition-colors"
          :class="vista === v ? 'bg-seleccion text-tinta' : 'text-tenue hover:text-tinta'"
          @click="vista = v"
        >
          {{ v === 'productos' ? 'Productos' : 'Categorías' }}
        </button>
      </div>

      <KmBadge v-if="noDisponibles" tono="vino" punto>
        {{ noDisponibles }} sin disponibilidad
      </KmBadge>

      <div class="flex-1"></div>

      <KmButton v-if="vista === 'categorias'" @click="nuevaCategoria">Nueva categoría</KmButton>
      <KmButton v-else :disabled="categorias.length === 0" @click="nuevoProducto">
        Nuevo producto
      </KmButton>
    </div>

    <!-- Productos -->
    <template v-if="vista === 'productos'">
      <div class="flex flex-wrap gap-1 rounded-control border border-linea bg-panel p-1">
        <button
          type="button"
          class="rounded-[5px] px-3.5 py-1.5 text-sm font-medium transition-colors"
          :class="
            filtroCategoria === ''
              ? 'bg-accion text-white'
              : 'text-tenue hover:bg-seleccion hover:text-tinta'
          "
          @click="filtroCategoria = ''"
        >
          Todas
        </button>
        <button
          v-for="c in categorias"
          :key="c.id"
          type="button"
          class="rounded-[5px] px-3.5 py-1.5 text-sm font-medium transition-colors"
          :class="
            filtroCategoria === c.id
              ? 'bg-accion text-white'
              : 'text-tenue hover:bg-seleccion hover:text-tinta'
          "
          @click="filtroCategoria = c.id"
        >
          {{ c.nombre }}
          <span v-if="!c.activa" class="opacity-60">·oculta</span>
        </button>
      </div>

      <KmCard titulo="Productos" sin-padding>
        <template #acciones>
          <KmInput v-model="busqueda" placeholder="Buscar producto…" class="!w-48" />
        </template>

        <KmTable
          :columnas="columnasProducto"
          :filas="productosFiltrados"
          :cargando="cargando"
          mensaje-vacio="No hay productos que coincidan. Crea el primero para empezar la carta."
        >
          <template #col-nombre="{ fila }">
            <p class="font-semibold text-tinta">{{ fila.nombre }}</p>
            <p v-if="fila.descripcion" class="mt-0.5 text-xs text-tenue">{{ fila.descripcion }}</p>
            <div v-if="fila.alergenos.length" class="mt-1.5 flex flex-wrap gap-1">
              <span
                v-for="a in fila.alergenos"
                :key="a"
                class="rs-tono rs-tono-laton rounded-full border px-1.5 py-px text-[10px] font-semibold"
              >
                {{ etiquetaAlergeno[a] }}
              </span>
            </div>
          </template>

          <template #col-categoria="{ fila }">{{ nombreCategoria(fila.categoriaId) }}</template>

          <template #col-precio="{ fila }">
            <span class="font-semibold text-tinta tabular-nums">{{ precioMostrado(fila) }}</span>
            <p v-if="fila.variantes.length" class="text-xs text-tenue">
              {{ fila.variantes.length }} presentaciones
            </p>
          </template>

          <template #col-opciones="{ fila }">
            <span v-if="fila.gruposModificadores.length === 0" class="text-tenue">—</span>
            <ul v-else class="flex flex-col gap-0.5">
              <li v-for="g in fila.gruposModificadores" :key="g.id" class="text-xs text-tenue">
                {{ g.nombre }}
                <span class="opacity-70">· {{ g.modificadores.length }}</span>
              </li>
            </ul>
          </template>

          <template #col-disponible="{ fila }">
            <button type="button" title="Cambiar disponibilidad" @click="alternarDisponible(fila)">
              <KmBadge :tono="fila.disponible ? 'verde' : 'vino'" punto>
                {{ fila.disponible ? 'Sí' : 'Agotado' }}
              </KmBadge>
            </button>
          </template>

          <template #col-acciones="{ fila }">
            <div class="flex justify-end gap-1">
              <KmButton variante="fantasma" tamano="sm" @click="editarProducto(fila)"
                >Editar</KmButton
              >
              <KmButton
                variante="fantasma"
                tamano="sm"
                @click="pedirEliminar('producto', fila.id, fila.nombre)"
              >
                <span class="text-vino">Eliminar</span>
              </KmButton>
            </div>
          </template>
        </KmTable>
      </KmCard>
    </template>

    <!-- Categorías -->
    <KmCard
      v-else
      titulo="Categorías"
      subtitulo="El orden define cómo se agrupan los platos en la carta y en la comanda."
      sin-padding
    >
      <KmTable
        :columnas="columnasCategoria"
        :filas="categorias"
        :cargando="cargando"
        mensaje-vacio="Aún no hay categorías. Crea la primera para poder añadir productos."
      >
        <template #col-orden="{ fila }">
          <div class="flex items-center gap-1">
            <span class="w-5 text-tenue tabular-nums">{{ fila.orden }}</span>
            <button
              type="button"
              class="rounded p-1 text-tenue transition-colors hover:bg-seleccion hover:text-tinta"
              aria-label="Subir"
              @click="reordenar(fila.id, 'arriba')"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 15l-6-6-6 6" />
              </svg>
            </button>
            <button
              type="button"
              class="rounded p-1 text-tenue transition-colors hover:bg-seleccion hover:text-tinta"
              aria-label="Bajar"
              @click="reordenar(fila.id, 'abajo')"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </template>

        <template #col-nombre="{ fila }">
          <p class="font-semibold text-tinta">{{ fila.nombre }}</p>
          <p v-if="fila.descripcion" class="text-xs text-tenue">{{ fila.descripcion }}</p>
        </template>

        <template #col-productos="{ fila }">
          <span class="tabular-nums">{{ productosDe(fila.id) }}</span>
        </template>

        <template #col-estado="{ fila }">
          <button type="button" title="Cambiar estado" @click="alternarActiva(fila)">
            <KmBadge :tono="fila.activa ? 'verde' : 'neutro'" punto>
              {{ fila.activa ? 'Visible' : 'Oculta' }}
            </KmBadge>
          </button>
        </template>

        <template #col-acciones="{ fila }">
          <div class="flex justify-end gap-1">
            <KmButton variante="fantasma" tamano="sm" @click="editarCategoria(fila)"
              >Editar</KmButton
            >
            <KmButton
              variante="fantasma"
              tamano="sm"
              @click="pedirEliminar('categoria', fila.id, fila.nombre)"
            >
              <span class="text-vino">Eliminar</span>
            </KmButton>
          </div>
        </template>
      </KmTable>
    </KmCard>

    <ProductoFormModal
      ref="formProducto"
      v-model="modalProducto"
      :producto="productoEnEdicion"
      :categorias="categorias"
      :categoria-por-defecto="filtroCategoria || undefined"
      @guardado="guardarProducto"
    />

    <CategoriaFormModal
      ref="formCategoria"
      v-model="modalCategoria"
      :categoria="categoriaEnEdicion"
      :orden-sugerido="ordenSugerido"
      @guardado="guardarCategoria"
    />

    <KmConfirm
      v-model="confirmAbierto"
      :titulo="aEliminar?.tipo === 'producto' ? 'Eliminar producto' : 'Eliminar categoría'"
      :mensaje="`¿Eliminar «${aEliminar?.nombre}»? Esta acción no se puede deshacer.`"
      texto-confirmar="Eliminar"
      peligroso
      :cargando="eliminando"
      @confirmar="eliminar"
    />
  </div>
</template>
