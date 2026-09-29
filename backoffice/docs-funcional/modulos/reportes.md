# Reportes

Un reporte miente sin querer: basta sumar lo que no toca. Por eso, antes de dibujar nada, aquí se
decidió qué entra en cada cifra, y la pantalla lo dice en vez de dejarlo a la intuición.

## Lo que no cuenta

- **La venta anulada no existe.** Se muestra cuántas hubo, aparte, porque un día con muchas
  anulaciones es un dato en sí mismo, pero su importe no suma.
- **La propina no es ingreso del restaurante.** Va en su columna.
- **El recargo al consumo tampoco es venta de comida:** su destino es el personal, así que se
  reporta aparte de lo que factura la cocina.
- **La comisión de las apps es gasto, no menor venta.** Se enseña junto al canal, para que se vea
  lo que queda, sin tocar el ingreso.

## Ventas

El **ingreso neto** —sin IGV— es la cifra que manda, porque es la única comparable con el costo. Al
lado se muestra lo cobrado con impuestos, que es lo que entró en caja.

Con eso: cuentas del periodo, ticket medio, gasto por comensal, el reparto por canal y las horas en
las que se vende. La curva por hora suele ser la que más sorprende al dueño.

## Rentabilidad por plato

Unidades vendidas, ingreso neto, costo de la receta, margen y **food cost real contra el objetivo**
que le toca a ese plato —el suyo, el de su categoría o el del local, en ese orden—.

Los platos se clasifican **A, B y C** por lo que aportan al margen: los A explican el primer 80 %.
Es la lista que decide qué se promociona y qué se retira de la carta.

::: warning El costo es el de hoy, no el del día de la venta
La vertical todavía no congela el costo en cada línea vendida. Con precios de insumo movidos, el
margen histórico se desvía. Está avisado en la pantalla, y es lo primero que habrá que corregir
cuando haya datos reales.
:::

Un plato sin receta no tiene costo que mostrar: se marca como tal y **no entra en el food cost**,
en vez de fingir que cuesta cero y falsear el total.

## Consumo y mermas

Dos columnas que deberían parecerse y casi nunca lo hacen:

- **Según las recetas:** lo que las fichas dicen que se gastó en lo que se vendió.
- **Salió del almacén:** lo que de verdad se descontó del stock.

La diferencia, valorizada al costo del insumo y ordenada por lo que cuesta, es la lista de lo que
hay que explicar: merma sin registrar, porciones generosas, robo o recetas mal escritas. El reporte
la enseña; el criterio lo pone el que conoce su cocina.

Las **mermas registradas** van en su propia columna, porque esas ya tienen explicación.

## Exportar

Lo que estés mirando, en CSV o Excel, con las columnas de esa pestaña.
