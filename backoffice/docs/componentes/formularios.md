<script setup>
import { ref } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'

const form = ref({ nombre: 'Ceviche clásico', precio: 38, categoria: 'frios', tiempo: '' })
const errores = ref({})

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
      <KmInput :id="id" v-model="form.precio" type="number" min="0" :invalido="invalido" />
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
