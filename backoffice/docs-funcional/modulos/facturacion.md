# Facturación

Lo que la caja cobra y lo que el cliente se lleva no son el mismo documento. La caja cierra la
cuenta con una **nota de venta**; aquí se convierte en boleta o factura, se manda y, si hace falta,
se corrige.

::: warning El envío es simulado
Todavía no hay integración con un OSE ni con SUNAT. Los estados, los códigos de rechazo y las
constancias son de mentira, pero son **los mismos** que tendrá el envío real: cuando se enchufe el
servicio, la pantalla y las reglas ya están hechas.
:::

## Boleta o factura

Lo decide el receptor, no el cajero:

- **Factura**: RUC válido, razón social y dirección fiscal. Sin eso no se emite, porque sin eso no
  la acepta nadie.
- **Boleta**: admite DNI, y lo **exige** por encima del importe que el local configure —700 soles
  por defecto, que es lo que pide SUNAT—. Por debajo, boleta simple.

El comprobante guarda su foto: serie, número, receptor, valor de venta, IGV, recargo y total tal
como se cobraron. Si mañana cambia la carta o la tasa del IGV, el comprobante emitido no se mueve.

Cada local puede emitir **al cobrar** —lo normal— o dejarlo para después. Si al cobrar no se puede
emitir, porque falta el documento del cliente, la venta no se pierde: queda en la pestaña **Sin
comprobante**, que es la cola de trabajo de la pantalla.

## Los estados del envío

`Por enviar` → `Enviado` → `Aceptado`, `Rechazado` u `Observado`.

Un rechazo guarda su código y su mensaje —«el número de RUC no existe»—, se corrigen los datos y se
reintenta; la pantalla cuenta los intentos, porque un comprobante que lleva cinco es un problema que
alguien debe mirar. Un aceptado ya no se toca.

## Anular es emitir otro documento

Nunca se borra nada. Sobre un comprobante aceptado se emite una **nota de crédito** con su motivo
—anulación, devolución, descuento, error en la descripción, error en el RUC—.

- **Total:** devuelve la venta entera, la deja anulada y regresa al almacén lo que se consumió.
- **Parcial:** rebaja solo el importe indicado y la venta sigue en pie.

Emitir y anular son **permisos distintos**: el cajero emite todo el día; quien anula una venta ya
aceptada suele ser otra persona.

## Lo que todavía no hace

Envío real al OSE, resumen diario de boletas, comunicación de baja y notas de débito.
