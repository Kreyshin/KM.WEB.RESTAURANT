# Entidades del dominio

Estas entidades salen de `src/types/index.ts` y son la base para diseñar la base de datos. Se amplían en cada fase del [roadmap](./roadmap).

La vertical de restaurante depende de un **ERP** ([D-005](./decisiones)). Cada entidad indica su origen:

- **ERP**: llega sincronizada y aquí solo se consulta.
- **Vertical**: la administra el restaurante.

Convenciones del contrato:

- `id` lo asigna el servidor. Los payloads de creación son `NuevoX = Omit<X, 'id'>`.
- Fechas en **ISO 8601**; fechas sin hora en `YYYY-MM-DD`.
- Importes en **soles (PEN)** como número con dos decimales.

## Mapa de relaciones

```text
ERP ─────────────────────────────────────────────────────────────────────
Local 1──* Almacen            Usuario *──* Local (localIds)
Proveedor 1──* Articulo *──0..1 Marca

Vertical ────────────────────────────────────────────────────────────────
Local 1──* Salon 1──* Mesa *──0..1 Usuario (mesero)
Local 1──* Area *──0..1 Salon
           Area *──0..1 Impresora *──1 Local
           Area ──comanda──> Categoria · Producto
Categoria 1──* Producto 1──* Variante · GrupoModificador 1──* Modificador
Producto 1──0..1 Receta 1──* IngredienteReceta *──1 Insumo
Insumo 1──* Existencia *──1 Almacen
Insumo 1──* Movimiento *──1 Almacen · Usuario
Combo 1──* GrupoCombo ──opciones──> Producto
CanalVenta · Motivo · DefinicionParametro · PermisoVertical
```

## Maestros del ERP

Se muestran con «Sincronizado desde ERP». No tienen alta, edición ni baja en la vertical.

### Local

| Campo                   | Tipo           | Notas                                                                           |
| ----------------------- | -------------- | ------------------------------------------------------------------------------- |
| `nombre`                | string         | Único                                                                           |
| `direccion`, `distrito` | string         |                                                                                 |
| `codigoEstablecimiento` | string         | 4 dígitos SUNAT. `0000` = domicilio fiscal                                      |
| `horario`               | `HorarioDia[]` | 7 días: `dia` (0 lunes … 6 domingo), `abierto`, `apertura`, `cierre` en `HH:mm` |
| `activo`                | boolean        |                                                                                 |

Empresa, impuestos (`ConfigImpuestos`), medios de pago y series de comprobantes también vienen del ERP. La vertical los usa internamente (por ejemplo, para calcular un ticket) pero no los muestra ([D-006](./decisiones)).

### Almacen

| Campo         | Tipo    | Notas   |
| ------------- | ------- | ------- |
| `nombre`      | string  |         |
| `localId`     | string  | → Local |
| `descripcion` | string? |         |
| `activo`      | boolean |         |

### Proveedor

Maestro **global** de la cadena.

| Campo                           | Tipo    | Notas                      |
| ------------------------------- | ------- | -------------------------- |
| `razonSocial`                   | string  |                            |
| `ruc`                           | string  | 11 dígitos con verificador |
| `contacto`, `telefono`, `email` | string? |                            |
| `diasCredito`                   | number  | 0 = contado                |
| `activo`                        | boolean |                            |

### Marca

| Campo    | Tipo    |
| -------- | ------- |
| `nombre` | string  |
| `activo` | boolean |

### Articulo

Lo que el ERP compra ([D-004](./decisiones)). No es un insumo: se vincula a los insumos en F4.3.

| Campo          | Tipo    | Notas                                    |
| -------------- | ------- | ---------------------------------------- |
| `codigo`       | string  | Código en el ERP (`ART-03001`)           |
| `nombre`       | string  |                                          |
| `marcaId`      | string? | → Marca                                  |
| `unidadCompra` | string  | Cómo se compra: `Saco 50 kg`, `Caja x24` |
| `proveedorId`  | string? | → Proveedor habitual                     |
| `activo`       | boolean |                                          |

### Usuario

| Campo       | Tipo                                            | Notas                                            |
| ----------- | ----------------------------------------------- | ------------------------------------------------ |
| `nombre`    | string                                          |                                                  |
| `email`     | string                                          | Único                                            |
| `rol`       | `'admin' \| 'cajero' \| 'mesero' \| 'cocinero'` | Rol del ERP                                      |
| `localIds`  | string[]?                                       | Locales a los que tiene acceso. Sin valor: todos |
| `activo`    | boolean                                         |                                                  |
| `avatarUrl` | string?                                         |                                                  |

El selector de local de la cabecera solo muestra los locales del usuario.

