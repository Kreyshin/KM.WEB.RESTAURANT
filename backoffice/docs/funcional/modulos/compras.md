# Compras

Cómo llega lo que se consume. El circuito cruza la frontera con el ERP dos veces, y conviene saber dónde.

## El circuito

| Paso                            | Dónde ocurre           | En qué unidad       |
| ------------------------------- | ---------------------- | ------------------- |
| 1. Solicitud de compra          | Aquí, por área         | **Insumos**         |
| 2. Requerimiento de compra      | Aquí, por local        | **Artículos**       |
| 3. Aprobación y orden de compra | **ERP**                | Artículos           |
| 4. Despacho del proveedor       | ERP o el proveedor     | Artículos           |
| 5. Recepción                    | Aquí, e informa al ERP | Artículos → insumos |

## Solicitudes

Lo que pide cada área, **en insumos**: la barra pide limones, no cajas.

Puede indicarse una marca preferida, pero solo entre las marcas de los artículos que abastecen ese insumo.

Estados: borrador → enviada → atendida o rechazada.

## Requerimientos

Lo que el local envía al ERP. Consolida solicitudes o se crea directo, y **traduce insumos a artículos** con la regla de abastecimiento.

El sistema **sugiere el proveedor** según la configuración y el historial. Ajustar cantidades al consolidar requiere permiso: es donde se cuela el pedido que nadie pidió.

Estados: borrador → enviado → aprobado → convertido → despachado → recepcionado. Se anula solo mientras nadie lo haya tomado ni aprobado.

Dos cosas que el requerimiento muestra y suelen faltar en otros sistemas:

- El **número de la orden de compra** que lo atendió, y si la conversión fue total o parcial **por línea**.
- La **línea no disponible**, con alerta y reemplazo por un artículo alterno.

## Recepción

Lo que de verdad llega. Dos modos, y la elección es de toda la orden:

| Modo          | Cómo funciona                                           |
| ------------- | ------------------------------------------------------- |
| **Total**     | Todo o nada. Se acepta completa o se rechaza con motivo |
| **A detalle** | Se cuenta línea por línea. Admite recibir menos         |

En ambos se registran lote, vencimiento, ubicación y serie cuando el insumo los pide.

Al recibir pasan dos cosas automáticamente:

- **Conversión directa** — una caja de 12 entra como 12 unidades.
- **Por procesar** — lo que necesita transformación queda apartado hasta que alguien la registre.

## Ingreso sin orden de compra

Para la compra de emergencia o de mercado. Se permite si la configuración lo admite, con controles combinables: comprobante obligatorio, tope por ingreso o por día, motivo obligatorio.

**El stock entra de inmediato** —la cocina no puede esperar—, pero el ingreso queda **pendiente de regularizar** hasta que administración lo valide.

## Artículos, proveedores y marcas

Se consultan, no se editan: son del ERP. Aparecen marcados como sincronizados.
