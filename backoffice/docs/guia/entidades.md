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
Insumo 1──* VinculoArticulo *──1 Articulo (ERP)
Insumo 1──* Movimiento *──1 Almacen · Usuario
Insumo 1──* Lote        Almacen 1──* Ubicacion
StockDetalle *──1 Insumo · Almacen · 0..1 Lote · 0..1 Ubicacion
Transformacion *──* Insumo (entradas y salidas)
AjusteParametros ──> Cadena · Local · Almacen · CategoriaInsumo · Insumo
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
| `almacenes` | `{ almacenId, nivel: 'ver' \| 'gestionar' }[]?` | Acceso por almacén. Sin valor: todos, gestionar  |
| `activo`    | boolean                                         |                                                  |
| `avatarUrl` | string?                                         |                                                  |

El selector de local de la cabecera solo muestra los locales del usuario. El acceso a locales y almacenes **se asigna y se bloquea en el ERP**: la vertical solo lo respeta (Stock muestra los almacenes del local activo con acceso).

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

## Clientes y reservas (F6.1)

### Cliente _(ERP, solo consulta)_

`{ tipoDocumento, documento, nombre, telefono?, email?, direccion?, distrito?, activo }`.

### FichaCliente _(vertical)_

`{ clienteId, alergenos, etiquetas, notas?, salonPreferidoId? }`: lo que necesita la sala y el ERP no usa para facturar.

### Reserva

| Campo            | Tipo                                              | Notas                                                    |
| ---------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `localId`        | string                                            | → Local                                                  |
| `clienteId`      | string?                                           | → Cliente del ERP; sin valor, va a nombre de quien llamó |
| `nombreContacto` | string                                            |                                                          |
| `personas`       | number                                            | Las mesas elegidas deben alcanzar                        |
| `fecha`, `hora`  | AAAA-MM-DD, HH:mm                                 | No se reserva en el pasado                               |
| `duracionMin`    | number                                            | Tiempo que la mesa queda apartada                        |
| `mesaIds`        | string[]                                          | Del mismo local, activas y sin cruce de horarios         |
| `canal`          | teléfono, web, mostrador, app                     |                                                          |
| `estado`         | pendiente, confirmada, sentada, noShow, cancelada | Ver transiciones                                         |
| `motivo`         | string?                                           | Obligatorio al cancelar o marcar «no vino»               |

**Transiciones:** pendiente → confirmada, sentada, cancelada o noShow; confirmada → sentada, cancelada o noShow; sentada, cancelada y noShow son finales. Sentar deja la mesa ocupada; confirmar una reserva de hoy la deja reservada. **Parámetros por local:** `reservas.confirmarAutomatico`, `reservas.duracionMin`, `reservas.anticipacionMaxDias`, `reservas.cupoPorFranja`.

## Personal (F5)

### Turno

| Campo            | Tipo          | Notas                                                   |
| ---------------- | ------------- | ------------------------------------------------------- |
| `nombre`         | string        | Único en el local                                       |
| `localId`        | string        | → Local                                                 |
| `desde`, `hasta` | `HH:mm`       | `hasta` menor que `desde` cruza medianoche              |
| `dias`           | `DiaSemana[]` | Al menos uno                                            |
| `usuarioIds`     | string[]      | Solo gente con acceso al local; sin cruces entre turnos |
| `activo`         | boolean       |                                                         |

### ExcepcionPermiso

`{ usuarioId, clave, concedido }`: ajusta un permiso sobre lo que da el rol del ERP. El administrador siempre puede todo y no admite excepciones. Permiso efectivo = admin → excepción → rol.

### RegistroAuditoria

`{ fecha, usuarioId?, autor, modulo, accion, detalle, localId? }`. Módulos: Permisos, Turnos, Integración, Recetas, Precios, Compras, Inventario. Se escribe desde los servicios y solo se consulta.

## Carta

### RecetaEstandar (D-007)

