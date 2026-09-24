# Sistema de diseño

**Mesa** toma su lenguaje del comedor: verde profundo de mantel y latón de barra sobre marfil. Los tokens viven en `src/assets/main.css` como variables `--rs-*` y se exponen a Tailwind como utilidades.

## Color

| Token                      | Utilidad Tailwind           | Uso                                        |
| -------------------------- | --------------------------- | ------------------------------------------ |
| `--rs-primary`             | `text-verde`, `bg-verde`    | Acción, disponible, identidad              |
| `--rs-accion`              | `bg-accion`                 | Fondo de botones primarios                 |
| `--rs-laton-500`           | `bg-laton`, `border-laton`  | Acento: foco, pestaña activa, «hoy»        |
| `--rs-laton-texto`         | `text-laton-texto`          | Latón legible como texto (AA)              |
| `--rs-vino`                | `text-vino`, `bg-vino`      | Error, agotado, peligro                    |
| `--rs-pizarra`             | `text-pizarra`              | Estado informativo                         |
| `--rs-bg`                  | `bg-lienzo`                 | Fondo del área de trabajo                  |
| `--rs-surface`             | `bg-panel`                  | Tarjetas y paneles                         |
| `--rs-surface-2`           | `bg-panel-2`                | Superficie secundaria                      |
| `--rs-text` / `--rs-muted` | `text-tinta` / `text-tenue` | Texto principal y secundario               |
| `--rs-border`              | `border-linea`              | Bordes                                     |
| `--rs-rail`                | `bg-rail`                   | Barra principal, elementos activos oscuros |

Los contrastes están medidos para cumplir **WCAG AA** en ambos temas. El tema se cambia con `data-theme="dark"` en `<html>`; los tokens se redefinen y los componentes no cambian.

## Tipografía

| Clase               | Fuente                 | Uso                           |
| ------------------- | ---------------------- | ----------------------------- |
| `rs-titulo-pagina`  | Fraunces 30 px         | Título de la pantalla         |
| `rs-titulo-seccion` | Fraunces 18 px         | Título de tarjeta o modal     |
| `rs-cifra`          | Fraunces 34 px tabular | Indicadores del dashboard     |
| `rs-etiqueta`       | Inter 10 px versalita  | Cabeceras de tabla, etiquetas |
| —                   | Inter 14 px            | Texto, formularios, tablas    |

La serif se reserva para títulos y cifras; formularios y tablas siempre en sans.

## Forma

| Token                  | Valor | Uso                       |
| ---------------------- | ----- | ------------------------- |
| `rounded-control`      | 8 px  | Botones, campos           |
| `rounded-card`         | 14 px | Tarjetas                  |
| `rounded-overlay`      | 20 px | Modales                   |
| `--rs-sombra-flotante` | —     | Menús, drawers y popovers |

## Tonos de estado

`KmBadge` y los estados usan `rs-tono-*`, que mezclan el color con la superficie activa (`color-mix`) para servir en claro y oscuro con un solo token: `verde`, `laton`, `vino`, `pizarra`, `neutro`.

## Postura

El tamaño de un control no es una constante del kit: lo pone **el cuerpo que usa la pantalla**.

Hasta aquí todas las verticales Karma asumían el mismo: alguien sentado, con ratón, a 60 cm. No es cierto en ninguna de las tres. Quien usa el pase de un restaurante está de pie con una mano ocupada; quien rellena una hoja de ingreso lo hace con guantes sobre una tablet; quien mira un rack de hotel está sentado y quiere ver dos semanas de golpe.

### El mecanismo

Cuatro variables CSS, con valor por defecto. Fuera del modo operación **nada cambia**: quien edita la carta o cuadra una compra sigue sentado en la oficina, igual en las tres verticales.

| Variable     | Qué dimensiona                         | Por defecto |
| ------------ | -------------------------------------- | ----------- |
| `--km-toque` | Alto mínimo de botón, campo y select   | `2.5rem`    |
| `--km-texto` | Texto de controles y tablas            | `0.875rem`  |
| `--km-fila`  | Relleno vertical de fila en `KmTable`  | `0.875rem`  |
| `--km-celda` | Alto de fila en las rejillas de tiempo | —           |

El kit las consume con fallback (`min-h-[var(--km-toque,2.5rem)]`), así que un componente fuera de una zona de operación se comporta exactamente como antes.

### Activarlo

Se pone la clase de postura de la vertical en la raíz de la pantalla:

```vue
<div class="rs-operacion flex flex-col gap-4">
```

### Los tres perfiles

| Vertical        | Cuerpo                                    | Toque | Texto |
| --------------- | ----------------------------------------- | ----- | ----- |
| **Restaurante** | De pie, una mano, el pase a metro y medio | 52 px | 16 px |
| **Hotel**       | Sentada, ratón, muchas filas a la vez     | 36 px | 13 px |
| **Taller**      | De pie en la bahía, con guantes           | 48 px | 15 px |

::: tip No es «hacerlo todo más grande»
Hotel va en la dirección contraria: **aprieta**. En un mostrador, ver una noche más vale más que un botón más gordo, y el dedo no es ahí el instrumento. Los 36 px siguen muy por encima del mínimo de objetivo táctil.
:::

### Qué queda fuera

`KmButton` con `tamano="sm"` no escala: es el botón de una fila de tabla, no un objetivo táctil. Si una acción se va a pulsar con guantes, no debe ser `sm` — en el tablero de bahías ese fue exactamente el error que el perfil sacó a la luz.
