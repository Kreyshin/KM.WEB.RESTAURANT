<script setup lang="ts">
import { computed } from 'vue'
import KmSelect from './KmSelect.vue'

const props = withDefaults(defineProps<{ total: number; opcionesPorPagina?: number[] }>(), {
  opcionesPorPagina: () => [10, 20, 50],
})

const pagina = defineModel<number>('pagina', { required: true })
const porPagina = defineModel<number>('porPagina', { required: true })

const paginas = computed(() => Math.max(1, Math.ceil(props.total / porPagina.value)))
const desde = computed(() => (props.total === 0 ? 0 : (pagina.value - 1) * porPagina.value + 1))
const hasta = computed(() => Math.min(props.total, pagina.value * porPagina.value))

/** Números visibles con huecos: 1 … 4 5 6 … 12. `0` representa el hueco. */
const numeros = computed(() => {
  const n = paginas.value
  const p = pagina.value
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const centro = [p - 1, p, p + 1].filter((x) => x > 1 && x < n)
  return [1, ...(centro[0]! > 2 ? [0] : []), ...centro, ...(centro.at(-1)! < n - 1 ? [0] : []), n]
})

function ir(destino: number) {
  pagina.value = Math.min(Math.max(1, destino), paginas.value)
}

const opcionesSelect = computed(() =>
  props.opcionesPorPagina.map((o) => ({ valor: o, etiqueta: String(o) })),
)

function cambiarPorPagina(valor: string | number | undefined) {
  porPagina.value = Number(valor)
  pagina.value = 1
}

const boton =
  'grid min-w-8 h-8 place-items-center rounded-control px-2 text-sm tabular-nums transition-colors disabled:opacity-40 disabled:pointer-events-none'
</script>

<template>
  <nav
    class="flex flex-wrap items-center justify-between gap-3 border-t border-linea px-4 py-3 text-sm"
    aria-label="Paginación"
  >
    <p class="text-tenue tabular-nums">
      <template v-if="total">{{ desde }}–{{ hasta }} de {{ total }}</template>
      <template v-else>Sin resultados</template>
    </p>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 text-tenue">
        <span class="hidden sm:inline">Por página</span>
        <KmSelect
          class="w-20"
          :model-value="porPagina"
          :opciones="opcionesSelect"
          etiqueta="Filas por página"
          @update:model-value="cambiarPorPagina"
        />
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          :class="[boton, 'text-tenue hover:bg-seleccion hover:text-tinta']"
          :disabled="pagina <= 1"
          aria-label="Página anterior"
          @click="ir(pagina - 1)"
        >
          ‹
        </button>
        <template v-for="(n, i) in numeros" :key="`${n}-${i}`">
          <span v-if="n === 0" class="px-1 text-tenue" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            :class="[
              boton,
              n === pagina
                ? 'bg-rail font-semibold text-rail-tinta'
                : 'text-tinta hover:bg-seleccion',
            ]"
            :aria-current="n === pagina ? 'page' : undefined"
            @click="ir(n)"
          >
            {{ n }}
          </button>
        </template>
        <button
          type="button"
          :class="[boton, 'text-tenue hover:bg-seleccion hover:text-tinta']"
          :disabled="pagina >= paginas"
          aria-label="Página siguiente"
          @click="ir(pagina + 1)"
        >
          ›
        </button>
      </div>
    </div>
  </nav>
</template>