| Campo              | Tipo              | Notas                                                         |
| ------------------ | ----------------- | ------------------------------------------------------------- |
| `vendibleId`       | string            | `p:` producto sin presentaciones o `v:` presentación          |
| `foodCostObjetivo` | number?           | Objetivo propio; si no, el de la categoría o la configuración |
| `versiones`        | `VersionReceta[]` | Manda la última cuya `vigenteDesde` ya llegó                  |

**VersionReceta:** `numero`, `vigenteDesde`, `lineas`, `nota`, `autor`, `creada`, `costosAlGuardar` (costo de cada insumo al guardar; si varía más que la tolerancia, el costo queda **desactualizado**). No se crea antes de la última versión; solo se elimina si aún no rige.

**Aprobación y ficha** _(opcionales por configuración)_: `VersionReceta.estado` borrador o aprobada (un borrador no rige; aprobar exige porciones, un paso y costo en cada ingrediente, y el permiso `recetas.aprobar`), `ficha` con porciones, pasos (tiempo, temperatura, equipo), conservación, foto de emplatado y tolerancia de peso. **Reventa:** `RecetaEstandar.reventaInsumoId` crea la receta 1:1 de un insumo comprable. **Alérgenos:** `Insumo.alergenos`; la receta los suma y avisa si la carta no los declara. **Modificadores:** `Modificador.efectos` suma o quita insumos (el adicional se costea con lo que suma); `Producto.notasRapidas` solo informa a cocina.

**LineaReceta:** `tipo` ingrediente o consumible, `insumoId`, `cantidad`, `unidad` (misma dimensión que el insumo), `cantidadTipo` bruta o neta _(opcional)_, `canalIds` del consumible.

**Costo** (calculado por local, canal y fecha): ingredientes y consumibles; con bruta/neta y rendimiento activos, la cantidad neta se divide entre `Insumo.rendimientoPorcentaje`. Food cost = ingredientes ÷ precio neto de la lista vigente. Margen de contribución = precio neto − ingredientes − consumibles − comisión del canal. Participación y clase A (primer 80 % del costo), B (hasta 95 %), C.

### ListaPrecios (D-010)

| Campo              | Tipo                  | Notas                                                               |
| ------------------ | --------------------- | ------------------------------------------------------------------- |
| `codigo`           | string                | Único                                                               |
| `nombre`           | string                |                                                                     |
| `tipo`             | `base` \| `temporada` | Una base por local y canal; temporadas sin solaparse por canal      |
| `localId`          | string                | → Local                                                             |
| `canalIds`         | string[]              | → CanalVenta                                                        |
| `derivadaDe`       | string?               | → ListaPrecios. Sin círculos; no se elimina la lista de origen      |
| `ajustePorcentaje` | number?               | Sobre la lista de origen, redondeo a 0,10                           |
| `igvIncluido`      | boolean?              | Sin valor usa Impuestos de la empresa                               |
| `desde`, `hasta`   | AAAA-MM-DD?           | Solo temporada                                                      |
| `precios`          | `PrecioLista[]`       | `{ vendibleId, precio?, descuento?: { porcentaje, desde, hasta } }` |
| `activa`           | boolean               |                                                                     |

**Producto vendible** (calculado): `p:` producto sin presentaciones, `v:` presentación, `m:` adicional con recargo, `c:` combo. **Precio vigente** por local, canal y fecha: temporada vigente → lista base → precio de carta; aplica descuento de línea vigente y separa valor de venta e IGV. El combo va en una línea y su precio se reparte en proporción al precio suelto de sus componentes.

### Categoria

| Campo                  | Tipo                      | Notas                                               |
| ---------------------- | ------------------------- | --------------------------------------------------- |
| `nombre`               | string                    |                                                     |
| `descripcion`          | string?                   |                                                     |
| `orden`                | number                    |                                                     |
| `disponibilidad`       | `{ dias, desde, hasta }`? | Franja en que se ofrece                             |
| `seccionId`            | string?                   | → Categoria que la agrupa. Un solo nivel            |
| `localIds`, `canalIds` | string[]?                 | Dónde se ofrece; vacío: todos. Hereda de su sección |
| `foodCostObjetivo`     | number?                   | Objetivo de la categoría; si no, el de su sección   |
| `activa`               | boolean                   |                                                     |