## Configuración de la vertical

### DefinicionParametro

Catálogo de opciones configurables. Empieza vacío: cada fase añade las suyas en `parametros.service.ts`.

| Campo         | Tipo                                            | Notas                            |
| ------------- | ----------------------------------------------- | -------------------------------- |
| `clave`       | string                                          | Identificador estable            |
| `etiqueta`    | string                                          |                                  |
| `descripcion` | string?                                         |                                  |
| `alcance`     | `'vertical' \| 'local'`                         | Toda la cadena o un local        |
| `grupo`       | string                                          | Agrupa en pantalla               |
| `tipo`        | `'booleano' \| 'numero' \| 'texto' \| 'opcion'` |                                  |
| `opciones`    | `{ valor, etiqueta }[]`?                        | Para `tipo: 'opcion'`            |
| `porDefecto`  | string \| number \| boolean                     | Un local sin valor usa el global |

### PermisoVertical

Acción de la vertical que se concede a un **rol del ERP** y se ajusta por usuario. Empieza vacío.

| Campo         | Tipo    |
| ------------- | ------- |
| `clave`       | string  |
| `etiqueta`    | string  |
| `modulo`      | string  |
| `descripcion` | string? |

### CanalVenta

| Campo                  | Tipo                                                | Notas                                                                                           |
| ---------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `nombre`               | string                                              | Único                                                                                           |
| `tipo`                 | `'salon' \| 'llevar' \| 'delivery' \| 'plataforma'` | Modalidad de atención. Ver [D-001](./decisiones#d-001-canales-de-venta-y-modalidad-de-atencion) |
| `aplicaRecargoConsumo` | boolean                                             | Cobra el recargo configurado en el ERP                                                          |
| `comisionPorcentaje`   | number                                              | Solo en apps de delivery                                                                        |
| `activo`               | boolean                                             | Debe quedar al menos uno activo                                                                 |

### Area

Dónde se prepara y a dónde se comanda cada producto ([D-004](./decisiones)). Reemplaza a las estaciones de producción.

| Campo            | Tipo                                  | Notas                                                        |
| ---------------- | ------------------------------------- | ------------------------------------------------------------ |
| `nombre`         | string                                | Único por salón dentro del local                             |
| `localId`        | string                                | → Local                                                      |
| `salonId`        | string?                               | → Salon del **mismo** local. Sin valor: fuera de los salones |
| `impresoraId`    | string?                               | → Impresora de comandas del **mismo** local                  |
| `recibeComandas` | boolean                               | Recepción o almacén no reciben                               |
| `comanda`        | `{ modo, categoriaIds, productoIds }` | `modo`: `'todos' \| 'seleccionados'`                         |
| `activo`         | boolean                               |                                                              |

Reglas:

- Con `modo: 'seleccionados'` hace falta al menos una categoría o un producto.
- El producto **no guarda** su área: el destino se calcula con `recibeProducto(area, producto)`.
- `coberturaComanda(areas, productos, localId)` devuelve los productos sin área y los que salen en varias.

### Impresora

| Campo         | Tipo                                           | Notas                                     |
| ------------- | ---------------------------------------------- | ----------------------------------------- |
| `nombre`      | string                                         | Único por local                           |
| `localId`     | string                                         | → Local                                   |
| `uso`         | `'comandas' \| 'precuentas' \| 'comprobantes'` |                                           |
| `ancho`       | `'58mm' \| '80mm'`                             |                                           |
| `conexion`    | `'red' \| 'usb'`                               |                                           |
| `direccionIp` | string?                                        | IPv4 obligatoria si la conexión es de red |

Regla: no se elimina una impresora asignada a áreas.

### Motivo

| Campo                  | Tipo                                       | Notas                                |
| ---------------------- | ------------------------------------------ | ------------------------------------ |
| `tipo`                 | `'anulacion' \| 'descuento' \| 'cortesia'` |                                      |
| `descripcion`          | string                                     | Única dentro de su tipo              |
| `requiereAutorizacion` | boolean                                    | Exige aprobación de un administrador |

## Sala

### Salon

| Campo         | Tipo    | Notas                  |
| ------------- | ------- | ---------------------- |
| `nombre`      | string  | Único dentro del local |
| `localId`     | string  | → Local                |
| `descripcion` | string? |                        |
| `orden`       | number  | Orden en selectores    |
| `activo`      | boolean |                        |

Regla: no se elimina un salón con mesas o áreas.

### Mesa

| Campo          | Tipo                                                              | Notas                                                        |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `salonId`      | string                                                            | → Salon                                                      |
| `codigo`       | string                                                            | «M-12», único dentro del salón                               |
| `capacidad`    | number                                                            | Personas                                                     |
| `forma`        | `'cuadrada' \| 'redonda' \| 'rectangular'`                        |                                                              |
| `estado`       | `'libre' \| 'ocupada' \| 'reservada' \| 'limpieza' \| 'inactiva'` |                                                              |
| `meseroId`     | string?                                                           | → Usuario                                                    |
| `posX`, `posY` | number                                                            | Posición en el plano, 0–100 %                                |
| `grupoId`      | string?                                                           | Mesas juntadas. Solo del mismo salón; no se separan ocupadas |

## Carta

### Categoria

| Campo            | Tipo                      | Notas                   |
| ---------------- | ------------------------- | ----------------------- |
| `nombre`         | string                    |                         |
| `descripcion`    | string?                   |                         |
| `orden`          | number                    |                         |
| `disponibilidad` | `{ dias, desde, hasta }`? | Franja en que se ofrece |
| `activa`         | boolean                   |                         |

### Producto

| Campo                  | Tipo                    | Notas                                                              |
| ---------------------- | ----------------------- | ------------------------------------------------------------------ |
| `categoriaId`          | string                  | → Categoria                                                        |
| `nombre`               | string                  |                                                                    |
| `descripcion`          | string?                 |                                                                    |
| `precio`               | number                  | Precio base                                                        |
| `preciosCanal`         | `{ canalId, precio }[]` | Sin entrada, el canal usa el precio base                           |
| `disponible`           | boolean                 | Conmutador de agotado                                              |
| `tiempoPreparacionMin` | number?                 |                                                                    |
| `alergenos`            | `Alergeno[]`            | gluten, lácteos, huevo, pescado, mariscos, frutos secos, soya, ají |
| `variantes`            | `Variante[]`            | Presentaciones con **precio final**                                |
| `gruposModificadores`  | `GrupoModificador[]`    | `seleccionMinima`, `seleccionMaxima`, modificadores con recargo    |
| `imagen`               | string?                 | Data URL en mock; URL con backend                                  |

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

## Inventario

> F4.3 rehace el insumo como entidad propia de la vertical, vinculada a artículos del ERP con reglas de conversión directa y transformación.

### Insumo

| Campo           | Tipo                                                  | Notas                                                                                |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `nombre`        | string                                                |                                                                                      |
| `unidad`        | `'kg' \| 'g' \| 'l' \| 'ml' \| 'unidad' \| 'paquete'` |                                                                                      |
| `categoria`     | CategoriaInsumo                                       | carnes, pescados, verduras, abarrotes, lácteos, bebidas, descartables, preparaciones |
| `existencias`   | `{ almacenId, cantidad }[]`                           | Stock por almacén                                                                    |
| `stock`         | number                                                | Suma de existencias (derivado)                                                       |
| `stockMinimo`   | number                                                | Umbral de alerta                                                                     |
| `costoUnitario` | number                                                | Promedio ponderado sin IGV; en preparaciones se calcula                              |
| `preparacion`   | `{ rendimiento, ingredientes }`?                      | Subreceta                                                                            |
| `activo`        | boolean                                               |                                                                                      |

### Movimiento

| Campo           | Tipo           | Notas                                                                                          |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `insumoId`      | string         | → Insumo                                                                                       |
| `almacenId`     | string         | → Almacen                                                                                      |
| `tipo`          | TipoMovimiento | entrada, salida, merma, ajuste, trasladoSalida, trasladoEntrada, produccion, consumoProduccion |
| `cantidad`      | number         | Siempre positiva; el tipo define el signo                                                      |
| `costoUnitario` | number?        | Costo de la entrada o vigente                                                                  |
| `motivo`        | string?        |                                                                                                |
| `referencia`    | string?        | Documento que lo origina                                                                       |
| `usuarioId`     | string         | → Usuario                                                                                      |
| `fecha`         | string         | ISO 8601                                                                                       |

Reglas: el stock de un almacén nunca queda negativo. Traslados y producciones se aplican como transacción: si un movimiento falla, no se guarda ninguno.

### Receta

| Campo                     | Tipo   | Notas                   |
| ------------------------- | ------ | ----------------------- |
| `productoId`              | string | → Producto (1 a 1)      |
| `ingredientes[].insumoId` | string | → Insumo                |
| `ingredientes[].cantidad` | number | En la unidad del insumo |

## Retiradas

Existieron en la versión autónoma y se retiraron en F4.1 porque pertenecen al ERP o aún no aplican: `OrdenCompra`, `TomaInventario`, `PedidoInterno` y las unidades de pedido y recepción del insumo.
