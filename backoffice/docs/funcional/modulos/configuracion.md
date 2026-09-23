# Configuración

Cómo funciona este restaurante. Lo que se toca una vez y condiciona el resto.

## Los dos alcances

| Parte                            | A quién afecta    |
| -------------------------------- | ----------------- |
| **Configuración de la vertical** | Toda la empresa   |
| **Configuración por local**      | Un local concreto |

Un local sin valor propio hereda el de arriba. Es lo que permite fijar una política para toda la cadena y ajustar solo la excepción.

## Cadenas

Locales agrupados por **concepto de negocio**: las cevicherías por un lado, las hamburgueserías por otro. Comparten carta, recetas, parámetros y objetivo de food cost.

Es opcional. Un local sin cadena hereda directo de la empresa, y quien tiene un solo restaurante no necesita crear ninguna.

::: tip Cadena no es lo mismo que sucursal
La **sucursal** es la agrupación administrativa o geográfica, y vive en el ERP. La **cadena** es el concepto de negocio, y vive aquí. Un mismo local pertenece a una de cada.
:::

## Canales de venta

Salón, para llevar, delivery propio, apps. Cada canal lleva:

- Su **modalidad de atención**, que decide qué pide la operación.
- Su **comisión**, solo en apps de delivery.
- Si cobra **recargo al consumo**.
- Sus **precios propios** en la carta.

## Áreas e impresoras

Dónde se prepara y por dónde imprime cada comanda.

Cada área recibe **todos los productos** —lo normal cuando hay una sola— o **los seleccionados** por categoría o producto. Un plato en dos áreas se comanda a las dos.

Un área puede **no recibir comandas**: recepción o almacén solo solicitan.

::: warning El producto no guarda su área
El destino se deduce de lo que recibe cada área **en ese local**. Por eso una carta compartida entre locales funciona distinto en cada uno, y por eso la ficha del producto muestra «se comanda en» por local. Si un producto no tiene área en algún local, el sistema lo avisa.
:::

## Motivos

Las razones que el personal elige al anular, descontar o invitar un plato. Algunos exigen autorización de un administrador.

Son los que hacen que la auditoría responda _por qué_ pasó algo y no solo _qué_ pasó.

## Permisos y excepciones

Los roles vienen del ERP y no se crean aquí. Lo que se decide es **qué puede hacer cada rol dentro del restaurante**, más ajustes puntuales por persona.

## Turnos y bitácora

**Turnos** — quién trabaja en cada franja.

**Bitácora** — quién hizo cada acción sensible y cuándo.
