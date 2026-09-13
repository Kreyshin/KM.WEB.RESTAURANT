# Entidades del dominio

Estas entidades salen de `src/types/index.ts` y son la base para diseñar la base de datos. Se amplían en cada fase del [roadmap](./roadmap).

Convenciones del contrato:

- `id` lo asigna el servidor. Los payloads de creación son `NuevoX = Omit<X, 'id'>`.
- Fechas en **ISO 8601**; fechas sin hora en `YYYY-MM-DD`.
- Importes en **soles (PEN)** como número con dos decimales.

## Mapa de relaciones

```text
Empresa (única) · ConfigImpuestos (única) ─* CanalVenta
Local 1──* SerieComprobante
      1──* Impresora 1──* EstacionProduccion *──1 Local
MedioPago · Motivo (anulación, descuento, cortesía)
Salon 1──* Mesa *──0..1 Usuario (mesero)
Categoria 1──* Producto 1──* Variante
                        1──* GrupoModificador 1──* Modificador
                        1──0..1 Receta 1──* IngredienteReceta *──1 Insumo
Insumo 1──* Movimiento *──1 Usuario
```

## Empresa y configuración

### Empresa

Registro único por cuenta.

| Campo               | Tipo    | Notas                                                          |
| ------------------- | ------- | -------------------------------------------------------------- |
| `ruc`               | string  | 11 dígitos, prefijo 10/15/17/20 y dígito verificador módulo 11 |
| `razonSocial`       | string  |                                                                |
| `nombreComercial`   | string  | El que ve el cliente                                           |
| `direccionFiscal`   | string  |                                                                |
| `telefono`, `email` | string? | Correo de facturación                                          |
| `logo`              | string? | Data URL en mock; URL con backend                              |
| `moneda`            | `'PEN'` |                                                                |
| `zonaHoraria`       | string  | `America/Lima`                                                 |

### Local

| Campo                   | Tipo           | Notas                                                                           |
| ----------------------- | -------------- | ------------------------------------------------------------------------------- |
| `id`                    | string         |                                                                                 |
| `nombre`                | string         | Único                                                                           |
| `direccion`, `distrito` | string         |                                                                                 |
| `telefono`              | string?        |                                                                                 |
| `codigoEstablecimiento` | string         | 4 dígitos, único. `0000` = domicilio fiscal                                     |
| `horario`               | `HorarioDia[]` | 7 días: `dia` (0 lunes … 6 domingo), `abierto`, `apertura`, `cierre` en `HH:mm` |
| `activo`                | boolean        | Debe quedar al menos uno activo                                                 |

Reglas: si `cierre` es menor que `apertura`, el turno cruza la medianoche. No se elimina un local con series, estaciones o impresoras.

### ConfigImpuestos

Registro único por cuenta.

| Campo                      | Tipo     | Notas                                               |
| -------------------------- | -------- | --------------------------------------------------- |
| `igvPorcentaje`            | number   | 0–30. 18 general                                    |
| `preciosIncluyenIgv`       | boolean  |                                                     |
| `recargoConsumoActivo`     | boolean  |                                                     |
| `recargoConsumoPorcentaje` | number   | Máximo 13 %                                         |
| `recargoConsumoCanales`    | string[] | → CanalVenta. Obligatorio si el recargo está activo |
| `icbperMonto`              | number   | Soles por bolsa                                     |

El recargo al consumo se calcula sobre el valor sin IGV (`utils/impuestos.ts`).

### MedioPago

| Campo                | Tipo                                                                     | Notas                           |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| `nombre`             | string                                                                   | Único                           |
| `tipo`               | `'efectivo' \| 'tarjeta' \| 'billetera' \| 'transferencia' \| 'credito'` |                                 |
| `requiereReferencia` | boolean                                                                  | Pide número de operación        |
| `comisionPorcentaje` | number                                                                   | 0–100                           |
| `orden`              | number                                                                   | Orden en caja                   |
| `activo`             | boolean                                                                  | Debe quedar al menos uno activo |

### CanalVenta

