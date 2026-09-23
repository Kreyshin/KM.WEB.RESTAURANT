# Carta y precios

Lo que se vende y a cuánto.

## Categorías y secciones

La categoría agrupa la carta: entradas, criollos, marinos, bebidas. Una **sección** puede agrupar varias categorías —«Fondos» agrupa criollos y marinos—, pero solo un nivel: no hay secciones dentro de secciones.

Cada categoría puede limitarse a ciertos locales, a ciertos canales y a una **franja horaria**: los desayunos solo existen hasta las once.

## Productos y presentaciones

El producto es el plato; la **presentación** es lo que se vende.

Un ceviche con presentación personal y fuente son dos productos vendibles, cada uno con su código, su precio y **su propia receta**. Un producto sin presentaciones tiene una implícita.

El precio de la presentación es **final**, no un recargo sobre un precio base: evita cálculos encadenados en el momento de cobrar.

## Modificadores

Lo que el cliente cambia. Se agrupan y se configura cuántos puede elegir.

| Tipo        | Efecto                                                          |
| ----------- | --------------------------------------------------------------- |
| Sin recargo | Solo ajusta la receta: «sin cebolla»                            |
| Con recargo | Es un producto vendible más, con línea propia en el comprobante |

## Alérgenos

Cada producto declara los suyos: gluten, lácteos, huevo, pescado, mariscos, frutos secos, soya, ají.

## Combos y menús

Varios productos con **una sola línea en la cuenta**. El cliente elige dentro de cada grupo; el sistema consume la receta de lo que eligió.

El precio se reparte entre los componentes de forma proporcional para el análisis de costos, pero el comprobante sigue mostrando una línea. Solo se desglosa si mezcla afectaciones tributarias distintas.

## Listas de precios

**El precio no vive en el producto.** Vive en una lista por **local y canal**.

Es lo que permite que el mismo plato cueste distinto en salón, en delivery propio y en Rappi sin duplicar la carta.

| Concepto           | Cómo funciona                                    |
| ------------------ | ------------------------------------------------ |
| Lista base         | Una por local y canal, sin vigencia              |
| De temporada       | Manda mientras rige; no puede solaparse con otra |
| Derivada           | Se calcula desde otra con un porcentaje          |
| Descuento de línea | En porcentaje o monto, con vigencia              |

Lo que está en la base y no en la de temporada, se hereda.

::: warning La comisión de una app no es una rebaja
La comisión de Rappi o PedidosYa es **gasto**, no un descuento sobre el precio. El precio del canal se sube si hay que compensarla, pero el ingreso se registra completo.
:::
