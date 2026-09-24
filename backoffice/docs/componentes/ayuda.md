# KmAyuda

Ayuda contextual junto a un título.

Existe para sacar de la pantalla los párrafos que explican cómo funciona algo. Esa explicación hace falta la primera vez y estorba las cien siguientes: dejarla fija empuja hacia abajo el contenido de verdad, y quitarla deja al usuario sin contexto.

```vue
<header class="flex items-center gap-2">
  <h2 class="rs-titulo-pagina text-tinta">Configuración</h2>
  <KmAyuda titulo="Cómo funciona esta pantalla">
    <p>Las reglas con las que trabaja <strong>toda la cadena</strong>.</p>
    <p>Los cambios se acumulan y se guardan al final.</p>
  </KmAyuda>
</header>
```

## Props

| Prop       | Tipo           | Por defecto         | Qué hace                                    |
| ---------- | -------------- | ------------------- | ------------------------------------------- |
| `titulo`   | `string`       | —                   | Encabezado del panel                        |
| `etiqueta` | `string`       | `'Más información'` | Nombre accesible del botón                  |
| `ancho`    | `'sm' \| 'md'` | `'md'`              | 20 rem o 26 rem, ambos acotados al viewport |

El contenido va en el slot por defecto: párrafos, listas, lo que haga falta. El `<strong>` se tiñe con el color de tinta.

## Cómo se comporta

| Gesto            | Qué pasa                              |
| ---------------- | ------------------------------------- |
| Pasar el ratón   | Se abre                               |
| Salir            | Se cierra, salvo que esté fijado      |
| Pulsar           | **Lo fija**: se queda abierto         |
| `Escape`         | Lo cierra y devuelve el foco al botón |
| Pulsar fuera     | Lo cierra si estaba fijado            |
| Tabular hasta él | Se abre igual que al pasar el ratón   |

::: tip Por qué se fija al pulsar
Un panel que se cierra al mover el ratón no se puede leer con calma, ni existe en una tablet. Abrir al pasar es cómodo; fijar al pulsar es lo que lo hace usable de verdad.
:::

## Detalles

- Se teletransporta a `<body>` con posición fija, así que no lo recorta ningún contenedor con `overflow` ni genera scroll dentro de una tarjeta.
- Se recoloca al hacer scroll y al cambiar el tamaño de la ventana.
- No se sale de la ventana: se corrige la posición horizontal contra los bordes.
- El botón lleva `aria-expanded` y `aria-controls`; el panel, `role="note"`.
- La animación de entrada se detiene con `prefers-reduced-motion`.

## Cuándo NO usarlo

Si la información es necesaria **cada vez** que se usa la pantalla, no es ayuda contextual: va en la pantalla. `KmAyuda` es para lo que se lee una vez y se recuerda.

Para el texto corto de un campo está `KmField` con su `ayuda`, y para el nombre de un botón de icono, el tooltip que ya trae `KmBotonIcono`.
