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
