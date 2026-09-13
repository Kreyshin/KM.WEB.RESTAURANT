<script setup>
import DemoTabla from '../demos/DemoTabla.vue'
</script>

# KmTable y paginación

Tabla genérica con orden por columna, celdas personalizadas y estados de carga, vacío y error. Se combina con `KmPaginacion`, `KmBusqueda` y el composable [`useListado`](/guia/listados).

<Demo titulo="Carta de ejemplo · 17 platos">
  <DemoTabla />
</Demo>

Prueba: busca «ceviche», filtra por _Postres_, ordena por precio, cambia el tamaño de página, activa **Forzar error** y pulsa _Reintentar_.

## Uso

```vue
<script setup lang="ts">
import KmPaginacion from '@/components/ui/KmPaginacion.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useListado } from '@/composables/useListado'
import { productosService } from '@/services/productos.service'
import type { ColumnaTabla } from '@/types/ui'
import { formatearSoles } from '@/utils/formato'

const { consulta, items, total, cargando, error, recargar } = useListado((c) =>
  productosService.consultar(c),
)

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Plato', ordenable: true },
  { clave: 'precio', etiqueta: 'Precio', clase: 'w-28 text-right', ordenable: true },
  { clave: 'acciones', etiqueta: '', clase: 'w-24 text-right' },
]
</script>

<template>
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
    <template #col-acciones="{ fila }">
      <KmButton variante="fantasma" tamano="sm" @click="editar(fila)">Editar</KmButton>
    </template>
  </KmTable>

  <KmPaginacion
    v-model:pagina="consulta.pagina"
    v-model:por-pagina="consulta.porPagina"
    :total="total"
  />
</template>
```

## KmTable

### Props

| Prop            | Tipo                 | Descripción                                                  |
| --------------- | -------------------- | ------------------------------------------------------------ |
| `columnas`      | `ColumnaTabla[]`     | Definición de columnas                                       |
| `filas`         | `T[]`                | Filas de la página actual. Cada una necesita `id`            |
| `cargando`      | `boolean`            | Sin filas: esqueleto. Con filas: las atenúa mientras recarga |
| `error`         | `string \| null`     | Sustituye el cuerpo por un estado de error con _Reintentar_  |
| `mensajeVacio`  | `string`             | Texto del estado vacío                                       |
| `v-model:orden` | `Orden \| undefined` | Orden activo                                                 |

### ColumnaTabla

| Campo       | Tipo       | Descripción                                                |
| ----------- | ---------- | ---------------------------------------------------------- |
| `clave`     | `string`   | Campo de la fila y nombre del slot `col-<clave>`           |
| `etiqueta`  | `string`   | Cabecera                                                   |
| `clase`     | `string?`  | Clases de la celda: ancho, alineación                      |
| `ordenable` | `boolean?` | Muestra el control de orden. Ciclo: asc → desc → sin orden |

### Eventos y slots

| Nombre         | Tipo            | Descripción                              |
| -------------- | --------------- | ---------------------------------------- |
| `@reintentar`  | `() => void`    | Clic en _Reintentar_ del estado de error |
| `#col-<clave>` | slot `{ fila }` | Celda personalizada                      |
| `#vacio`       | slot            | Reemplaza el estado vacío                |

## KmPaginacion

| Prop                 | Tipo       | Descripción                                         |
| -------------------- | ---------- | --------------------------------------------------- |
| `total`              | `number`   | Registros totales                                   |
| `v-model:pagina`     | `number`   | Página actual, desde 1                              |
| `v-model:por-pagina` | `number`   | Tamaño de página. Al cambiarlo vuelve a la página 1 |
| `opcionesPorPagina`  | `number[]` | Por defecto `[10, 20, 50]`                          |

Con muchas páginas muestra huecos: `1 … 4 5 6 … 12`.

## Accesibilidad

- Las cabeceras ordenables son botones con `aria-sort`.
- La paginación es un `nav` con `aria-current="page"` en la página activa.
- El estado de error usa `role="alert"`.
