<script setup>
import { ref } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'

const modal = ref(false)
const confirmar = ref(false)
const eliminando = ref(false)
const nombre = ref('Terraza')

function eliminar() {
  eliminando.value = true
  setTimeout(() => {
    eliminando.value = false
    confirmar.value = false
  }, 900)
}
</script>

# KmModal y KmConfirm

Diálogos centrados. `KmModal` es el contenedor genérico; `KmConfirm` es un modal listo para confirmar acciones.

<Demo>
  <div class="flex flex-wrap gap-3">
    <KmButton variante="secundario" @click="modal = true">Editar salón</KmButton>
    <KmButton variante="peligro" @click="confirmar = true">Eliminar salón</KmButton>
  </div>

  <KmModal v-model="modal" titulo="Editar salón">
    <KmField v-slot="{ id }" label="Nombre" requerido>
      <KmInput :id="id" v-model="nombre" />
    </KmField>
    <template #footer>
      <KmButton variante="secundario" @click="modal = false">Cancelar</KmButton>
      <KmButton @click="modal = false">Guardar</KmButton>
    </template>
  </KmModal>

<KmConfirm
v-model="confirmar"
titulo="Eliminar salón"
mensaje="¿Eliminar «Terraza»? Esta acción no se puede deshacer."
texto-confirmar="Eliminar"
peligroso
:cargando="eliminando"
@confirmar="eliminar"
/>
</Demo>

## KmModal

```vue
<KmModal v-model="abierto" titulo="Editar salón" ancho="md">
  <SalonForm />
  <template #footer>
    <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
    <KmButton @click="guardar">Guardar</KmButton>
  </template>
</KmModal>
```

| Prop / slot | Tipo                   | Descripción                                      |
| ----------- | ---------------------- | ------------------------------------------------ |
| `v-model`   | `boolean`              | Abierto o cerrado                                |
| `titulo`    | `string`               | Título de la cabecera                            |
| `ancho`     | `'sm' \| 'md' \| 'lg'` | Por defecto `md`                                 |
| `#header`   | slot                   | Reemplaza la cabecera                            |
| `default`   | slot                   | Contenido, con scroll a partir del 70 % del alto |
| `#footer`   | slot                   | Acciones                                         |

Se cierra con **Escape** o clic en el velo, y bloquea el scroll de fondo.

## KmConfirm

```vue
<KmConfirm
  v-model="confirmar"
  titulo="Eliminar salón"
  :mensaje="`¿Eliminar «${salon.nombre}»? Esta acción no se puede deshacer.`"
  texto-confirmar="Eliminar"
  peligroso
  :cargando="eliminando"
  @confirmar="eliminar"
/>
```

| Prop / evento    | Tipo         | Descripción                                      |
| ---------------- | ------------ | ------------------------------------------------ |
| `v-model`        | `boolean`    | Abierto o cerrado                                |
| `mensaje`        | `string`     | Pregunta. Nombra lo que se va a afectar          |
| `titulo`         | `string`     | Por defecto «¿Confirmar acción?»                 |
| `textoConfirmar` | `string`     | Verbo de la acción: «Eliminar», «Anular»         |
| `peligroso`      | `boolean`    | Botón en rojo                                    |
| `cargando`       | `boolean`    | Deshabilita los botones mientras se procesa      |
| `@confirmar`     | `() => void` | El modal no se cierra solo: ciérralo al terminar |
