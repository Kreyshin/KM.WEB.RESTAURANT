<script setup>
import { ref } from 'vue'
import KmUploadImagen from '@/components/ui/KmUploadImagen.vue'
import { useUiStore } from '@/stores/ui.store'

const imagen = ref()
function error(mensaje) {
  useUiStore().error(mensaje)
}
</script>

# KmUploadImagen

Carga de imágenes por arrastre o selector. Reduce la imagen **en el navegador** antes de guardarla: una foto de móvil de ~4 MB queda en torno a 80 KB en WebP.

<Demo titulo="Foto del plato">
  <div class="flex flex-wrap items-center gap-8">
    <KmUploadImagen v-model="imagen" etiqueta="Foto del plato" @error="error" />
    <div v-if="imagen" class="flex items-center gap-3 rounded-card border border-linea bg-panel p-3">
      <img :src="imagen" alt="" class="size-14 rounded-control object-cover" />
      <div>
        <p class="text-sm font-medium text-tinta">Ceviche clásico</p>
        <p class="text-xs text-tenue">{{ Math.round((imagen.length * 3) / 4 / 1024) }} KB guardados</p>
      </div>
    </div>
  </div>
</Demo>

## Uso

```vue
<KmUploadImagen
  v-model="producto.imagen"
  etiqueta="Foto del plato"
  :lado-maximo="800"
  @error="ui.error"
/>
```

## API

| Prop / evento | Tipo                        | Descripción                                        |
| ------------- | --------------------------- | -------------------------------------------------- |
| `v-model`     | `string \| undefined`       | Data URL en el mock; URL final con backend         |
| `etiqueta`    | `string`                    | Nombre accesible. Por defecto «Imagen»             |
| `ladoMaximo`  | `number`                    | Lado mayor tras reducir. Por defecto 800 px        |
| `maxKb`       | `number`                    | Peso máximo del archivo original. Por defecto 5000 |
| `@error`      | `(mensaje: string) => void` | Formato no válido, archivo muy pesado o ilegible   |

## Con backend

Hoy la data URL se guarda tal cual en el mock. Cuando exista almacenamiento de archivos, el **servicio** subirá la imagen y sustituirá la data URL por la URL definitiva; el componente no cambia.
