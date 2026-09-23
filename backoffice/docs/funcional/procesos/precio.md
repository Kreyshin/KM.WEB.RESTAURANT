# El precio de un plato

De dónde sale la cifra que ve el cliente, y cómo se decide si es la correcta.

## El precio no vive en el producto

Vive en una **lista de precios por local y canal**. El mismo ceviche tiene un precio en salón y otro en Rappi, sin duplicar la carta.

## Cómo se resuelve

1. **La lista del local y el canal.** Si hay una de temporada vigente, manda ella; lo que no esté en la de temporada se toma de la base.
2. **El descuento de línea**, si lo hay, en porcentaje o monto y con su vigencia.
3. **El IGV**, según si la empresa publica precios con o sin impuesto.
4. **El recargo al consumo**, que se calcula aparte, si ese canal lo cobra.

Cada venta guarda su foto: valor, IGV y tasa del momento.

## Cómo se decide si está bien

Aquí entra el food cost.

| Concepto                   | Qué es                                         |
| -------------------------- | ---------------------------------------------- |
| Costo de la receta         | Lo que cuestan los insumos de esa presentación |
| **Food cost**              | Costo sobre precio, en porcentaje              |
| Objetivo                   | El food cost que el negocio se fija            |
| Costo variable             | Receta + consumibles del canal                 |
| **Margen de contribución** | Precio − costo variable                        |

El objetivo se hereda **empresa → cadena → local → categoría → presentación**. Un marino y una gaseosa no deberían compartir objetivo, y con la herencia no lo hacen.

### El simulador

Permite probar otro precio y ver qué food cost y qué margen darían, **sin cambiar nada** hasta confirmar.

## Un ejemplo

Ceviche personal, canal salón:

|                                  |          |
| -------------------------------- | -------- |
| Costo de receta                  | S/ 14,50 |
| Precio de lista (neto)           | S/ 42,00 |
| **Food cost**                    | 34,5 %   |
| Objetivo de la categoría Marinos | 33 %     |
| Consumibles del canal salón      | S/ 0,00  |
| **Margen de contribución**       | S/ 27,50 |

Está 1,5 puntos por encima del objetivo. Tres salidas, y la decisión es del negocio:

- **Subir el precio** a S/ 44 deja el food cost en 33 %.
- **Revisar el rendimiento** del pescado: si mejora, baja el costo sin tocar la carta.
- **Dejarlo.** Es un plato ancla que trae gente, y el margen en soles es bueno.

::: warning El porcentaje no paga las facturas
El food cost es un ratio. Un plato con 40 % y S/ 30 de margen aporta más que uno con 25 % y S/ 8. Por eso el sistema muestra siempre las dos cifras.
:::

## El caso del delivery

En una app, la comisión es **gasto**, no una rebaja del precio.

Lo correcto es subir el precio de esa lista para compensarla —de ahí las listas derivadas con porcentaje— y registrar el ingreso completo. Descontar la comisión del precio maquilla el ingreso y falsea el food cost.
