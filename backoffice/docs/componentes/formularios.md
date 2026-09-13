<script setup>
import { ref } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'

const form = ref({ nombre: 'Ceviche clásico', precio: 38, categoria: 'frios', tiempo: '' })
const errores = ref({})
const incluyeIgv = ref(true)
const recargo = ref(10)
const costo = ref(4.5)

function validar() {
  errores.value = {}
  if (!form.value.nombre.trim()) errores.value.nombre = 'Ingresa el nombre del plato.'
  if (!(Number(form.value.precio) > 0)) errores.value.precio = 'El precio debe ser mayor que cero.'
  if (!form.value.tiempo) errores.value.tiempo = 'Indica el tiempo de preparación.'
}
</script>

# Formularios

`KmField` pone la etiqueta, la ayuda y el error, y genera el `id` que enlaza la etiqueta con el control. `KmInput` y `KmSelect` son los controles.

<Demo titulo="Nuevo plato">
  <div class="grid gap-4 sm:grid-cols-2">
    <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
      <KmInput :id="id" v-model="form.nombre" :invalido="invalido" />
    </KmField>
    <KmField v-slot="{ id, invalido }" label="Precio (S/)" requerido :error="errores.precio">
      <KmNumero :id="id" v-model="form.precio" :min="0" :invalido="invalido" prefijo="S/" :decimales="2" />
    </KmField>
    <KmField v-slot="{ id }" label="Categoría" ayuda="Dónde aparece en la carta.">
      <KmSelect :id="id" v-model="form.categoria" :opciones="[{ valor: 'entradas', etiqueta: 'Entradas' }, { valor: 'frios', etiqueta: 'Fríos' }, { valor: 'fondos', etiqueta: 'Fondos' }]" />
    </KmField>
    <KmField v-slot="{ id, invalido }" label="Tiempo de preparación" :error="errores.tiempo">
      <KmSelect :id="id" v-model="form.tiempo" placeholder="Elige un tiempo" :invalido="invalido" :opciones="[{ valor: '10', etiqueta: '10 min' }, { valor: '20', etiqueta: '20 min' }, { valor: '30', etiqueta: '30 min' }]" />
    </KmField>
  </div>
  <div class="mt-4 flex gap-2">
    <KmButton @click="validar">Validar</KmButton>
    <KmButton variante="fantasma" @click="form.nombre = ''; form.tiempo = ''; errores = {}">Vaciar</KmButton>
  </div>
</Demo>

## KmField

```vue
<KmField
  v-slot="{ id, invalido }"
  label="Nombre"
  requerido
  :error="errores.nombre"
  ayuda="Tal como aparece en la carta."
>
  <KmInput :id="id" v-model="form.nombre" :invalido="invalido" />
</KmField>
```

| Prop / slot | Tipo                    | Descripción                            |
| ----------- | ----------------------- | -------------------------------------- |
| `label`     | `string`                | Etiqueta                               |
| `requerido` | `boolean`               | Marca con asterisco                    |
| `error`     | `string`                | Mensaje de error; sustituye a la ayuda |
| `ayuda`     | `string`                | Texto de apoyo                         |
| `default`   | slot `{ id, invalido }` | Pasa `id` e `invalido` al control      |

## KmInput

| Prop                                              | Tipo               | Descripción                     |
| ------------------------------------------------- | ------------------ | ------------------------------- |
| `v-model`                                         | `string \| number` | Valor                           |
| `type`                                            | `string`           | Por defecto `text`              |
| `id`, `placeholder`, `min`, `max`, `autocomplete` |                    | Atributos nativos               |
| `invalido`                                        | `boolean`          | Borde de error y `aria-invalid` |
| `disabled`                                        | `boolean`          |                                 |

## KmNumero

Campo numérico propio para cantidades, porcentajes y soles. Sustituye al `<input type="number">` nativo, cuyas flechas y comportamiento cambian según el navegador.

