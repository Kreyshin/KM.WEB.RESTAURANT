<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { cartaService } from '@/services/carta.service'
import { combosService } from '@/services/combos.service'
import { fotoPlato } from '@/services/mock/ilustraciones'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Categoria, Combo, DiaSemana, Producto } from '@/types'
import { etiquetaDia } from '@/utils/configuracion'
import { formatearSoles } from '@/utils/formato'

/**
 * Vista previa de la carta tal como la verá el cajero o mozo en el POS:
 * tarjetas grandes con foto, precio y disponibilidad. Solo lectura.
 */

const ui = useUiStore()

const categorias = ref<Categoria[]>([])
const productos = ref<Producto[]>([])
const combos = ref<Combo[]>([])
const cargando = ref(true)

type Pestana = 'carta' | 'menuDia' | 'combo'
const pestana = ref<Pestana>('carta')
const categoria = ref('')
const busqueda = ref('')
const detalle = ref<Producto | Combo | null>(null)

const hoy = new Date().getDay() as DiaSemana

onMounted(async () => {
  try {
    const [cats, prods, cbs] = await Promise.all([
      cartaService.listarCategorias(),
      cartaService.listarProductos(),
      combosService.todos(),
    ])
    categorias.value = cats.filter((c) => c.activa)
    productos.value = prods
    combos.value = cbs
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cargar la carta.')
  } finally {
    cargando.value = false
  }
})

const texto = computed(() => busqueda.value.trim().toLowerCase())

const productosVisibles = computed(() =>
  productos.value.filter(
    (p) =>
      categorias.value.some((c) => c.id === p.categoriaId) &&
      (!categoria.value || p.categoriaId === categoria.value) &&
      (!texto.value || p.nombre.toLowerCase().includes(texto.value)),
  ),
)

const combosVisibles = computed(() =>
  combos.value.filter(
    (c) =>
      c.activo &&
      c.tipo === pestana.value &&
      (!texto.value || c.nombre.toLowerCase().includes(texto.value)),
  ),
)

const conteo = computed(() => ({
  carta: productos.value.length,
  menuDia: combos.value.filter((c) => c.activo && c.tipo === 'menuDia').length,
  combo: combos.value.filter((c) => c.activo && c.tipo === 'combo').length,
}))

const imagen = (item: { nombre: string; imagen?: string }) => fotoPlato(item.nombre) ?? item.imagen

function precioDesde(p: Producto) {
  const activas = p.variantes.filter((v) => v.activa)
  if (activas.length === 0) return { desde: false, precio: p.precio }
  return { desde: activas.length > 1, precio: Math.min(...activas.map((v) => v.precio)) }
}

const disponibleHoy = (c: Combo) => c.dias.length === 0 || c.dias.includes(hoy)

const nombreProducto = (id: string) => productos.value.find((p) => p.id === id)?.nombre ?? '—'

function textoDias(dias: DiaSemana[]) {
  if (dias.length === 0 || dias.length === 7) return 'Todos los días'
  return dias.map((d) => etiquetaDia[d].slice(0, 3)).join(', ')
}

