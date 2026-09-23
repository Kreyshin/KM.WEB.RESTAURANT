<script setup>
import { ref } from 'vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import { useUiStore } from '@/stores/ui.store'

const termino = ref('')
function exportar(formato) {
  useUiStore().notificar(`Se exportaría en formato ${formato === 'excel' ? 'Excel' : 'CSV'}.`)
}
</script>

# Búsqueda y exportación

## KmBusqueda

<Demo>
  <div class="flex flex-wrap items-center gap-3">
    <KmBusqueda v-model="termino" placeholder="Buscar salón" />
    <span class="text-sm text-tenue">Término: <code>{{ termino || '—' }}</code></span>
  </div>
</Demo>

```vue
<KmBusqueda v-model="consulta.buscar" placeholder="Buscar salón" />
```

| Prop          | Tipo     | Descripción                                               |
| ------------- | -------- | --------------------------------------------------------- |
| `v-model`     | `string` | Término. La espera antes de buscar la aplica `useListado` |
| `placeholder` | `string` | También es su `aria-label`                                |

## KmExportar

<Demo>
  <KmExportar @exportar="exportar" />
</Demo>

```vue
<KmExportar :disabled="total === 0" @exportar="exportar" />
```

| Prop / evento | Tipo                                  | Descripción            |
| ------------- | ------------------------------------- | ---------------------- |
| `disabled`    | `boolean`                             | Sin datos que exportar |
| `@exportar`   | `(formato: 'csv' \| 'excel') => void` | Formato elegido        |

## Utilidades de exportación

`src/utils/exportar.ts` genera los archivos sin librerías:

```ts
import { exportarCsv, exportarExcel, type ColumnaExportable } from '@/utils/exportar'

const columnas: ColumnaExportable<Salon>[] = [
  { etiqueta: 'Salón', valor: (s) => s.nombre },
  { etiqueta: 'Mesas', valor: (s) => mesasDe(s.id) },
  { etiqueta: 'Activo', valor: (s) => s.activo },
]

async function exportar(formato: 'csv' | 'excel') {
  // Exporta todo lo filtrado, no solo la página visible.
  const { items } = await salonesService.consultar({ ...consulta, pagina: 1, porPagina: 10_000 })
  if (formato === 'csv') exportarCsv('salones', items, columnas)
  else exportarExcel('salones', items, columnas)
}
```

| Formato   | Detalles                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| **CSV**   | Separador `;` (el que espera Excel en es-PE), BOM UTF-8 para tildes, comillas escapadas                       |
| **Excel** | SpreadsheetML (`.xls`): números como números, cabecera en negrita. Abre en Excel, LibreOffice y Google Sheets |

El nombre del archivo lleva la fecha: `salones-2026-09-12.csv`. Los booleanos se escriben «Sí» / «No».
