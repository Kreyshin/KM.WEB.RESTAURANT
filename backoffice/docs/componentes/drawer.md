<script setup>
import { ref } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'

const abierto = ref(false)
const ancho = ref('md')
const insumo = ref({ nombre: 'Limón sutil', unidad: 'kg', stockMinimo: 5 })
</script>

# KmDrawer

Panel lateral para crear o editar sin perder de vista la lista. Úsalo cuando el formulario es largo o conviene consultar la tabla detrás; para confirmaciones y formularios cortos, [`KmModal`](./modal).

<Demo titulo="Editar insumo">
  <div class="flex flex-wrap items-end gap-3">
    <div class="w-40">
      <KmSelect
        v-model="ancho"
        etiqueta="Ancho del drawer"
        :opciones="[
          { valor: 'sm', etiqueta: 'Ancho sm' },
          { valor: 'md', etiqueta: 'Ancho md' },
          { valor: 'lg', etiqueta: 'Ancho lg' },
        ]"
      />
    </div>
    <KmButton @click="abierto = true">Editar insumo</KmButton>
  </div>

  <KmDrawer v-model="abierto" titulo="Editar insumo" :subtitulo="insumo.nombre" :ancho="ancho">
    <div class="flex flex-col gap-4">
      <KmField v-slot="{ id }" label="Nombre" requerido>
        <KmInput :id="id" v-model="insumo.nombre" />
      </KmField>
      <KmField v-slot="{ id }" label="Unidad">
        <KmSelect :id="id" v-model="insumo.unidad" :opciones="[{ valor: 'kg', etiqueta: 'Kilogramo' }, { valor: 'unidad', etiqueta: 'Unidad' }]" />
      </KmField>
      <KmField v-slot="{ id }" label="Stock mínimo" ayuda="Por debajo se marca como bajo.">
        <KmNumero :id="id" v-model="insumo.stockMinimo" :min="0" />
      </KmField>
    </div>
    <template #footer>
      <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
      <KmButton @click="abierto = false">Guardar</KmButton>
    </template>
  </KmDrawer>
</Demo>

## Uso

```vue
<KmDrawer v-model="abierto" titulo="Editar insumo" subtitulo="Limón sutil" ancho="md">
  <FormularioInsumo />

  <template #footer>
    <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
    <KmButton :cargando="guardando" @click="guardar">Guardar</KmButton>
  </template>
</KmDrawer>
```

## API

| Prop / slot | Tipo                   | Descripción                                |
| ----------- | ---------------------- | ------------------------------------------ |
| `v-model`   | `boolean`              | Abierto o cerrado                          |
| `titulo`    | `string`               | Título y nombre accesible                  |
| `subtitulo` | `string`               | Texto bajo el título                       |
| `ancho`     | `'sm' \| 'md' \| 'lg'` | Máximo 384, 448 o 672 px. Por defecto `md` |
| `default`   | slot                   | Contenido con scroll propio                |
| `#footer`   | slot                   | Acciones fijas al pie                      |

## Comportamiento

- Se cierra con **Escape**, con clic en el velo o con la **×**.
- Bloquea el scroll de la página mientras está abierto.
- Se monta en `<body>` con `Teleport`.
- Respeta `prefers-reduced-motion`.
