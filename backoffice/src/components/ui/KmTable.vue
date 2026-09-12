<script setup lang="ts" generic="T extends { id: string }">
import type { ColumnaTabla } from '@/types/ui'

defineProps<{
  columnas: ColumnaTabla[]
  filas: T[]
  cargando?: boolean
  mensajeVacio?: string
}>()

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
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[44rem] border-collapse text-sm">
      <thead>
        <tr class="border-b border-linea">
          <th
            v-for="c in columnas"
            :key="c.clave"
            scope="col"
            class="rs-etiqueta px-4 py-3 text-left text-tenue"
            :class="c.clase"
          >
            {{ c.etiqueta }}
          </th>
        </tr>
      </thead>

      <tbody>
        <!-- Esqueleto de carga: mantiene la altura de la tabla estable -->
        <template v-if="cargando">
          <tr v-for="n in 4" :key="`skel-${n}`" class="border-b border-linea">
            <td v-for="c in columnas" :key="c.clave" class="px-4 py-3.5">
              <div class="h-3.5 w-2/3 animate-pulse rounded bg-linea" />
            </td>
          </tr>
        </template>

        <tr v-else-if="filas.length === 0">
          <td :colspan="columnas.length" class="px-4 py-14 text-center text-sm text-tenue">
            <slot name="vacio">{{ mensajeVacio ?? 'No hay registros para mostrar.' }}</slot>
          </td>
        </tr>

        <template v-else>
          <tr
            v-for="fila in filas"
            :key="fila.id"
            class="border-b border-linea transition-colors duration-150 last:border-0 hover:bg-seleccion"
          >
            <td
              v-for="c in columnas"
              :key="c.clave"
              class="px-4 py-3.5 align-middle"
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