### Producto

| Campo                  | Tipo                 | Notas                                                              |
| ---------------------- | -------------------- | ------------------------------------------------------------------ |
| `categoriaId`          | string               | → Categoria                                                        |
| `nombre`               | string               |                                                                    |
| `descripcion`          | string?              |                                                                    |
| `codigo`               | string?              | Código de producto vendible (D-010)                                |
| `precio`               | number               | Precio de carta: lo toma la lista que no tiene precio propio       |
| `disponible`           | boolean              | Conmutador de agotado                                              |
| `tiempoPreparacionMin` | number?              |                                                                    |
| `alergenos`            | `Alergeno[]`         | gluten, lácteos, huevo, pescado, mariscos, frutos secos, soya, ají |
| `variantes`            | `Variante[]`         | Presentaciones con **precio final**                                |
| `gruposModificadores`  | `GrupoModificador[]` | `seleccionMinima`, `seleccionMaxima`, modificadores con recargo    |
| `imagen`               | string?              | Data URL en mock; URL con backend                                  |

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

### Insumo

Lo que usan cocina y barra, en **unidad de uso** ([D-004](./decisiones)). No es el artículo: el artículo es lo que compra el ERP, con su marca y su presentación.

| Campo            | Tipo                                                  | Notas                                                                                |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `nombre`         | string                                                | Único                                                                                |
| `unidad`         | `'kg' \| 'g' \| 'l' \| 'ml' \| 'unidad' \| 'paquete'` | Unidad de uso, la de la receta                                                       |
| `categoria`      | CategoriaInsumo                                       | carnes, pescados, verduras, abarrotes, lácteos, bebidas, descartables, preparaciones |
| `existencias`    | `{ almacenId, cantidad }[]`                           | Stock principal por almacén                                                          |
| `stock`          | number                                                | Suma de existencias (derivado)                                                       |
| `stockMinimo`    | number                                                | Umbral de alerta                                                                     |
| `costoUnitario`  | number                                                | Promedio ponderado sin IGV; calculado si sale de una transformación                  |
| `abastecimiento` | `'directa' \| 'transformacion'`                       | Cómo se llega desde el artículo hasta la unidad de uso                               |
| `articulos`      | `VinculoArticulo[]`                                   | Artículos del ERP que lo abastecen. Vacío en lo que sale de una transformación       |
| `parametros`     | `Partial<ParametrosAbastecimiento>`?                  | Lo que se fija en el propio insumo; el resto se hereda                               |
| `activo`         | boolean                                               |                                                                                      |

**Criterio para separar insumos:** solo cuando cambia lo que se vende o cómo se usa en la receta. La marca y la presentación de compra son del artículo, no del insumo.

### VinculoArticulo

Regla de **conversión directa**. Varios vínculos en un insumo son sus **alternos**.

| Campo        | Tipo    | Notas                                                                     |
| ------------ | ------- | ------------------------------------------------------------------------- |
| `articuloId` | string  | → Articulo                                                                |
| `factor`     | number  | Unidades de uso que rinde una unidad de compra. Saco de 50 kg → factor 50 |
| `porDefecto` | boolean | El que se propone al pedir. Exactamente uno por insumo                    |

### Transformacion

Receta de proceso. Cubre el **despiece** (una entrada, varias salidas y merma) y la **preparación** o subreceta (varias entradas, una salida). Sustituye a `Insumo.preparacion`.

| Campo      | Tipo                     | Notas                                |
| ---------- | ------------------------ | ------------------------------------ |
| `nombre`   | string                   | Único                                |
| `entradas` | `IngredienteReceta[]`    | Insumos que se consumen en una tanda |
| `salidas`  | `SalidaTransformacion[]` | Insumos y merma esperada             |
| `activo`   | boolean                  |                                      |

**SalidaTransformacion:** `tipo` (`'insumo' | 'merma'`), `insumoId?` (vacío en merma), `cantidad`, `reparto` (% del costo de las entradas que absorbe) y `descripcion?`.

Reglas:

- Un insumo no puede entrar y salir de la misma transformación, ni salir dos veces.
- El `reparto` de las salidas que no son merma debe sumar **100 %**.
- Costo de una salida = `costo de las entradas × reparto ÷ cantidad`. La merma no absorbe costo, así que **encarece** lo que sí sale.
- Al procesarla se consumen las entradas y entran todas las salidas de tipo insumo, por las tandas que se hagan. El registro de lo que salió **realmente** llega en F4.5.

### ParametrosAbastecimiento y AjusteParametros

Cómo se controla un insumo al recepcionarlo y al guardarlo. Se fijan en cualquier nivel y **gana el más específico**: `cadena → local → almacen → categoria → insumo`.

| Parámetro             | Tipo                              | Qué hace                                                                       |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `controlaLote`        | boolean                           | Exige lote al recepcionar                                                      |
| `controlaVencimiento` | boolean                           | Exige fecha de vencimiento en el lote                                          |
| `fefo`                | boolean                           | Propone primero el lote que vence antes                                        |
| `diasAlerta`          | number                            | Días antes del vencimiento en que se avisa                                     |
| `bloquearVencidos`    | boolean                           | Impide sacar stock de un lote vencido                                          |
| `controlaUbicacion`   | boolean                           | Exige ubicación al recepcionar y al mover                                      |
| `controlaSerie`       | boolean                           | Exige una serie por unidad recibida (gas, licor)                               |
| `tipoRecepcion`       | `'total' \| 'detalle' \| 'ambos'` | Total: a ciegas, todo o nada. A detalle: se cuenta. Ambos: se elige al recibir |

`AjusteParametros` guarda `nivel`, `referencia` (`localId`, `almacenId`, `CategoriaInsumo` o `insumoId`; vacío en `cadena`) y los `valores` fijados. Lo que no se fija se hereda. El nivel `cadena` no hereda de nadie: no admite huecos y no se elimina.

`resolverParametros({ insumoId, almacenId })` devuelve cada parámetro con el nivel del que salió, para poder explicarlo en pantalla.

### Ubicacion

| Campo                                   | Tipo    | Notas                                      |
| --------------------------------------- | ------- | ------------------------------------------ |
| `almacenId`                             | string  | → Almacen                                  |
| `pasillo`, `estante`, `fila`, `columna` | string  | Su combinación es única dentro del almacén |
| `porDefecto`                            | boolean | Como mucho una por almacén                 |
| `activo`                                | boolean |                                            |

Reglas: la recepción deja el stock en la ubicación por defecto del almacén; sin ella, un insumo que controla ubicación no se puede recepcionar. No se elimina una ubicación con stock.

### Lote

| Campo         | Tipo    | Notas                                                   |
| ------------- | ------- | ------------------------------------------------------- |
| `insumoId`    | string  | → Insumo                                                |
| `codigo`      | string  | Único dentro del insumo. Si el ERP lo envía, se respeta |
| `vencimiento` | string? | `YYYY-MM-DD`. Obligatorio si el insumo lo controla      |
| `recepcion`   | string  | ISO 8601                                                |

### StockDetalle

Stock detallado: insumo × almacén × lote × ubicación. Solo lo llevan los insumos que controlan lote o ubicación; lote y ubicación son **opcionales e independientes**.

| Campo         | Tipo    | Notas          |
| ------------- | ------- | -------------- |
| `insumoId`    | string  | → Insumo       |
| `almacenId`   | string  | → Almacen      |
| `loteId`      | string? | → Lote         |
| `ubicacionId` | string? | → Ubicacion    |
| `cantidad`    | number  | Nunca negativa |

Regla: la suma del detalle por insumo y almacén debe cuadrar con el stock principal. Un descuadre es el síntoma de un movimiento registrado sin su detalle.

### Movimiento

| Campo           | Tipo           | Notas                                                                                          |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `insumoId`      | string         | → Insumo                                                                                       |
| `almacenId`     | string         | → Almacen                                                                                      |
| `tipo`          | TipoMovimiento | entrada, salida, merma, ajuste, trasladoSalida, trasladoEntrada, produccion, consumoProduccion |
| `cantidad`      | number         | Siempre positiva; el tipo define el signo                                                      |
| `costoUnitario` | number?        | Costo de la entrada o vigente                                                                  |
| `motivo`        | string?        |                                                                                                |
| `referencia`    | string?        | Documento que lo origina: `TR-…` traslado, `TF-…` transformación                               |
| `usuarioId`     | string         | → Usuario                                                                                      |
| `fecha`         | string         | ISO 8601                                                                                       |