| Campo                | Tipo                                                | Notas                           |
| -------------------- | --------------------------------------------------- | ------------------------------- |
| `nombre`             | string                                              | Único                           |
| `tipo`               | `'salon' \| 'llevar' \| 'delivery' \| 'plataforma'` |                                 |
| `comisionPorcentaje` | number                                              | Comisión de la plataforma       |
| `activo`             | boolean                                             | Debe quedar al menos uno activo |

### Impresora

| Campo         | Tipo                                           | Notas                                     |
| ------------- | ---------------------------------------------- | ----------------------------------------- |
| `nombre`      | string                                         | Único por local                           |
| `localId`     | string                                         | → Local                                   |
| `uso`         | `'comandas' \| 'precuentas' \| 'comprobantes'` |                                           |
| `ancho`       | `'58mm' \| '80mm'`                             |                                           |
| `conexion`    | `'red' \| 'usb'`                               |                                           |
| `direccionIp` | string?                                        | IPv4 obligatoria si la conexión es de red |

Regla: no se elimina una impresora asignada a estaciones.

### EstacionProduccion

| Campo         | Tipo    | Notas                           |
| ------------- | ------- | ------------------------------- |
| `nombre`      | string  | Único por local                 |
| `localId`     | string  | → Local                         |
| `impresoraId` | string? | → Impresora del **mismo** local |

### Motivo

| Campo                  | Tipo                                       | Notas                                |
| ---------------------- | ------------------------------------------ | ------------------------------------ |
| `tipo`                 | `'anulacion' \| 'descuento' \| 'cortesia'` |                                      |
| `descripcion`          | string                                     | Única dentro de su tipo              |
| `requiereAutorizacion` | boolean                                    | Exige aprobación de un administrador |

### SerieComprobante

| Campo         | Tipo                                                    | Notas                                                                |
| ------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| `localId`     | string                                                  | → Local                                                              |
| `tipo`        | `'boleta' \| 'factura' \| 'notaCredito' \| 'notaVenta'` |                                                                      |
| `serie`       | string                                                  | 4 caracteres. Boleta `B…`, factura `F…`, nota de crédito `B…` o `F…` |
| `correlativo` | number                                                  | Último número emitido. Solo avanza                                   |

Reglas: la serie es única por tipo en todo el RUC. Tipo, local y serie no cambian tras crearla. Solo se elimina si nunca emitió (`correlativo = 0`). El número completo se muestra como `B001-00000123`.

## Carta: fase 3

Campos añadidos:

| Entidad   | Campo            | Tipo                      | Notas                                                                                 |
| --------- | ---------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| Mesa      | `grupoId`        | string?                   | Mesas unidas comparten grupo. Solo del mismo salón; no se separa con una mesa ocupada |
| Categoria | `disponibilidad` | `{ dias, desde, hasta }`? | Franja en que se ofrece                                                               |
| Producto  | `imagen`         | string?                   |                                                                                       |
| Producto  | `estacionId`     | string?                   | → EstacionProduccion                                                                  |
| Producto  | `preciosCanal`   | `{ canalId, precio }[]`   | Sin entrada, el canal usa el precio base                                              |

### Combo

| Campo                   | Tipo                                       | Notas                                              |
| ----------------------- | ------------------------------------------ | -------------------------------------------------- |
| `tipo`                  | `'combo' \| 'menuDia'`                     |                                                    |
| `nombre`                | string                                     | Único                                              |
| `precio`                | number                                     | Precio cerrado, mayor que 0                        |
| `grupos`                | `{ id, nombre, opciones: productoId[] }[]` | Una opción = parte fija; varias = el cliente elige |
| `dias`                  | `DiaSemana[]`                              | Vacío = todos. Obligatorio en menú del día         |
| `imagen`, `descripcion` | string?                                    |                                                    |

Un producto que forma parte de un combo no se puede eliminar.

## Inventario y compras: fase 4

### Almacen

| Campo     | Tipo    | Notas                                                         |
| --------- | ------- | ------------------------------------------------------------- |
| `nombre`  | string  | Único por local                                               |
| `localId` | string  | → Local                                                       |
| `activo`  | boolean | No se desactiva con stock dentro; no se elimina con historial |

### Insumo (ampliado)

