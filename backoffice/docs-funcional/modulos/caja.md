# Ventas y caja

La pantalla que más se toca en todo el sistema. Lo que aquí está implantado es la **línea base
estándar**: lo que hacen igual los puntos de venta de restaurante, puesto a funcionar para poder
criticarlo con algo delante en vez de con una lista de deseos.

## La cuenta vive antes de cobrar

Se abre una cuenta y se le van añadiendo productos. No hay «venta» hasta el cobro: hay una cuenta
abierta, que ocupa su mesa y se cierra cuando la gente se va.

La modalidad —en mesa, mostrador, para llevar, delivery— sale del canal, no se elige aparte. Una
mesa no admite dos cuentas abiertas a la vez; el delivery pide el distrito, porque de ahí sale la
zona de reparto, el envío y el tiempo prometido.

## Pendiente y comandado no son lo mismo

Cada producto de la cuenta tiene su estado:

- **Sin comandar:** se teclea y todavía no salió a cocina. Quitarlo no cuesta nada.
- **En cocina:** ya se comandó. Quitarlo es **anular**, y anular pide motivo, permiso y queda en la
  bitácora con el nombre de quien lo hizo.

Esa distinción es la diferencia entre un punto de venta y un bloc de notas: cuando el plato salió,
el insumo ya se gastó, y el sistema tiene que poder decir quién decidió que no se cobrara.

## Comandar es por área, no por cuenta

Al enviar, lo pendiente se reparte entre las áreas que preparan cada cosa —cebichería, cocina
caliente, barra— según la configuración de comandas, y cada área recibe su comanda con su propio
número. Si algún producto no tiene área que lo prepare, no se comanda nada: se avisa cuál es, para
arreglar la configuración en vez de dejar a medias el pedido.

## La cuenta que ve el cliente

El orden del cálculo importa, y es donde se equivocan muchos sistemas:

1. **Consumo:** lo pedido a su precio de lista.
2. **Promociones:** lo que corresponda, con su explicación (2×1, cupón, envío gratis…).
3. **Recargo al consumo:** sobre el consumo **ya rebajado**, nunca sobre el envío.
4. **Envío:** el de la zona de reparto, si es delivery propio.

El IGV se desglosa del total. La precuenta se puede mirar cuantas veces haga falta: no es el
comprobante, y hasta el cobro todavía se puede añadir, dividir o mover de mesa.

## Dividir y mover

Son gestos de sala, no operaciones de contabilidad. La cuenta se parte por líneas enteras en una
cuenta hija que se cobra aparte, y un pedido se mueve de mesa sin perder su historia ni sus
comandas.

## Cobrar

Varios medios de pago en la misma cuenta, con la propina sugerida que el local configure —y que el
cliente manda—. Los medios que piden número de operación lo exigen, y **solo el efectivo da
vuelto**: una tarjeta se cobra por el importe exacto.

Se emite **nota de venta**. La boleta y la factura electrónica llegan con Facturación.

::: warning Anular no es borrar
Una venta anulada sigue existiendo, con su motivo y su responsable. Lo que desaparece sin dejar
rastro no se puede explicar en una auditoría ni en una discusión con el dueño.
:::

## La caja del turno

Se abre con un fondo —el sencillo del arranque— y se cierra contando. Mientras está abierta, la
pantalla muestra lo vendido, las propinas, lo cobrado por cada medio y **el efectivo que debería
haber**: fondo, más lo cobrado en efectivo, menos los vueltos.

El cierre es **a ciegas**: quien cuenta no ve lo esperado hasta haber contado. Si lo ve antes, el
arqueo deja de medir nada. La diferencia se guarda tal cual, cuadre o no.

Sin caja abierta no se cobra, salvo que el local desactive esa exigencia.

## Lo que se vende sale del almacén

Cuando se vende un plato, su receta se descuenta del stock. **Cuándo** lo decide cada local: al
comandar, que es cuando la cocina lo toca de verdad, o al cobrar, que es cuando la venta existe. Y
se puede apagar: el restaurante que mide su stock a ojo no quiere que la caja dependa del
inventario.

Antes de cobrar, el panel enseña qué va a salir y avisa de los productos que no tienen receta, que
no descuentan nada.

::: warning La venta no se bloquea por falta de stock
Si el almacén dice que no queda pescado y la cocina acaba de servirlo, se descuenta lo que hay, el
faltante queda anotado en la bitácora y la venta se cobra. Un cliente esperando no es el momento de
cuadrar el inventario.
:::

Lo anulado vuelve: tanto un producto retirado de la cuenta como una venta entera devuelven sus
insumos al almacén, con su propio movimiento.

## Lo que todavía no hace

Para no fingir que funciona: no manda la comanda a una pantalla de cocina en tiempo real, no
calcula el impuesto a las bolsas y no emite comprobantes electrónicos.
