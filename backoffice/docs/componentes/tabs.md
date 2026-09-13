<script setup>
import { ref } from 'vue'
import KmTabs from '@/components/ui/KmTabs.vue'

const pestanas = [
  { valor: 'pendientes', etiqueta: 'Pendientes', contador: 4 },
  { valor: 'recibidas', etiqueta: 'Recibidas', contador: 12 },
  { valor: 'anuladas', etiqueta: 'Anuladas', contador: 1 },
]
const activa = ref('pendientes')
const ordenes = {
  pendientes: ['OC-0142 · Mercado Mayorista', 'OC-0143 · Pesquera San José', 'OC-0145 · Distribuidora Andina', 'OC-0146 · Licores del Sur'],
  recibidas: ['OC-0131 · Mercado Mayorista', 'OC-0133 · Avícola El Rancho', '…y 10 más'],
  anuladas: ['OC-0139 · Pesquera San José (pedido duplicado)'],
}
</script>

# KmTabs

Pestañas con contador opcional, siguiendo el patrón WAI-ARIA _tabs_.

<Demo titulo="Órdenes de compra">
  <KmTabs v-model="activa" :pestanas="pestanas" etiqueta="Órdenes de compra">
    <ul class="flex flex-col divide-y divide-linea rounded-card border border-linea bg-panel">
      <li v-for="o in ordenes[activa]" :key="o" class="px-4 py-3 text-sm text-tinta">{{ o }}</li>
    </ul>
  </KmTabs>
</Demo>

Con el foco en una pestaña, usa **← →**, **Inicio** y **Fin**.

## Uso

```vue
<script setup lang="ts">
import { ref } from 'vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import type { Pestana } from '@/types/ui'

const pestanas: Pestana[] = [
  { valor: 'pendientes', etiqueta: 'Pendientes', contador: 4 },
  { valor: 'recibidas', etiqueta: 'Recibidas' },
]
const activa = ref('pendientes')
</script>

<template>
  <KmTabs v-model="activa" :pestanas="pestanas" etiqueta="Órdenes de compra">
    <ListaOrdenes :estado="activa" />
  </KmTabs>
</template>
```

## API

| Prop / slot | Tipo              | Descripción                               |
| ----------- | ----------------- | ----------------------------------------- |
| `v-model`   | `string`          | `valor` de la pestaña activa              |
| `pestanas`  | `Pestana[]`       | `{ valor, etiqueta, contador? }`          |
| `etiqueta`  | `string`          | Nombre accesible del grupo (`aria-label`) |
| `default`   | slot `{ activa }` | Contenido del panel activo                |

## Accesibilidad

- `role="tablist"`, `role="tab"` con `aria-selected` y `aria-controls`, y `role="tabpanel"`.
- Solo la pestaña activa entra en el orden de tabulación (_roving tabindex_).