<Demo>
  <div class="grid gap-4 sm:grid-cols-2">
    <KmField v-slot="{ id }" label="Recargo al consumo" ayuda="Máximo 13 %.">
      <KmNumero :id="id" v-model="recargo" :min="0" :max="13" :step="0.5" :decimales="2" sufijo="%" />
    </KmField>
    <KmField v-slot="{ id }" label="Costo por kilo">
      <KmNumero :id="id" v-model="costo" :min="0" :decimales="2" prefijo="S/" />
    </KmField>
  </div>
  <p class="mt-3 text-xs text-tenue">Modelos: <code>{{ recargo }}</code> · <code>{{ costo }}</code></p>
</Demo>

```vue
<KmField v-slot="{ id, invalido }" label="Precio" :error="errores.precio">
  <KmNumero :id="id" v-model="form.precio" :min="0" :decimales="2" prefijo="S/" :invalido="invalido" />
</KmField>
```

| Prop                                  | Tipo             | Descripción                                                   |
| ------------------------------------- | ---------------- | ------------------------------------------------------------- |
| `v-model`                             | `number \| null` | Siempre un número; `null` si está vacío                       |
| `min` / `max`                         | `number`         | Límites de los botones y las flechas                          |
| `step`                                | `number`         | Paso de − / + y de las flechas. Por defecto 1; con Shift, ×10 |
| `decimales`                           | `number`         | Decimales permitidos y mostrados. Por defecto 0               |
| `prefijo` / `sufijo`                  | `string`         | «S/», «%», «min», «pers.»                                     |
| `controles`                           | `boolean`        | Botones − y +. Desactívalos en columnas estrechas             |
| `invalido`, `disabled`, `placeholder` |                  | Igual que `KmInput`                                           |

Comportamiento:

- Acepta **coma o punto** decimal y descarta letras o decimales de más mientras se escribe.
- Fuera de foco muestra los decimales fijos (`38.00`).
- Un valor escrito **fuera de rango no se corrige en silencio**: se conserva para que la validación muestre el error.
- Rol `spinbutton` con `aria-valuenow`, `aria-valuemin` y `aria-valuemax`.

## KmSelect

| Prop                   | Tipo                            | Descripción                                           |
| ---------------------- | ------------------------------- | ----------------------------------------------------- |
| `v-model`              | `string \| number \| undefined` | Valor                                                 |
| `opciones`             | `OpcionSelect[]`                | `{ valor, etiqueta }`                                 |
| `placeholder`          | `string`                        | Opción inicial deshabilitada                          |
| `etiqueta`             | `string`                        | `aria-label` cuando no hay etiqueta visible (filtros) |
| `invalido`, `disabled` | `boolean`                       |                                                       |

## Errores del servicio

Los servicios lanzan `ApiError` con `campos`. Llévalos al formulario así:

```ts
try {
  await proveedoresService.crear(form.value)
} catch (e) {
  const err = e as ApiError
  ui.error(err.mensaje)
  errores.value = err.campos ?? {}
}
```

## KmSwitch

<Demo>
  <KmSwitch v-model="incluyeIgv" etiqueta="Los precios incluyen IGV" descripcion="Si lo desactivas, el IGV se suma al cobrar." />
  <p class="mt-3 text-xs text-tenue">Valor: <code>{{ incluyeIgv }}</code></p>
</Demo>

```vue
<KmSwitch
  v-model="config.preciosIncluyenIgv"
  etiqueta="Los precios incluyen IGV"
  descripcion="Si lo desactivas, el IGV se suma al cobrar."
/>
```

| Prop          | Tipo      | Descripción                        |
| ------------- | --------- | ---------------------------------- |
| `v-model`     | `boolean` | Estado                             |
| `etiqueta`    | `string`  | Texto principal y nombre accesible |
| `descripcion` | `string`  | Explicación bajo la etiqueta       |
| `disabled`    | `boolean` |                                    |

Usa `role="switch"` con `aria-checked`. Para una opción que se aplica al guardar un formulario; para acciones inmediatas sobre una fila, usa un botón.
