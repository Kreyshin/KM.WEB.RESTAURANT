<script setup lang="ts" generic="T extends { id: string }">
import KmEstado from './KmEstado.vue'
import type { Orden } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

defineProps<{
  columnas: ColumnaTabla[]
  filas: T[]
  cargando?: boolean
  mensajeVacio?: string
  /** Mensaje de error de carga; sustituye al cuerpo de la tabla. */
  error?: string | null
}>()

const orden = defineModel<Orden | undefined>('orden')
const emit = defineEmits<{ reintentar: [] }>()

defineSlots<{
  [key: `col-${string}`]: (props: { fila: T }) => unknown
  vacio?: () => unknown
}>()

/**
 * Valor que se pinta cuando la columna no define slot propio.
 * Vive aquí y no en la plantilla porque el `<` de un genérico dentro de una
 * interpolación rompe a los formateadores, que lo leen como etiqueta HTML.
 */
function valorPorDefecto(fila: T, clave: string) {
  return (fila as Record<string, unknown>)[clave]
}

/** Ciclo de orden por columna: ascendente → descendente → sin orden. */
function alternarOrden(campo: string) {
  if (orden.value?.campo !== campo) orden.value = { campo, direccion: 'asc' }
  else if (orden.value.direccion === 'asc') orden.value = { campo, direccion: 'desc' }
  else orden.value = undefined
}

function ariaSort(campo: string) {
  if (orden.value?.campo !== campo) return 'none'
  return orden.value.direccion === 'asc' ? 'ascending' : 'descending'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[44rem] border-collapse text-[length:var(--km-texto,0.875rem)]">
      <thead>
        <tr class="border-b border-linea">
          <th
            v-for="c in columnas"
            :key="c.clave"
            scope="col"
            class="rs-etiqueta px-4 py-3 text-left text-tenue"
            :class="c.clase"
            :aria-sort="c.ordenable ? ariaSort(c.clave) : undefined"
          >
            <button
              v-if="c.ordenable"
              type="button"
              class="rs-etiqueta -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-tinta"
              :class="orden?.campo === c.clave ? 'text-tinta' : ''"
              @click="alternarOrden(c.clave)"
            >
              {{ c.etiqueta }}
              <svg class="size-3" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M6 2 9 5H3z"
                  fill="currentColor"
                  :opacity="orden?.campo === c.clave && orden.direccion === 'asc' ? 1 : 0.3"
                />
                <path
                  d="M6 10 3 7h6z"
                  fill="currentColor"
                  :opacity="orden?.campo === c.clave && orden.direccion === 'desc' ? 1 : 0.3"
                />
              </svg>
            </button>
            <template v-else>{{ c.etiqueta }}</template>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="error">
          <td :colspan="columnas.length">
            <KmEstado tipo="error" titulo="No se pudieron cargar los datos" :mensaje="error">
              <button
                type="button"
                class="text-sm font-semibold text-verde hover:underline"
                @click="emit('reintentar')"
              >
                Reintentar
              </button>
            </KmEstado>
          </td>
        </tr>

        <!-- Esqueleto de carga: mantiene la altura de la tabla estable -->
        <template v-else-if="cargando && filas.length === 0">
          <tr v-for="n in 4" :key="`skel-${n}`" class="border-b border-linea">
            <td v-for="c in columnas" :key="c.clave" class="px-4 py-[var(--km-fila,0.875rem)]">
              <div class="h-3.5 w-2/3 animate-pulse rounded bg-linea" />
            </td>
          </tr>
        </template>

        <tr v-else-if="filas.length === 0">
          <td :colspan="columnas.length">
            <slot name="vacio">
              <KmEstado tipo="vacio" :mensaje="mensajeVacio ?? 'No hay registros para mostrar.'" />
            </slot>
          </td>
        </tr>

        <template v-else>
          <tr
            v-for="fila in filas"
            :key="fila.id"
            class="border-b border-linea transition-[colors,opacity] duration-150 last:border-0 hover:bg-seleccion"
            :class="cargando ? 'opacity-60' : ''"
          >
            <td
              v-for="c in columnas"
              :key="c.clave"
              class="px-4 py-[var(--km-fila,0.875rem)] align-middle"
              :class="c.clase"
            >
              <slot :name="`col-${c.clave}`" :fila="fila">
                {{ valorPorDefecto(fila, c.clave) }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
