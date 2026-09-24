<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCambioVista from '@/components/ui/KmCambioVista.vue'
import KmTarjetaPlato from '@/components/ui/KmTarjetaPlato.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmConfirmarEstado from '@/components/ui/KmConfirmarEstado.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useLocales } from '@/composables/useLocales'
import { canalesService } from '@/services/comercial.service'
import { categoriaOfrecida, productoOfrecido } from '@/services/carta.service'
import type { CanalVenta } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import KmTable from '@/components/ui/KmTable.vue'
import CategoriaFormModal from './CategoriaFormModal.vue'
import ProductoFormModal from './ProductoFormModal.vue'
import { useConfirmarEstado } from '@/composables/useConfirmarEstado'
import { cartaService } from '@/services/carta.service'
import { dependenciasService } from '@/services/dependencias.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Categoria, NuevaCategoria, NuevoProducto, Producto } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { etiquetaDia } from '@/utils/configuracion'
import { etiquetaAlergeno, formatearSoles } from '@/utils/formato'

const ui = useUiStore()

const categorias = ref<Categoria[]>([])
const productos = ref<Producto[]>([])
const { cargando, iniciar, terminar } = useCarga()

const vista = ref<'productos' | 'categorias'>('productos')
/** '' significa «todas las categorías». */
const filtroCategoria = ref<string>('')
const busqueda = ref('')
const vistaProductos = ref<'tabla' | 'tarjetas'>('tabla')

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

const { locales, nombreLocal } = useLocales()
const canales = ref<CanalVenta[]>([])
const ofrecidoLocal = ref('')
const ofrecidoCanal = ref('')
const opcionesLocalFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los locales' },
  ...locales.value.map((l) => ({ valor: l.id, etiqueta: l.nombre })),
])
const opcionesCanalFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los canales' },
  ...canales.value.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
])
const nombreCanal = (id: string) => canales.value.find((c) => c.id === id)?.nombre ?? id

/** Secciones primero y sus categorías debajo, cada grupo en su orden. */
const categoriasOrdenadas = computed(() => {
  const porOrden = [...categorias.value].sort((a, b) => a.orden - b.orden)
  return porOrden
    .filter((c) => !c.seccionId)
    .flatMap((c) => [c, ...porOrden.filter((h) => h.seccionId === c.id)])
})

const productosFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  void categorias.value
  return productos.value.filter((p) => {
    if (
      (ofrecidoLocal.value || ofrecidoCanal.value) &&
      !productoOfrecido(p.id, ofrecidoLocal.value || undefined, ofrecidoCanal.value || undefined)
    )
      return false
    if (
      filtroCategoria.value &&
      p.categoriaId !== filtroCategoria.value &&
      categorias.value.find((c) => c.id === p.categoriaId)?.seccionId !== filtroCategoria.value
    )
      return false
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
  iniciar()
  try {
    ;[categorias.value, productos.value, canales.value] = await Promise.all([
      cartaService.listarCategorias(),
      cartaService.listarProductos(),
      canalesService.todos(),
    ])
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cargar la carta.')
  } finally {
    terminar()
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

// ── Categorías ──────────────────────────────────────────────────────────────

function nuevaCategoria() {
  categoriaEnEdicion.value = null
  modalCategoria.value = true
}

function editarCategoria(c: Categoria) {
  categoriaEnEdicion.value = c
  modalCategoria.value = true
}

const estado = useConfirmarEstado()

async function guardarCategoria(
  datos: NuevaCategoria,
  id?: string,
  confirmado = false,
): Promise<void> {
  const original = categoriaEnEdicion.value
  if (id && original && original.activa !== datos.activa && !confirmado) {
    return estado.pedir({
      nombre: datos.nombre,
      activar: datos.activa,
      consecuencias: () => dependenciasService.categoria(id, datos.activa),
      continuar: () => guardarCategoria(datos, id, true),
    })
  }
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
  <div class="flex w-full flex-col gap-5">
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
          <div class="w-44">
            <KmSelect
              v-model="ofrecidoLocal"
              :opciones="opcionesLocalFiltro"
              etiqueta="Qué se ofrece en el local"
            />
          </div>
          <div class="w-44">
            <KmSelect
              v-model="ofrecidoCanal"
              :opciones="opcionesCanalFiltro"
              etiqueta="Qué se ofrece en el canal"
            />
          </div>
          <KmCambioVista v-model="vistaProductos" clave="producto" />
          <KmInput v-model="busqueda" placeholder="Buscar producto…" class="!w-48" />
        </template>

        <div v-if="vistaProductos === 'tarjetas'" class="p-4">
          <div v-if="cargando" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div v-for="i in 8" :key="i" class="h-56 animate-pulse rounded-card bg-seleccion"></div>
          </div>
          <p
            v-else-if="productosFiltrados.length === 0"
            class="py-10 text-center text-sm text-tenue"
          >
            No hay productos que coincidan.
          </p>
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <KmTarjetaPlato
              v-for="p in productosFiltrados"
              :key="p.id"
              :nombre="p.nombre"
              :imagen="p.imagen"
              :precio="precioMostrado(p)"
              :marca="p.tiempoPreparacionMin ? `${p.tiempoPreparacionMin} min` : undefined"
              :detalle="nombreCategoria(p.categoriaId)"
              :cinta="p.disponible ? undefined : 'Agotado'"
              @editar="editarProducto(p)"
              @eliminar="pedirEliminar('producto', p.id, p.nombre)"
            />
          </div>
        </div>

        <KmTable
          v-else
          :columnas="columnasProducto"
          :filas="productosFiltrados"
          :cargando="cargando"
          mensaje-vacio="No hay productos que coincidan. Crea el primero para empezar la carta."
        >
          <template #col-nombre="{ fila }">
            <div class="flex items-start gap-3">
              <img
                v-if="fila.imagen"
                :src="fila.imagen"
                alt=""
                class="size-10 shrink-0 rounded-control object-cover"
              />
              <div class="min-w-0">
                <p class="font-semibold text-tinta">{{ fila.nombre }}</p>
                <p v-if="fila.descripcion" class="mt-0.5 text-xs text-tenue">
                  {{ fila.descripcion }}
                </p>
                <div v-if="fila.alergenos.length" class="mt-1.5 flex flex-wrap gap-1">
                  <span
                    v-for="a in fila.alergenos"
                    :key="a"
                    class="rs-tono rs-tono-laton rounded-full border px-1.5 py-px text-[10px] font-semibold"
                  >
                    {{ etiquetaAlergeno[a] }}
                  </span>
                </div>
              </div>
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
            <KmBadge :tono="fila.disponible ? 'verde' : 'vino'" punto>
              {{ fila.disponible ? 'Disponible' : 'Agotado' }}
            </KmBadge>
          </template>

          <template #col-acciones="{ fila }">
            <div class="flex justify-end gap-0.5">
              <KmBotonIcono
                icono="editar"
                etiqueta="Editar"
                :contexto="fila.nombre"
                @click="editarProducto(fila)"
              />
              <KmBotonIcono
                icono="eliminar"
                tono="peligro"
                etiqueta="Eliminar"
                :contexto="fila.nombre"
                @click="pedirEliminar('producto', fila.id, fila.nombre)"
              />
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
        :filas="categoriasOrdenadas"
        :cargando="cargando"
        mensaje-vacio="Aún no hay categorías. Crea la primera para poder añadir productos."
      >
        <template #col-orden="{ fila }">
          <div class="flex items-center gap-1">
            <span class="w-5 text-tenue tabular-nums">{{ fila.orden }}</span>
            <KmBotonIcono
              icono="subir"
              etiqueta="Subir"
              :contexto="fila.nombre"
              @click="reordenar(fila.id, 'arriba')"
            />
            <KmBotonIcono
              icono="bajar"
              etiqueta="Bajar"
              :contexto="fila.nombre"
              @click="reordenar(fila.id, 'abajo')"
            />
          </div>
        </template>

        <template #col-nombre="{ fila }">
          <p class="font-semibold text-tinta" :class="fila.seccionId ? 'pl-5' : ''">
            <span v-if="fila.seccionId" class="mr-1 text-tenue">↳</span>{{ fila.nombre }}
            <KmBadge
              v-if="categorias.some((c) => c.seccionId === fila.id)"
              tono="pizarra"
              class="ml-1"
            >
              Sección
            </KmBadge>
          </p>
          <p
            class="flex flex-wrap gap-x-3 text-xs text-tenue"
            :class="fila.seccionId ? 'pl-5' : ''"
          >
            <span v-if="fila.localIds?.length"
              >Solo en {{ fila.localIds.map(nombreLocal).join(', ') }}</span
            >
            <span v-if="fila.canalIds?.length"
              >Canales: {{ fila.canalIds.map(nombreCanal).join(', ') }}</span
            >
            <span v-if="fila.foodCostObjetivo !== undefined"
              >Objetivo food cost {{ fila.foodCostObjetivo }} %</span
            >
          </p>
          <p v-if="fila.disponibilidad" class="text-xs text-laton-texto">
            {{
              fila.disponibilidad.dias.length === 7
                ? 'Todos los días'
                : fila.disponibilidad.dias.map((d) => etiquetaDia[d].slice(0, 3)).join(', ')
            }}
            · {{ fila.disponibilidad.desde }}–{{ fila.disponibilidad.hasta }}
          </p>
          <p v-if="fila.descripcion" class="text-xs text-tenue">{{ fila.descripcion }}</p>
        </template>

        <template #col-productos="{ fila }">
          <span class="tabular-nums">{{ productosDe(fila.id) }}</span>
          <p
            v-if="
              (ofrecidoLocal || ofrecidoCanal) &&
              !categoriaOfrecida(fila.id, ofrecidoLocal || undefined, ofrecidoCanal || undefined)
            "
            class="text-[11px] text-vino"
          >
            No se ofrece
          </p>
        </template>

        <template #col-estado="{ fila }">
          <KmBadge :tono="fila.activa ? 'verde' : 'neutro'" punto>
            {{ fila.activa ? 'Visible' : 'Oculta' }}
          </KmBadge>
        </template>

        <template #col-acciones="{ fila }">
          <div class="flex justify-end gap-0.5">
            <KmBotonIcono
              icono="editar"
              etiqueta="Editar"
              :contexto="fila.nombre"
              @click="editarCategoria(fila)"
            />
            <KmBotonIcono
              icono="eliminar"
              tono="peligro"
              etiqueta="Eliminar"
              :contexto="fila.nombre"
              @click="pedirEliminar('categoria', fila.id, fila.nombre)"
            />
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
      :categorias="categorias"
      @guardado="guardarCategoria"
    />

    <KmConfirmarEstado
      v-model="estado.abierto.value"
      :activar="estado.activar.value"
      :nombre="estado.nombre.value"
      :consecuencias="estado.consecuencias.value"
      :cargando="estado.cargando.value"
      @confirmar="estado.confirmar"
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