| Campo           | Tipo                             | Notas                                                                                |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| `categoria`     | CategoriaInsumo                  | carnes, pescados, verduras, abarrotes, lácteos, bebidas, descartables, preparaciones |
| `existencias`   | `{ almacenId, cantidad }[]`      | Stock por almacén                                                                    |
| `stock`         | number                           | Suma de existencias (derivado)                                                       |
| `costoUnitario` | number                           | Promedio ponderado sin IGV; en preparaciones se calcula                              |
| `proveedorId`   | string?                          | → Proveedor habitual                                                                 |
| `preparacion`   | `{ rendimiento, ingredientes }`? | Subreceta                                                                            |

### Movimiento (ampliado)

| Campo           | Tipo           | Notas                                                                                          |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `almacenId`     | string         | → Almacen                                                                                      |
| `tipo`          | TipoMovimiento | entrada, salida, merma, ajuste, trasladoSalida, trasladoEntrada, produccion, consumoProduccion |
| `costoUnitario` | number?        | Costo de la entrada o vigente                                                                  |
| `referencia`    | string?        | OC-000041, TOMA-0008, TR-…, PR-…                                                               |

Reglas: el stock de un almacén nunca queda negativo. Traslados, producciones, tomas y recepciones se aplican como transacción: si un movimiento falla, no se guarda ninguno.

### TomaInventario

| Campo       | Tipo                                   | Notas                             |
| ----------- | -------------------------------------- | --------------------------------- |
| `numero`    | string                                 | TOMA-0008                         |
| `almacenId` | string                                 | Una sola toma abierta por almacén |
| `estado`    | `'abierta' \| 'aplicada' \| 'anulada'` |                                   |
| `lineas`    | `{ insumoId, teorico, contado }[]`     | `contado: null` = sin contar      |

Al aplicar, la diferencia con el stock actual genera `ajuste` (sobrante) o `merma` (faltante).

### Proveedor

| Campo                           | Tipo    | Notas          |
| ------------------------------- | ------- | -------------- |
| `razonSocial`                   | string  |                |
| `ruc`                           | string  | Válido y único |
| `contacto`, `telefono`, `email` | string? |                |
| `diasCredito`                   | number  | 0 = contado    |

### OrdenCompra

| Campo                          | Tipo                                                              | Notas                               |
| ------------------------------ | ----------------------------------------------------------------- | ----------------------------------- |
| `numero`                       | string                                                            | OC-000042, correlativo              |
| `proveedorId`, `almacenId`     | string                                                            | Destino de la mercadería            |
| `estado`                       | `'borrador' \| 'emitida' \| 'parcial' \| 'recibida' \| 'anulada'` |                                     |
| `fechaEmision`, `fechaEntrega` | `YYYY-MM-DD`                                                      | Entrega ≥ emisión                   |
| `lineas`                       | `{ insumoId, cantidad, costoUnitario, recibido }[]`               | Costos sin IGV; un insumo por línea |

Reglas: solo un borrador se edita o elimina; solo una orden emitida se anula; no se recibe más de lo pendiente; cada recepción crea entradas con la referencia de la orden y actualiza el costo promedio.

## Personal

### Usuario

| Campo       | Tipo                                            | Notas |
| ----------- | ----------------------------------------------- | ----- |
| `id`        | string                                          |       |
| `nombre`    | string                                          |       |
| `email`     | string                                          | Único |
| `rol`       | `'admin' \| 'cajero' \| 'mesero' \| 'cocinero'` |       |
| `activo`    | boolean                                         |       |
| `avatarUrl` | string?                                         |       |

Reglas: debe quedar al menos un **administrador activo**, y no se elimina un usuario con mesas asignadas.

## Sala

### Salon

| Campo         | Tipo    | Notas               |
| ------------- | ------- | ------------------- |
| `id`          | string  |                     |
| `nombre`      | string  | Único               |
| `descripcion` | string? |                     |
| `orden`       | number  | Orden en selectores |
| `activo`      | boolean |                     |

Regla: no se elimina un salón con mesas asignadas.

### Mesa

