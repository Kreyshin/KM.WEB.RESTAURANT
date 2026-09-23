# KmCatalogo

Pantalla de mantenimiento completa en un solo componente. Pensado para catálogos simples: canales, motivos, áreas, impresoras… y para consultar maestros del ERP en solo lectura.

Incluye, sin escribir nada más:

- Búsqueda, filtro de estado y filtros propios por slot
- Tabla ordenable con columna **Estado** (solo lectura) y acciones con icono de lápiz y tacho, con tooltip
- Cambio de estado dentro de la edición, con una confirmación que explica qué se ve afectado
- Paginación y exportación a Excel o CSV de todo lo filtrado
- Drawer de alta y edición con validación en cliente y errores del servicio por campo
- Confirmación de borrado y avisos de éxito o error
- Estados de carga, vacío y error

La vista solo aporta **servicio, columnas, registro vacío y formulario**. Puedes verlo funcionando en la [demo](https://kreyshin.github.io/KM.WEB.RESTAURANT/demo/#/configuracion/canales), en Configuración.

## Uso

```vue
<script setup lang="ts">
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { canalesService } from '@/services/comercial.service'
import type { CanalVenta, NuevoCanalVenta } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Canal', ordenable: true },
  { clave: 'comisionPorcentaje', etiqueta: 'Comisión', clase: 'w-28 text-right' },
]

const nuevo = (): NuevoCanalVenta => ({
  nombre: '',
  tipo: 'plataforma',
  comisionPorcentaje: 0,
  activo: true,
})

function validar(c: NuevoCanalVenta): Record<string, string> {
  return c.nombre.trim() ? {} : { nombre: 'El nombre es obligatorio.' }
}
</script>

<template>
  <KmCatalogo
    titulo="Canales de venta"
    subtitulo="Por dónde entran los pedidos."
    entidad="canal"
    :servicio="canalesService"
    :columnas="columnas"
    :nuevo="nuevo"
    :validar="validar"
    :nombre-de="(c: CanalVenta) => c.nombre"
    :exportacion="[{ etiqueta: 'Canal', valor: (c: CanalVenta) => c.nombre }]"
  >
    <template #col-comisionPorcentaje="{ fila }">{{ fila.comisionPorcentaje }} %</template>

    <template #formulario="{ borrador, errores }">
      <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
        <KmInput :id="id" v-model="borrador.nombre" :invalido="invalido" />
      </KmField>
    </template>
  </KmCatalogo>
</template>
```

## Requisitos del registro y del servicio

- Cada registro tiene `id: string` y `activo: boolean`.
- El servicio implementa `consultar`, `crear` y `actualizar`. Si además tiene `eliminar`, aparece el botón.
- Con `solo-lectura` basta `consultar`: `crear` y `actualizar` son opcionales.
- Las reglas de negocio viven en el servicio y lanzan `ApiError` con `campos`: el drawer las muestra en su campo.

## Props

| Prop                  | Tipo                                   | Descripción                                                                   |
| --------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| `titulo`, `subtitulo` | `string`                               | Cabecera de la tarjeta                                                        |
| `entidad`             | `string`                               | Singular en minúscula: textos de botones, drawer y avisos                     |
| `femenino`            | `boolean`                              | «Nueva serie», «Activa», «creada»                                             |
| `servicio`            | `ServicioCatalogo<T>`                  | `consultar`, `crear`, `actualizar`, `eliminar?`                               |
| `columnas`            | `ColumnaTabla[]`                       | Sin Estado ni acciones: se añaden solas                                       |
| `nuevo`               | `() => Omit<T, 'id'>`                  | Registro vacío para el alta                                                   |
| `nombreDe`            | `(item: T) => string`                  | Nombre en la confirmación de borrado                                          |
| `validar`             | `(borrador) => Record<string, string>` | Validación en cliente antes de llamar al servicio                             |
| `filtrosFijos`        | `Consulta['filtros']`                  | Filtro permanente; también se copia en los registros nuevos                   |
| `orden`               | `Orden`                                | Orden inicial                                                                 |
| `exportacion`         | `ColumnaExportable<T>[]`               | Activa el botón Exportar                                                      |
| `archivo`             | `string`                               | Nombre base del archivo exportado                                             |
| `anchoDrawer`         | `'sm' \| 'md' \| 'lg'`                 | Por defecto `md`                                                              |
| `sinTarjeta`          | `boolean`                              | Sin `KmCard`: para usarlo dentro de pestañas                                  |
| `consecuenciasEstado` | `(id, activar) => Promise<string[]>`   | Frases de la confirmación de estado. Normalmente de `dependenciasService`     |
| `soloLectura`         | `boolean`                              | Datos del ERP: sin alta, edición ni baja. Ver [Datos del ERP](#datos-del-erp) |

## Slots

| Slot           | Props                             | Uso                                                                                 |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| `#formulario`  | `{ borrador, errores, editando }` | Campos del drawer. `editando` permite bloquear campos inmutables                    |
| `#col-<clave>` | `{ fila }`                        | Celda personalizada                                                                 |
| `#filtros`     | `{ consulta }`                    | Selects extra junto a la búsqueda                                                   |
| `#acciones`    | —                                 | Botones extra en la cabecera                                                        |
| `#tarjeta`     | `{ fila, editar, eliminar? }`     | Activa el interruptor Tabla / Tarjetas. Ver [Vista en tarjetas](#vista-en-tarjetas) |

## Eventos y métodos

| Nombre         | Descripción                                                                    |
| -------------- | ------------------------------------------------------------------------------ |
| `@cambio`      | Tras crear, editar, activar o eliminar. Útil para refrescar datos relacionados |
| `recargar()`   | Vuelve a consultar (vía `ref`)                                                 |
| `abrirNuevo()` | Abre el drawer de alta (vía `ref`)                                             |

## Varios catálogos del mismo tipo

Para pestañas que filtran por un campo (p. ej. motivos por tipo), usa `filtrosFijos` y un `key` para crear un catálogo nuevo en cada pestaña:

```vue
<KmTabs v-model="tipo" :pestanas="pestanas">
  <KmCatalogo :key="tipo" :filtros-fijos="{ tipo }" sin-tarjeta ... />
</KmTabs>
```

## Cambio de estado

El estado no se cambia desde la tabla, donde un clic accidental afectaría a otros registros. Al editar, el formulario muestra un interruptor **Estado**; si cambia, al guardar aparece `KmConfirmarEstado` con lo que provoca:

```vue
<KmCatalogo :servicio="localesService" :consecuencias-estado="dependenciasService.local" ... />
```

Para pantallas que no usan `KmCatalogo` (salones, categorías), la misma experiencia se arma con `KmCampoEstado` en el formulario y el composable `useConfirmarEstado` en la vista.

## Acciones de fila

Las acciones usan `KmBotonIcono`: botón cuadrado de 32 px con borde e icono. El tooltip muestra solo la acción («Eliminar») y se dibuja fuera de la tabla, así nunca la recorta ni genera scroll. Con `contexto` el nombre accesible incluye el registro («Eliminar Terraza») para lectores de pantalla y pruebas.

```vue
<KmBotonIcono icono="editar" etiqueta="Editar" :contexto="fila.nombre" @click="editar(fila)" />
<KmBotonIcono
  icono="eliminar"
  tono="peligro"
  etiqueta="Eliminar"
  :contexto="fila.nombre"
  @click="eliminar(fila)"
/>
```

Iconos disponibles: `editar`, `eliminar`, `subir`, `bajar`, `ver`, `movimiento`, `recibir`, `enviar`, `anular`, `separar`.

## Datos del ERP

Los maestros que administra el ERP (artículos, proveedores, marcas, almacenes) se consultan con el mismo componente en modo `solo-lectura`:

```vue
<KmCatalogo
  titulo="Proveedores"
  entidad="proveedor"
  solo-lectura
  :servicio="proveedoresService"
  :columnas="columnas"
  :nuevo="vacio"
  :nombre-de="(p: Proveedor) => p.razonSocial"
>
  <template #formulario="{ borrador }">
    <KmField v-slot="{ id }" label="Razón social">
      <KmInput :id="id" :model-value="borrador.razonSocial" />
    </KmField>
  </template>
</KmCatalogo>
```

Qué cambia:

- La cabecera muestra `KmOrigenErp` («Sincronizado desde ERP») y no aparece el botón **Nuevo**.
- Cada fila tiene solo **Ver**. El drawer se titula «Detalle de …», avisa del origen, bloquea los campos con un `fieldset` deshabilitado, oculta los asteriscos de obligatorio y solo ofrece **Cerrar**.
- Siguen la búsqueda, los filtros, la paginación y la exportación.

`KmOrigenErp` también se usa suelto: `<KmOrigenErp />` es la insignia y `<KmOrigenErp detalle>` el aviso con texto (acepta un slot para explicar qué sí se decide en la vertical).

## Vista en tarjetas

Si la vista define el slot `#tarjeta`, aparece `KmCambioVista` (Tabla / Tarjetas) junto a los filtros. La elección se recuerda por entidad en el navegador.

```vue
<KmCatalogo entidad="combo" ...>
  <template #tarjeta="{ fila, editar, eliminar }">
    <KmTarjetaPlato
      ancha
      :nombre="fila.nombre"
      :imagen="fila.imagen"
      :precio="formatearSoles(fila.precio)"
      :cinta="fila.activo ? undefined : 'Inactivo'"
      :eliminable="!!eliminar"
      @editar="editar"
      @eliminar="eliminar?.()"
    />
  </template>
</KmCatalogo>
```

| Prop de `KmTarjetaPlato` | Tipo      | Descripción                                     |
| ------------------------ | --------- | ----------------------------------------------- |
| `nombre`, `precio`       | `string`  | Texto principal y precio ya formateado          |
| `imagen`                 | `string`  | Foto o ilustración                              |
| `antesPrecio`            | `string`  | «desde» cuando hay presentaciones               |
| `detalle`                | `string`  | Línea secundaria (categoría, partes del combo)  |
| `marca`                  | `string`  | Etiqueta sobre la imagen (tiempo, tipo)         |
| `cinta`                  | `string`  | Apaga la tarjeta y muestra la cinta («Agotado») |
| `ancha`                  | `boolean` | Imagen 16:9 para combos                         |
| `eliminable`             | `boolean` | Muestra el botón de eliminar                    |

Emite `editar` y `eliminar`. Fuera de `KmCatalogo` (como en la Carta) se usa `<KmCambioVista v-model="vista" clave="producto" />` y la cuadrícula en la propia vista.