const esCombo = (x: Producto | Combo): x is Combo => 'grupos' in x
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <div role="tablist" class="flex gap-1 rounded-control border border-linea bg-panel p-1">
        <button
          v-for="t in [
            { id: 'carta', etiqueta: 'Carta' },
            { id: 'menuDia', etiqueta: 'Menú del día' },
            { id: 'combo', etiqueta: 'Combos' },
          ] as const"
          :key="t.id"
          role="tab"
          type="button"
          :aria-selected="pestana === t.id"
          class="rounded-[5px] px-3.5 py-1.5 text-sm font-medium transition-colors"
          :class="pestana === t.id ? 'bg-seleccion text-tinta' : 'text-tenue hover:text-tinta'"
          @click="pestana = t.id"
        >
          {{ t.etiqueta }}
          <span class="ml-1 text-xs text-tenue tabular-nums">{{ conteo[t.id] }}</span>
        </button>
      </div>
      <p class="text-sm text-tenue">Vista previa de cómo se verá en el POS.</p>
      <div class="flex-1"></div>
      <KmInput v-model="busqueda" placeholder="Buscar…" class="!w-56" aria-label="Buscar" />
    </div>

    <div v-if="pestana === 'carta'" class="flex gap-2 overflow-x-auto pb-1" aria-label="Categorías">
      <button
        v-for="c in [{ id: '', nombre: 'Todo' }, ...categorias]"
        :key="c.id"
        type="button"
        class="shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
        :class="
          categoria === c.id
            ? 'border-accion bg-accion text-white'
            : 'border-linea bg-panel text-tenue hover:text-tinta'
        "
        @click="categoria = c.id"
      >
        {{ c.nombre }}
      </button>
    </div>

    <div v-if="cargando" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div v-for="i in 10" :key="i" class="h-56 animate-pulse rounded-card bg-seleccion"></div>
    </div>

    <!-- Productos -->
    <div
      v-else-if="pestana === 'carta'"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <button
        v-for="p in productosVisibles"
        :key="p.id"
        type="button"
        class="rs-pos-tarjeta group"
        :class="{ 'opacity-55 grayscale': !p.disponible }"
        :aria-label="`${p.nombre}, ${formatearSoles(precioDesde(p).precio)}${p.disponible ? '' : ', agotado'}`"
        @click="detalle = p"
      >
        <div class="relative aspect-[4/3] overflow-hidden bg-seleccion">
          <img
            v-if="imagen(p)"
            :src="imagen(p)"
            alt=""
            class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span v-if="!p.disponible" class="rs-pos-cinta">Agotado</span>
          <span
            v-if="p.tiempoPreparacionMin"
            class="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white"
          >
            {{ p.tiempoPreparacionMin }} min
          </span>
        </div>
        <div class="flex flex-1 flex-col gap-1 p-3 text-left">
          <p class="line-clamp-2 text-sm leading-tight font-semibold text-tinta">{{ p.nombre }}</p>
          <p class="mt-auto text-base font-bold text-accion tabular-nums">
            <span v-if="precioDesde(p).desde" class="text-xs font-medium text-tenue">desde </span>
            {{ formatearSoles(precioDesde(p).precio) }}
          </p>
          <p
            v-if="p.variantes.length || p.gruposModificadores.length"
            class="text-[11px] text-tenue"
          >
            {{ p.variantes.length ? `${p.variantes.length} tamaños` : 'Con opciones' }}
          </p>
        </div>
      </button>
      <p v-if="productosVisibles.length === 0" class="col-span-full py-10 text-center text-tenue">
        No hay productos que coincidan.
      </p>
    </div>

    <!-- Combos y menú del día -->
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="c in combosVisibles"
        :key="c.id"
        type="button"
        class="rs-pos-tarjeta group"
        :class="{ 'opacity-55 grayscale': !disponibleHoy(c) }"
        :aria-label="`${c.nombre}, ${formatearSoles(c.precio)}`"
        @click="detalle = c"
      >
        <div class="relative aspect-[16/9] overflow-hidden bg-seleccion">
          <img
            v-if="imagen(c)"
            :src="imagen(c)"
            alt=""
            class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span v-if="!disponibleHoy(c)" class="rs-pos-cinta">No disponible hoy</span>
          <span
            class="absolute top-2 right-2 rounded-full bg-accion px-3 py-1 text-sm font-bold text-white tabular-nums shadow"
          >
            {{ formatearSoles(c.precio) }}
          </span>
        </div>
        <div class="flex flex-col gap-2 p-3 text-left">
          <div class="flex items-center justify-between gap-2">
            <p class="font-semibold text-tinta">{{ c.nombre }}</p>
            <span class="text-[11px] text-tenue">{{ textoDias(c.dias) }}</span>
          </div>
          <ul class="flex flex-col gap-1">
            <li v-for="g in c.grupos" :key="g.id" class="text-xs text-tenue">
              <span class="font-semibold text-tinta">{{ g.nombre }}:</span>
              {{ g.opciones.map(nombreProducto).join(' o ') }}
            </li>
          </ul>
        </div>
      </button>
      <p v-if="combosVisibles.length === 0" class="col-span-full py-10 text-center text-tenue">
        No hay {{ pestana === 'combo' ? 'combos' : 'menús' }} activos.
      </p>
    </div>

    <!-- Detalle -->
    <Teleport to="body">
      <div
        v-if="detalle"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="detalle = null"
        @keydown.esc="detalle = null"
      >
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="detalle.nombre"
          class="w-full max-w-md overflow-hidden rounded-card bg-panel shadow-xl"
        >
          <img
            v-if="imagen(detalle)"
            :src="imagen(detalle)"
            alt=""
            class="aspect-[4/3] w-full object-cover"
          />
          <div class="flex flex-col gap-3 p-5">
            <div class="flex items-start justify-between gap-3">
              <h2 class="text-lg font-semibold text-tinta">{{ detalle.nombre }}</h2>
              <span class="text-lg font-bold text-accion tabular-nums">
                {{
                  formatearSoles(esCombo(detalle) ? detalle.precio : precioDesde(detalle).precio)
                }}
              </span>
            </div>
            <p v-if="detalle.descripcion" class="text-sm text-tenue">{{ detalle.descripcion }}</p>
            <template v-if="esCombo(detalle)">
              <ul class="flex flex-col gap-1 text-sm">
                <li v-for="g in detalle.grupos" :key="g.id">
                  <b>{{ g.nombre }}:</b> {{ g.opciones.map(nombreProducto).join(' o ') }}
                </li>
              </ul>
            </template>
            <template v-else>
              <div v-if="detalle.variantes.length" class="flex flex-wrap gap-2">
                <KmBadge v-for="v in detalle.variantes" :key="v.id" tono="neutro">
                  {{ v.nombre }} · {{ formatearSoles(v.precio) }}
                </KmBadge>
              </div>
              <p v-for="g in detalle.gruposModificadores" :key="g.id" class="text-sm text-tenue">
                <b class="text-tinta">{{ g.nombre }}:</b>
                {{ g.modificadores.map((m) => m.nombre).join(', ') }}
              </p>
            </template>
            <button
              type="button"
              class="mt-2 rounded-control border border-linea px-4 py-2 text-sm font-medium hover:bg-seleccion"
              @click="detalle = null"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.rs-pos-tarjeta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-linea);
  border-radius: var(--radius-card);
  background: var(--color-panel);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s;
}
.rs-pos-tarjeta:hover {
  transform: translateY(-2px);
  border-color: var(--color-accion);
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.1);
}
.rs-pos-tarjeta:focus-visible {
  outline: 2px solid var(--color-accion);
  outline-offset: 2px;
}
.rs-pos-cinta {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  transform: translateY(-50%);
  background: color-mix(in srgb, var(--color-vino) 90%, transparent);
  padding: 4px 0;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #fff;
  text-transform: uppercase;
}
</style>
