<script setup>
import KmButton from '@/components/ui/KmButton.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
</script>

# KmEstado

Estados de pantalla o de bloque: vacío, cargando y error. `KmTable` los usa por dentro; úsalo tú en listas, tarjetas o paneles.

<Demo>
  <div class="grid gap-4 md:grid-cols-3">
    <div class="rounded-card border border-linea bg-panel">
      <KmEstado tipo="vacio" mensaje="Aún no hay proveedores registrados." compacto>
        <KmButton tamano="sm">Nuevo proveedor</KmButton>
      </KmEstado>
    </div>
    <div class="rounded-card border border-linea bg-panel">
      <KmEstado tipo="cargando" compacto />
    </div>
    <div class="rounded-card border border-linea bg-panel">
      <KmEstado tipo="error" mensaje="Error de red simulado. Vuelve a intentarlo." compacto>
        <KmButton variante="secundario" tamano="sm">Reintentar</KmButton>
      </KmEstado>
    </div>
  </div>
</Demo>

## Uso

```vue
<KmEstado v-if="error" tipo="error" :mensaje="error">
  <KmButton variante="secundario" tamano="sm" @click="recargar">Reintentar</KmButton>
</KmEstado>

<KmEstado v-else-if="!items.length" tipo="vacio" mensaje="Aún no hay proveedores registrados.">
  <KmButton tamano="sm" @click="nuevo">Nuevo proveedor</KmButton>
</KmEstado>
```

## API

| Prop / slot | Tipo                               | Descripción                                                 |
| ----------- | ---------------------------------- | ----------------------------------------------------------- |
| `tipo`      | `'vacio' \| 'cargando' \| 'error'` | Icono, rol ARIA y título por defecto                        |
| `titulo`    | `string`                           | Por defecto: «Sin registros», «Cargando…», «Algo salió mal» |
| `mensaje`   | `string`                           | Explicación                                                 |
| `compacto`  | `boolean`                          | Menos espacio vertical                                      |
| `default`   | slot                               | Acciones                                                    |

## Cómo escribir los mensajes

- **Vacío**: di qué falta y cómo empezar. «Aún no hay proveedores registrados.» + _Nuevo proveedor_.
- **Vacío por búsqueda**: distínguelo del vacío real. «Ningún proveedor coincide con la búsqueda.»
- **Error**: qué pasó y qué hacer. Sin disculpas ni códigos técnicos.
