# Inventario y recetas

El módulo más grande, y el que sostiene el margen.

## Insumos

Lo que usan cocina y barra, en su unidad de uso. Cada uno con su categoría, su stock y su mínimo.

Un insumo se separa de otro **solo cuando cambia lo que se vende o cómo se usa en la receta**. Multiplicar insumos por marca o por presentación de compra es el error que convierte un inventario en algo que nadie mantiene.

## Recetas y costos

Qué lleva cada presentación y cuánto cuesta.

### Food cost

Cuánto cuestan los insumos sobre el precio de venta, en porcentaje, comparado contra un **objetivo**.

El objetivo se hereda: empresa → cadena → local → categoría → presentación. El nivel más específico manda. Es el fin del «30 % para todo», que nunca fue cierto para una bebida y un plato marino a la vez.

### Estado del costo

Una receta puede estar **completa**, **parcial** —algún insumo sin costo— o **desactualizada**. Mostrarlo evita tomar decisiones de precio sobre una cifra que miente.

### Rendimiento

Qué parte del insumo es aprovechable. Un limón rinde el 40 % en jugo.

::: warning El costo útil se divide entre el rendimiento
No se le suma un porcentaje de merma. Si un kilo cuesta 10 y rinde el 40 %, el kilo útil cuesta **25**, no 14. Sumar el porcentaje es el error de cálculo más común del sector.
:::

### Versiones

Una receta cambia con el tiempo. Cada versión tiene su vigencia, y **cada venta guarda con qué versión y a qué costo se vendió**. Sin eso, el análisis de un mes pasado es ficción.

### Simulador de precio

Permite probar qué pasaría con otro precio —qué food cost y qué margen darían— **sin cambiar nada** hasta confirmar.

## Producción

Preparar las bases: fondos, salsas, masas.

El parte de producción escala la receta a lo que de verdad se hizo, **obliga a asignar la diferencia** entre lo esperado y lo real, y crea el lote con su responsable y su vencimiento.

## Transformaciones

Cuando lo comprado no es lo usado. Diez kilos de pescado entero dan filete, cabeza y espinas, y merma.

Cada salida se define como insumo aprovechable o como merma. Al registrarla, quien la hace **confirma lo que salió de verdad** y puede mandar a merma algo que se esperaba aprovechar, con su motivo.

El costo del origen se reparte entre las salidas según su valor.

## Stock

Dos niveles, y el segundo es opcional:

- **Stock principal** — insumo por almacén. Siempre.
- **Stock detallado** — insumo por almacén, lote y ubicación. Solo para los insumos que lo necesiten.

Lote y ubicación son **independientes**: un insumo puede llevar solo lote, solo ubicación, ambos o ninguno.

## Almacén y zonas

La **zona** subdivide el almacén: cámara de frío, barra, despensa. Los movimientos entre zonas son internos; el ERP ve el total.

Aquí se decide **quién gestiona cada zona**: que el bartender maneje la barra y no la cámara.

## Parámetros de abastecimiento

Si un insumo lleva lote, si controla vencimiento, si sale por FEFO, si se bloquean los vencidos, si necesita ubicación.

Se heredan **empresa → cadena → local → almacén → categoría → insumo**, y el nivel más específico gana. Así se configura una vez para toda la carne y se ajusta solo la excepción.

## Movimientos y kardex

El histórico por insumo: qué entró, qué salió, cuándo y por qué. Es de consulta: los movimientos los generan la venta, la producción, la recepción y las mermas.