Reglas: el stock de un almacén nunca queda negativo. Traslados y transformaciones se aplican como transacción: si un movimiento falla, no se guarda ninguno.

### Receta

| Campo                     | Tipo   | Notas                   |
| ------------------------- | ------ | ----------------------- |
| `productoId`              | string | → Producto (1 a 1)      |
| `ingredientes[].insumoId` | string | → Insumo                |
| `ingredientes[].cantidad` | number | En la unidad del insumo |

## Compras

### SolicitudCompra

| Campo                | Tipo                                                   | Notas                                         |
| -------------------- | ------------------------------------------------------ | --------------------------------------------- |
| `numero`             | string                                                 | SOL-000001                                    |
| `localId` / `areaId` | string                                                 | El área pertenece al local                    |
| `estado`             | `'borrador' \| 'enviada' \| 'atendida' \| 'rechazada'` |                                               |
| `lineas[].insumoId`  | string                                                 | Solo insumos con artículos del ERP            |
| `lineas[].cantidad`  | number                                                 | En unidad de uso                              |
| `lineas[].marcaId`   | string?                                                | Preferencia: solo marcas de sus artículos     |
| `requerimientoId`    | string?                                                | Requerimiento que la consolidó (o la reserva) |
| `motivoRechazo`      | string?                                                |                                               |

### RequerimientoCompra

| Campo                         | Tipo                                | Notas                                                                             |
| ----------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| `numero`                      | string                              | REQ-000001                                                                        |
| `estado`                      | `EstadoRequerimiento`               | borrador → enviado → aprobado → convertido → despachado → recepcionado, o anulado |
| `lineas[].insumoId`           | string                              | → Insumo                                                                          |
| `lineas[].articuloId`         | string                              | Artículo vinculado al insumo; la marca preferida elige cuál                       |
| `lineas[].cantidadInsumo`     | number                              | Suma de lo pedido, en unidad de uso                                               |
| `lineas[].cantidad`           | number                              | Unidades de compra, redondeadas hacia arriba con el factor                        |
| `lineas[].proveedorId`        | string?                             | Sugerido: proveedor habitual del artículo. Obligatorio para enviar                |
| `lineas[].origen`             | `{ solicitudId, lineaId }[]`        | Vacío: línea directa                                                              |
| `lineas[].noDisponible`       | boolean?                            | Aviso del ERP; se reemplaza por un alterno (`reemplazoDe`)                        |
| `lineas[].cantidadConvertida` | number?                             | Lo que el ERP pasó a OC: total o parcial                                          |
| `ordenCompra`                 | string?                             | N.° de OC del ERP                                                                 |
| `historial`                   | `{ estado, fecha, autor, nota? }[]` | Autor «ERP» cuando el cambio llega de allí                                        |

Reglas: una solicitud solo puede estar en un requerimiento; anular (solo en borrador o enviado) la libera. Cambiar la cantidad calculada de una línea consolidada requiere el permiso `compras.ajustarCantidades`. No se convierte en OC con líneas no disponibles.

### Recepcion