| Campo          | Tipo                                                              | Notas                          |
| -------------- | ----------------------------------------------------------------- | ------------------------------ |
| `id`           | string                                                            |                                |
| `salonId`      | string                                                            | → Salon                        |
| `codigo`       | string                                                            | «M-12», único dentro del salón |
| `capacidad`    | number                                                            | Personas                       |
| `forma`        | `'cuadrada' \| 'redonda' \| 'rectangular'`                        |                                |
| `estado`       | `'libre' \| 'ocupada' \| 'reservada' \| 'limpieza' \| 'inactiva'` |                                |
| `meseroId`     | string?                                                           | → Usuario                      |
| `posX`, `posY` | number                                                            | Posición en el plano, 0–100 %  |

## Carta

### Categoria

| Campo         | Tipo    | Notas |
| ------------- | ------- | ----- |
| `id`          | string  |       |
| `nombre`      | string  |       |
| `descripcion` | string? |       |
| `orden`       | number  |       |
| `activa`      | boolean |       |

### Producto

| Campo                  | Tipo                 | Notas                                                              |
| ---------------------- | -------------------- | ------------------------------------------------------------------ |
| `id`                   | string               |                                                                    |
| `categoriaId`          | string               | → Categoria                                                        |
| `nombre`               | string               |                                                                    |
| `descripcion`          | string?              |                                                                    |
| `precio`               | number               | Precio base                                                        |
| `disponible`           | boolean              | Conmutador de agotado                                              |
| `tiempoPreparacionMin` | number?              |                                                                    |
| `alergenos`            | `Alergeno[]`         | gluten, lácteos, huevo, pescado, mariscos, frutos secos, soya, ají |
| `variantes`            | `Variante[]`         |                                                                    |
| `gruposModificadores`  | `GrupoModificador[]` |                                                                    |

### Variante

Presentación alternativa (personal, fuente…). `precio` es el **precio final**, no un recargo.

| Campo    | Tipo    |
| -------- | ------- |
| `id`     | string  |
| `nombre` | string  |
| `precio` | number  |
| `activa` | boolean |

### GrupoModificador y Modificador

| Campo                     | Tipo   | Notas                               |
| ------------------------- | ------ | ----------------------------------- |
| `seleccionMinima`         | number | `1` lo vuelve obligatorio           |
| `seleccionMaxima`         | number | `1` = elección única; `>1` = extras |
| `modificadores[].nombre`  | string | «Sin cebolla»                       |
| `modificadores[].recargo` | number | `0` si no cuesta                    |

## Inventario

### Insumo

| Campo           | Tipo                                                  | Notas                           |
| --------------- | ----------------------------------------------------- | ------------------------------- |
| `id`            | string                                                |                                 |
| `nombre`        | string                                                |                                 |
| `unidad`        | `'kg' \| 'g' \| 'l' \| 'ml' \| 'unidad' \| 'paquete'` |                                 |
| `stock`         | number                                                |                                 |
| `stockMinimo`   | number                                                | Umbral de alerta                |
| `costoUnitario` | number                                                |                                 |
| `proveedor`     | string?                                               | Pasará a relación con Proveedor |
| `activo`        | boolean                                               |                                 |

### Movimiento

| Campo       | Tipo                                           | Notas              |
| ----------- | ---------------------------------------------- | ------------------ |
| `id`        | string                                         |                    |
| `insumoId`  | string                                         | → Insumo           |
| `tipo`      | `'entrada' \| 'salida' \| 'merma' \| 'ajuste'` | Determina el signo |
| `cantidad`  | number                                         | Siempre positiva   |
| `motivo`    | string?                                        |                    |
| `usuarioId` | string                                         | → Usuario          |
| `fecha`     | string                                         | ISO 8601           |

Regla: una salida o merma no puede dejar el stock en negativo, y la cantidad debe ser mayor que cero. Un insumo usado en una receta no se puede eliminar.

### Receta

| Campo                     | Tipo   | Notas                   |
| ------------------------- | ------ | ----------------------- |
| `productoId`              | string | → Producto (1 a 1)      |
| `ingredientes[].insumoId` | string | → Insumo                |
| `ingredientes[].cantidad` | number | En la unidad del insumo |
