# Componentes

Componentes base del back office, en `src/components/ui/`. Todas las demos de esta sección usan **los componentes reales**: lo que ves es lo que se ve en la app. Cambia el tema arriba a la derecha para revisarlos en oscuro.

Se importan uno a uno:

```ts
import KmButton from '@/components/ui/KmButton.vue'
```

## Catálogo

| Componente                            | Para qué                                         | Página                                           |
| ------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `KmTable`                             | Tabla con orden, estados de carga, vacío y error | [Tabla](./tabla)                                 |
| `KmPaginacion`                        | Paginación con tamaño de página                  | [Tabla](./tabla)                                 |
| `KmTabs`                              | Pestañas accesibles con contador                 | [Tabs](./tabs)                                   |
| `KmDrawer`                            | Panel lateral de edición                         | [Drawer](./drawer)                               |
| `KmModal`                             | Diálogo centrado                                 | [Modal](./modal)                                 |
| `KmConfirm`                           | Confirmación de acciones                         | [Modal](./modal)                                 |
| `KmFecha`                             | Fecha suelta, editable a mano                    | [Fechas](./fechas)                               |
| `KmRangoFechas`                       | Rango con atajos                                 | [Fechas](./fechas)                               |
| `KmField`                             | Etiqueta, ayuda y error de un campo              | [Formularios](./formularios)                     |
| `KmInput`                             | Campo de texto y número                          | [Formularios](./formularios)                     |
| `KmNumero`                            | Cantidades, porcentajes y soles                  | [Formularios](./formularios#kmnumero)            |
| `KmSelect`                            | Lista desplegable                                | [Formularios](./formularios)                     |
| `KmSwitch`                            | Interruptor sí/no con etiqueta                   | [Formularios](./formularios#kmswitch)            |
| `KmCatalogo`                          | Pantalla de mantenimiento completa               | [KmCatalogo](./catalogo)                         |
| `KmBotonIcono`                        | Acción de fila con icono y tooltip               | [KmCatalogo](./catalogo#acciones-de-fila)        |
| `KmConfirmarEstado` · `KmCampoEstado` | Cambio de estado con confirmación                | [KmCatalogo](./catalogo#cambio-de-estado)        |
| `KmButton`                            | Botón con variantes, tamaños y carga             | [Botones](./botones)                             |
| `KmBadge`                             | Insignia de estado                               | [Botones](./botones)                             |
| `KmCard`                              | Tarjeta con cabecera y acciones                  | [Botones](./botones)                             |
| `KmUploadImagen`                      | Carga y reducción de imágenes                    | [Imagen](./imagen)                               |
| `KmEstado`                            | Estados vacío, cargando y error                  | [Estados](./estados)                             |
| `KmBusqueda`                          | Campo de búsqueda                                | [Búsqueda y exportación](./busqueda-exportacion) |
| `KmExportar`                          | Menú para exportar a Excel o CSV                 | [Búsqueda y exportación](./busqueda-exportacion) |
| `KmToaster`                           | Avisos (se monta una vez en `App.vue`)           | [Botones](./botones#avisos)                      |

## Principios

- **Props tipadas y `v-model`** para todo lo editable.
- **Accesibles**: roles ARIA, navegación por teclado y foco visible.
- **Sin colores fijos**: todo sale de los tokens, así que funcionan en ambos temas.
- **Textos en español** y desde el lado del usuario.
