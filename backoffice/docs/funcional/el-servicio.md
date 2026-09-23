# El servicio

El restaurante no trabaja por días: trabaja por **servicios**. El almuerzo y la cena son dos operaciones distintas con el mismo local en medio.

Este es el recorrido, y el orden en que el back office acompaña cada tramo.

## Antes de abrir

**Dashboard** da el estado de la sala: cuántas mesas hay libres, ocupadas, reservadas o en limpieza, y la ocupación por salón.

Es el momento de dos comprobaciones:

- **Reservas del día** — qué mesas hay que guardar y a qué hora.
- **Insumos bajo mínimo** — qué falta antes de que falte en pleno servicio.

## Durante el servicio

La toma de comanda ocurre en la caja o en la app del mesero, no aquí. Pero todo lo que esas pantallas necesitan se decidió en este back office:

- Qué productos existen y **a qué precio en este canal**.
- **A qué área** se comanda cada plato, y por tanto por qué impresora sale.
- Qué **modificadores** admite y cuáles llevan recargo.
- Qué **motivos** puede elegir quien anula o invita un plato.

En **Mesas** se ve el plano en vivo: qué está ocupado, qué está reservado y qué espera limpieza para volver a rotar.

## En la cocina

Cada comanda llega a su área. Al vender, el sistema descuenta de stock los insumos según la receta de la presentación vendida.

**Cuándo se descuenta** —al comandar o al cobrar— es una decisión del negocio, no del programa: un restaurante que anula mucho preferirá descontar al cobrar.

## Entre servicios

El hueco de la tarde es cuando se hace el trabajo que sostiene el margen:

- **Producción** — preparar las bases del día siguiente: fondos, salsas, masas. Cada parte crea su lote, con responsable y vencimiento.
- **Transformaciones** — despiezar lo que llegó entero y registrar qué salió de verdad.
- **Recepción** — recibir lo que trajo el proveedor contra la orden de compra.
- **Solicitudes** — que cada área pida lo que le falta para mañana.

## Al cierre

Cierre de caja, comprobantes y el repaso de lo que se perdió: mermas, platos fallidos y cortesías.

::: tip Dónde mira cada quien
El dueño mira el **food cost** al final de la semana; el jefe de cocina mira el **stock** antes de cada servicio; el jefe de sala mira las **mesas** durante. Es el mismo sistema con tres velocidades distintas.
:::
