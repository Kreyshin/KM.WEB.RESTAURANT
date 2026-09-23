<script setup>
import { ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import { useUiStore } from '@/stores/ui.store'

const cargando = ref(false)
function guardar() {
  cargando.value = true
  setTimeout(() => (cargando.value = false), 1200)
}
function aviso(tipo) {
  const ui = useUiStore()
  if (tipo === 'exito') ui.exito('Salón creado.')
  else if (tipo === 'error') ui.error('No se pudo guardar el salón.')
  else ui.notificar('Trabajando en el local San Isidro.')
}
</script>

# KmButton, KmBadge y KmCard

## KmButton

<Demo>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <KmButton>Primario</KmButton>
      <KmButton variante="secundario">Secundario</KmButton>
      <KmButton variante="fantasma">Fantasma</KmButton>
      <KmButton variante="peligro">Peligro</KmButton>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <KmButton tamano="sm">Pequeño</KmButton>
      <KmButton tamano="md">Mediano</KmButton>
      <KmButton tamano="lg">Grande</KmButton>
      <KmButton :cargando="cargando" @click="guardar">{{ cargando ? 'Guardando' : 'Guardar' }}</KmButton>
      <KmButton disabled>Deshabilitado</KmButton>
    </div>
  </div>
</Demo>

```vue
<KmButton variante="secundario" tamano="sm" :cargando="guardando" @click="guardar">
  Guardar
</KmButton>
```

| Prop       | Tipo                                                    | Por defecto                            |
| ---------- | ------------------------------------------------------- | -------------------------------------- |
| `variante` | `'primario' \| 'secundario' \| 'fantasma' \| 'peligro'` | `primario`                             |
| `tamano`   | `'sm' \| 'md' \| 'lg'`                                  | `md` (40 px de alto, cómodo en tablet) |
| `type`     | `'button' \| 'submit' \| 'reset'`                       | `button`                               |
| `cargando` | `boolean`                                               | Muestra un spinner y deshabilita       |
| `disabled` | `boolean`                                               |                                        |
| `bloque`   | `boolean`                                               | Ancho completo                         |

Usa **un solo primario** por zona. `peligro` solo para acciones destructivas, normalmente dentro de `KmConfirm`.

## KmBadge

<Demo>
  <div class="flex flex-wrap gap-2">
    <KmBadge tono="verde" punto>Libre</KmBadge>
    <KmBadge tono="vino" punto>Ocupada</KmBadge>
    <KmBadge tono="laton" punto>Reservada</KmBadge>
    <KmBadge tono="pizarra" punto>En limpieza</KmBadge>
    <KmBadge>Inactiva</KmBadge>
  </div>
</Demo>

```vue
<KmBadge :tono="mesa.estado === 'libre' ? 'verde' : 'vino'" punto>{{ etiqueta }}</KmBadge>
```

| Prop    | Tipo                                                    | Por defecto            |
| ------- | ------------------------------------------------------- | ---------------------- |
| `tono`  | `'neutro' \| 'verde' \| 'laton' \| 'vino' \| 'pizarra'` | `neutro`               |
| `punto` | `boolean`                                               | Punto de color delante |

## KmCard

<Demo>
  <KmCard titulo="Salones" subtitulo="Zonas físicas del restaurante.">
    <template #acciones>
      <KmButton tamano="sm">Nuevo salón</KmButton>
    </template>
    <p class="text-sm text-tenue">Contenido de la tarjeta.</p>
  </KmCard>
</Demo>

| Prop / slot           | Tipo      | Descripción                          |
| --------------------- | --------- | ------------------------------------ |
| `titulo`, `subtitulo` | `string`  | Cabecera                             |
| `sinPadding`          | `boolean` | Para tablas que van de borde a borde |
| `#acciones`           | slot      | Botones de la cabecera               |
| `default`             | slot      | Contenido                            |

## Avisos

`KmToaster` se monta una vez en `App.vue`. Los avisos se lanzan desde el store de UI:

<Demo>
  <div class="flex flex-wrap gap-2">
    <KmButton variante="secundario" @click="aviso('exito')">Éxito</KmButton>
    <KmButton variante="secundario" @click="aviso('error')">Error</KmButton>
    <KmButton variante="secundario" @click="aviso('info')">Información</KmButton>
  </div>
</Demo>

```ts
const ui = useUiStore()
ui.exito('Salón creado.') // 3,5 s
ui.error('No se pudo guardar el salón.') // 5 s
ui.notificar('Trabajando en San Isidro.') // informativo
```
