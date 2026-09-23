<script setup>
import { ref } from 'vue'
import KmField from '@/components/ui/KmField.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmRangoFechas from '@/components/ui/KmRangoFechas.vue'
import { rangoDeAtajo } from '@/utils/fechas'

const rango = ref(rangoDeAtajo('ultimos7'))
const fecha = ref('2026-09-12')
const entrega = ref(null)
</script>

# KmFecha y KmRangoFechas

Selectores de fecha sobre [@vuepic/vue-datepicker](https://vue3datepicker.com/) con el tema Mesa, en español y con la semana empezando el lunes.

- **Mes y año**: clic en el mes o el año de la cabecera abre su cuadrícula.
- **Escritura manual**: `01/08/2026` o `01082026`, y **Enter**.
- **Formato**: se ve `dd/mm/aaaa`, pero el modelo siempre es `YYYY-MM-DD`, el formato que viajará a la API.

<Demo titulo="Rango">
  <KmRangoFechas v-model="rango" />
  <p class="mt-3 text-xs text-tenue">Modelo: <code>{{ rango }}</code></p>
</Demo>

<Demo titulo="Fecha suelta y con mínimo">
  <div class="grid gap-4 sm:grid-cols-2">
    <KmField v-slot="{ id }" label="Fecha">
      <KmFecha :id="id" v-model="fecha" />
    </KmField>
    <KmField v-slot="{ id }" label="Entrega de compra" ayuda="Desde el 12/09/2026.">
      <KmFecha :id="id" v-model="entrega" min="2026-09-12" />
    </KmField>
  </div>
  <p class="mt-3 text-xs text-tenue">Modelos: <code>{{ fecha ?? 'null' }}</code> · <code>{{ entrega ?? 'null' }}</code></p>
</Demo>

## KmRangoFechas

```vue
<script setup lang="ts">
import { ref } from 'vue'
import KmRangoFechas from '@/components/ui/KmRangoFechas.vue'
import type { RangoFechas } from '@/types/ui'
import { rangoDeAtajo } from '@/utils/fechas'

const rango = ref<RangoFechas>(rangoDeAtajo('esteMes'))
</script>

<template>
  <KmRangoFechas v-model="rango" :atajos="['hoy', 'ultimos7', 'esteMes']" />
</template>
```

| Prop          | Tipo           | Descripción                                            |
| ------------- | -------------- | ------------------------------------------------------ |
| `v-model`     | `RangoFechas`  | `{ desde, hasta }` en `YYYY-MM-DD`, extremos incluidos |
| `atajos`      | `AtajoRango[]` | Por defecto todos                                      |
| `min` / `max` | `string`       | Límites en `YYYY-MM-DD`                                |
| `id`          | `string`       | Para enlazar con una etiqueta                          |

Atajos disponibles: `hoy`, `ayer`, `ultimos7`, `ultimos30`, `esteMes`, `mesAnterior`. El calendario no emite hasta tener los dos extremos; si eliges primero el final, se ordena solo.

## KmFecha

```vue
<KmField v-slot="{ id, invalido }" label="Fecha de entrega" :error="errores.fecha">
  <KmFecha :id="id" v-model="fecha" :invalido="invalido" min="2026-09-12" />
</KmField>
```

| Prop          | Tipo             | Descripción                           |
| ------------- | ---------------- | ------------------------------------- |
| `v-model`     | `string \| null` | `YYYY-MM-DD`                          |
| `min` / `max` | `string`         | Límites                               |
| `placeholder` | `string`         | Por defecto `dd/mm/aaaa`              |
| `invalido`    | `boolean`        | Borde de error                        |
| `limpiable`   | `boolean`        | Botón para borrar. Por defecto `true` |
| `disabled`    | `boolean`        |                                       |

## Utilidades

`src/utils/fechas.ts`:

| Función                     | Devuelve                                |
| --------------------------- | --------------------------------------- |
| `aFechaIso(date)`           | `YYYY-MM-DD` en hora **local** (no UTC) |
| `rangoDeAtajo(atajo, hoy?)` | `RangoFechas` del atajo                 |
| `atajoDeRango(rango, hoy?)` | El atajo que coincide o `null`          |
