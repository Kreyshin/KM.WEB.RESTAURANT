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

## Movimiento

Un control que cambia de estado tiene que **contestar antes de que el dedo se levante**. Por debajo de unos 120 ms la respuesta se siente instantánea; por encima de 250 ms, lenta. Por eso hay tres duraciones, no una:

| Token             | Valor   | Para qué                                                   |
| ----------------- | ------- | ---------------------------------------------------------- |
| `--km-mov-rapido` | `110ms` | La respuesta al dedo: hover, hundido, color de un check    |
| `--km-mov-normal` | `180ms` | El cambio de estado en sí: el trazo de una marca, un panel |
| `--km-mov-lento`  | `280ms` | Lo que entra o sale de pantalla                            |
| `--km-curva`      | —       | `ease-out`: sale rápido y frena. Nunca `linear`            |
| `--km-rebote`     | —       | Con sobrepaso. Solo para lo que **aparece**, nunca colores |

### Dos reglas

**Lo que cambia de estado se dibuja, no se enciende.** Un check que pasa de transparente a blanco cambia sin que el ojo vea el gesto: parece que la pantalla se repintó. Trazando la línea —`stroke-dashoffset`— el control contesta al dedo y se entiende qué acaba de pasar.

**Quien pide menos movimiento no pide un poco menos: pide ninguno.** Las tres duraciones se ponen a `0ms` en la raíz bajo `prefers-reduced-motion`, así que ningún componente tiene que acordarse.

## Cargar no es refrescar

::: warning El error que se siente como recargar la página
El patrón de siempre —`cargando = true` y esconder el contenido— está bien la primera vez, cuando no hay nada que enseñar. Repetirlo tras cada acción hace desaparecer y volver la pantalla entera: se pierde el scroll, parpadea el layout, y aprobar una línea de S/ 38 se siente como recargar la página, aunque el dato tarde 200 ms.
:::

`useCarga()` separa los dos casos:

- **`cargando`** solo es cierto mientras no hay nada en pantalla. Ahí sí toca el mensaje de carga.
- **`refrescando`** se levanta en las veces siguientes. La vista lo usa para atenuar lo que ya está —clase `rs-refrescando`— **sin desmontarlo**. Nada cambia de sitio, así que el ojo no pierde la línea que estaba leyendo.

```ts
const { cargando, refrescando, iniciar, terminar } = useCarga()

async function cargar() {
  iniciar()
  try {
    datos.value = await servicio.listar()
  } finally {
    terminar()
  }
}
```

Y en la plantilla se atenúan **los datos, no los mandos**: quien acaba de pulsar un botón sigue pudiendo escribir en el buscador mientras llega la respuesta.

## Una acción no recarga: sustituye

`useCarga` arregla el parpadeo, pero no el problema de fondo. Si después de aprobar **una línea** la pantalla vuelve a pedir **la orden entera**, se sigue repintando todo por cambiar un campo. Atenuado o no, se lee como una recarga.

### La mutación devuelve el estado nuevo

Un servicio que contesta «hecho» obliga a quien llamó a volver a preguntar por lo que él mismo acaba de provocar: dos viajes y un repintado completo. Devolviendo la entidad **ya resuelta**, la vista sustituye lo que tiene y Vue repinta solo lo que cambió de verdad.

```ts
// Antes: dos viajes y la pantalla entera se rehace.
await ordenesService.alternarItem(id, itemId)
await cargar()

// Ahora: un viaje, y solo cambia lo que cambió.
orden.value = await ordenesService.alternarItem(id, itemId)
```

En un listado es lo mismo, sustituyendo el elemento dentro del array:

```ts
function sustituir(actualizada: OrdenResuelta) {
  const i = ordenes.value.findIndex((o) => o.id === actualizada.id)
  if (i >= 0) ordenes.value[i] = actualizada
}
```

### La ocupación es de la fila, no de la pantalla

Un único `trabajando` global apaga todos los botones por tocar uno. Se guarda **qué** está esperando respuesta:

```ts
const lineaOcupada = ref<string | null>(null)
```

Y esa fila se marca con el filo, no atenuándola: atenuar dice _«esto ya no vale»_; el filo dice _«estoy en ello»_, y el resto de la pantalla sigue viva.

### Lo que se mueve, se mueve

Una lista que cambia de tamaño sin transición salta de golpe, y un salto se lee como un repintado. `TransitionGroup` con su clase `-move` da el FLIP: lo que se va se encoge, lo que se queda **se desliza** a su sitio nuevo.

```vue
<TransitionGroup tag="ul" name="rs-linea">
  <li v-for="item in items" :key="item.id" class="rs-linea">…</li>
</TransitionGroup>
```

Dos detalles que marcan la diferencia: el elemento que sale se saca del flujo (`position: absolute` en `-leave-active`) para que los de abajo empiecen a subir ya, y **salir dura menos que entrar** — nadie quiere esperar a que se vaya algo que ya cerró.

::: tip Cómo se comprueba
Con el navegador abierto, marcar las filas antes de la acción y contar cuántas sobreviven:

```js
document.querySelectorAll('.rs-linea').forEach((el, i) => (el.dataset.testigo = 'f' + i))
// …acción…
;[...document.querySelectorAll('.rs-linea')].filter((el) => el.dataset.testigo).length
```

Si el número baja, se están recreando filas que no cambiaron.
:::

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