| Campo                             | Tipo                                                                      | Notas                                               |
| --------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `numero`                          | string                                                                    | REC-000001                                          |
| `almacenId`                       | string                                                                    | Del local y con acceso «gestionar» del ERP          |
| `requerimientoId` / `ordenCompra` | string?                                                                   | Sin valor: ingreso sin OC                           |
| `comprobante`                     | `{ tipo, serie, numero, monto, proveedorId?, proveedorOcasional? }`?      | Solo sin OC                                         |
| `motivo`                          | string?                                                                   | Obligatorio sin OC                                  |
| `estado`                          | `'registrada' \| 'rechazada' \| 'pendienteRegularizar' \| 'regularizada'` | Rechazada: entrega total no conforme, no entra nada |
| `modo`                            | `'total' \| 'detalle'`?                                                   | De toda la recepción contra OC                      |
| `motivoRechazo`                   | string?                                                                   | Solo si se rechazó                                  |
| `lineas[].cantidadCompra`         | number?                                                                   | Unidades de compra recibidas                        |
| `lineas[].factor`                 | number                                                                    | Del vínculo insumo–artículo                         |
| `lineas[].costoUnitario`          | number                                                                    | Neto, por unidad del insumo                         |
| `lineas[].cantidadEsperada`       | number?                                                                   | Pendiente al recibir: la diferencia es el faltante  |
| `lineas[].partes[]`               | `{ cantidad, loteCodigo?, vencimiento?, ubicacionId?, series? }`          | Varias partes para repartir en lotes o ubicaciones  |
| `lineas[].porProcesar`            | boolean                                                                   | El artículo llega sin procesar                      |

La línea del requerimiento guarda `precioNeto` (de la OC) y `cantidadRecibida`.

Reglas: el modo es de toda la OC en la zona elegida. Si un insumo exige detalle, se cuenta a detalle; si alguno exige total y ninguno detalle, va total; si todos admiten ambos, se elige. **Total** es a ciegas: cada línea pendiente entra completa y sin editar, o se rechaza la entrega entera (con motivo) y la OC sigue pendiente. **A detalle** admite recibir menos; el saldo sigue pendiente. En los dos modos se piden lote, vencimiento, ubicación y serie según los parámetros; una serie no se repite ni se reutiliza. Toda OC pendiente imprime su hoja de recepción.

### PorProcesar

| Campo                    | Tipo   | Notas                                                             |
| ------------------------ | ------ | ----------------------------------------------------------------- |
| `recepcionId`            | string | Recepción que lo originó                                          |
| `insumoId` / `almacenId` | string |                                                                   |
| `cantidad` / `pendiente` | number | Baja al registrar la parte que lo consume, lo más antiguo primero |

### ParteProduccion

| Campo                                 | Tipo                                                     | Notas                                              |
| ------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `numero`                              | string                                                   | PP-000001; también es el código del lote producido |
| `transformacionId`                    | string                                                   | → Transformacion                                   |
| `factor`                              | number                                                   | Tandas: 0.72 = 72 % de lo definido                 |
| `estado`                              | `'enProceso' \| 'terminada' \| 'rechazada'`              | En proceso no mueve stock                          |
| `entradas[]`                          | `{ insumoId, esperada, real }`                           | En modo simple, real = esperada                    |
| `salidas[]`                           | `{ salidaId, tipo, insumoId?, esperada, real, loteId? }` |                                                    |
| `mermaAdicional` / `motivoDiferencia` | number? / string?                                        | Diferencia enviada a merma (modo detallado)        |
| `vencimiento`                         | string?                                                  | Según vida útil simple o validada                  |
| `costoReal`                           | number?                                                  | Costo de las entradas al cerrar                    |
| `responsableId`                       | string                                                   |                                                    |

### Configuración de la vertical

`configuracion.vertical[clave]` y `configuracion.locales[localId][clave]`: el valor del local gana sobre el de la cadena y este sobre el valor por defecto de la definición. Parámetros de F4.5: `recepcion.sinOc.permitido`, `recepcion.sinOc.tope`, `recepcion.sinOc.comprobante`, `produccion.modo` (por local) y `produccion.vidaUtil` (cadena). Insumo suma `vidaUtilDias` y `vidaUtilAprobadaPor`; el vínculo con el artículo, `procesar`; el lote, `origen` y `referencia`; `abastecimiento` admite `'ambos'`.

## Retiradas

Existieron en la versión autónoma y se retiraron porque pertenecen al ERP, aún no aplican o quedaron sustituidas: `OrdenCompra`, `TomaInventario`, `PedidoInterno` y las unidades de pedido y recepción del insumo (F4.1); `Preparacion` y `Insumo.proveedorId` (F4.3, sustituidos por `Transformacion` y por el proveedor del artículo).
