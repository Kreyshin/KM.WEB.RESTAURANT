# Conceptos base

El vocabulario del sistema. Media docena de palabras que conviene usar con el mismo significado en sala, en cocina y en administración.

## Dónde se vende

### Local

El restaurante físico, con su dirección, su horario y su código ante SUNAT. Viene del ERP.

Todo lo que ves pertenece al local activo, el que aparece arriba a la derecha.

### Cadena

Agrupación de locales **por concepto de negocio**: todas las cevicherías por un lado, las hamburgueserías por otro.

Es opcional y sirve para compartir carta, recetas y parámetros sin repetirlos local por local. Quien tiene un solo restaurante no necesita crear ninguna.

### Salón y mesa

El salón es la zona física —terraza, salón principal, barra—; la mesa, la unidad que se ocupa, con su código, su capacidad y su forma.

Dos mesas pueden **unirse** para un grupo grande: comparten cuenta mientras dure, y al separarlas cada una recupera su independencia.

### Canal y modalidad

El **canal** es por dónde entra la venta: salón, para llevar, delivery propio, Rappi. Es configurable y lleva su comisión, su recargo y sus precios.

La **modalidad** es lo que la operación necesita saber, y está cerrada a cuatro opciones porque cada una es un flujo distinto de pantalla:

| Modalidad               | Qué pide                       |
| ----------------------- | ------------------------------ |
| En mesa                 | Salón y mesa                   |
| Mostrador o para llevar | Nada más                       |
| Reparto propio          | Dirección                      |
| App de delivery         | Comisión y el pedido de la app |

### Área

Dónde se prepara y dónde imprime la comanda: cocina caliente, cocina fría, barra, postres.

El producto **no guarda** su área. Se deduce de qué recibe cada área en ese local, y por eso una misma carta funciona distinto en cada restaurante.

## Qué se vende

### Categoría y producto

La categoría agrupa la carta —entradas, fondos, bebidas—; el producto es el plato.

### Presentación

**Lo que de verdad se vende.** Un ceviche puede tener presentación personal y fuente: son dos productos vendibles con su código, su precio y **su propia receta**.

Un producto sin presentaciones tiene una implícita: no hay que inventarla.

### Modificador

Lo que el cliente pide cambiar: «sin cebolla», «extra queso».

Si no tiene recargo, solo ajusta la receta. Si lo tiene, es un producto vendible más y aparece como línea propia en el comprobante.

### Combo

Varios productos con una sola línea en la cuenta. Consume la receta de lo que el cliente eligió y reparte el precio entre los componentes para el análisis, sin que eso cambie el comprobante.

### Lista de precios

El precio no vive en el producto: vive en una **lista por local y canal**. Así el mismo ceviche cuesta una cosa en salón y otra en Rappi, sin duplicar la carta.

Una lista puede derivarse de otra con un porcentaje, y las de temporada mandan mientras rigen.

## Con qué se hace

### Artículo, insumo y producto

Los tres eslabones, y el que más confusión causa:

| Concepto     | Dueño | Qué es                                      | Unidad             |
| ------------ | ----- | ------------------------------------------- | ------------------ |
| **Artículo** | ERP   | Lo que se **compra**, con marca y proveedor | Caja, saco, kg     |
| **Insumo**   | Mesa  | Lo que usan **cocina y barra**              | kg, L, ml, unidad  |
| **Producto** | Mesa  | Lo que se **vende**                         | Plato, vaso, jarra |

Un insumo se separa de otro **solo cuando cambia lo que se vende o cómo se usa en la receta**. Si la marca del aceite da igual, hay un único insumo «aceite vegetal» abastecido por varios artículos. Si la marca es lo que se vende —Inca Kola frente a Coca-Cola—, son insumos distintos.

### Receta

Qué insumos y cuánto lleva cada presentación. De ahí salen el costo, el food cost y el descuento de stock al vender.

Incluso una bebida de reventa pasa por un insumo, con su receta 1:1, para que pueda usarse dentro de una preparación.

### Transformación

Cuando lo que se compra no es lo que se usa: 10 kg de pescado entero dan 6 kg de filete, 1,5 kg de cabeza y espinas, y merma.

Distinto de una conversión directa —una caja de 12 son 12 unidades, sin más—, que se aplica sola al recepcionar.

### Zona y ubicación

Dentro del almacén: la **zona** es la cámara de frío, la barra, la despensa; la **ubicación** es el estante concreto.

Ambas son opcionales. Un restaurante pequeño no define ninguna.
