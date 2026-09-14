# Roadmap

Fases de **front-end** sobre datos de ejemplo. Una fase no empieza sin los maestros que necesita.

> **Reencuadre (D-004, D-005).** El restaurante es una **vertical sobre un ERP**: los maestros del ERP se muestran de solo lectura y la vertical se centra en su operación. **F4 se rehace** con ese criterio.

| Fase                              | Grupo     | Objetivo                                                    | Estado         |
| --------------------------------- | --------- | ----------------------------------------------------------- | -------------- |
| F0 · Higiene                      | Base      | Git, lint, formato, tipos y pruebas                         | ✅ Hecha       |
| F1 · Cimientos de interfaz y mock | Base      | Componentes y capa de datos reutilizables                   | ✅ Hecha\*     |
| F2 · Configuración                | Base      | Configuración de la vertical y por local, permisos, canales | ✅ Hecha       |
| F3 · Sala y carta                 | Maestros  | Cierre de sala y carta: imagen, combos, precio por canal    | ✅ Hecha       |
| F4 · Abastecimiento               | Maestros  | Límite ERP, áreas, insumos, requerimientos, recepción       | En curso       |
| F5 · Personal y permisos          | Maestros  | Catálogo de permisos, turnos y auditoría                    | Pendiente      |
| F6 · Clientes y promociones       | Maestros  | Clientes, puntos, cupones, reservas, zonas de delivery      | Pendiente      |
| F7 · Ventas y caja                | Operación | Pedido, comanda, cuenta y cobro · alcance por decidir       | ⚠️ Por decidir |
| F8 · Comprobantes                 | Operación | Boletas, facturas y notas de crédito con estados simulados  | Pendiente      |
| F9 · Reportes y analítica         | Análisis  | Ventas, rentabilidad por plato, consumo y mermas            | Pendiente      |
| F10 · Pulido y entidades          | Análisis  | Accesibilidad, rendimiento y diccionario de entidades       | Pendiente      |

\* La semilla realista se amplía en cada fase, cuando existan sus entidades.

## Dependencias

```text
F0 → F1 → F2 ─┬→ F3 ─┬→ F4 ─┐
              │      ├→ F6 ─┤
              └→ F5 ─┴──────┴→ F7 ─┬→ F8 ─┐
                                   └→ F9 ─┴→ F10
```

## F1 · Cimientos de interfaz y mock

**Capa de datos**

- [x] Repositorio mock genérico (CRUD, filtros, orden, paginación)
- [x] Latencia y errores simulados configurables
- [x] Reinicio de datos de ejemplo
- [ ] Semilla realista completa _(por fase)_

**Componentes**

- [x] KmTable con orden, filtros y paginación
- [x] KmTabs, KmDrawer, KmFecha y KmRangoFechas
- [x] KmUploadImagen
- [x] Estados vacío, carga y error
- [x] Exportar a CSV y Excel
- [x] Buscador global (Ctrl K)

**Shell**

- [x] Selector de local
- [x] Migas de pan

## F2 · Configuración

- [x] Datos de empresa: RUC con dígito verificador, razón social, logo
- [x] Locales con horario semanal y código de establecimiento SUNAT
- [x] Impuestos: IGV, recargo al consumo por canal (máx. 13 %) e ICBPER, con ticket de ejemplo
- [x] Medios de pago: efectivo, tarjeta, Yape, Plin, transferencia, crédito
- [x] Canales de venta: salón, para llevar, delivery y plataformas con comisión
- [x] Estaciones de producción e impresoras por local
- [x] Motivos de anulación, descuento y cortesía
- [x] Series y correlativos por local

**Ajuste por D-005 y D-006**

- [x] Quitar empresa, locales, impuestos, medios de pago y series de comprobantes (se gestionan en el ERP)
- [x] Configuración de la vertical (alcance global, sin parámetros aún)
- [x] Configuración por local según los locales a los que accede el usuario (sin parámetros aún)
- [x] Permisos por rol del ERP (sin permisos aún)
- [x] Excepciones por usuario (sin permisos aún)
- [x] Estaciones de producción se convierten en **Áreas** _(F4.2)_

## F3 · Sala y carta

- [x] Unir y separar mesas en el plano (no se separa una unión con la cuenta abierta)
- [x] Imagen de producto
- [x] Combos y menú del día, con precio suelto y ahorro
- [x] Precio por canal de venta
- [x] Horario de disponibilidad por categoría
- [x] Estación de producción por producto _(reemplazada en F4.2: el área define qué productos recibe)_

## F4 · Abastecimiento

Rehecha según [D-004](./decisiones.md) y [D-005](./decisiones.md). Se puede avanzar por partes: cada subfase deja la aplicación funcionando y con sus pruebas.

| Subfase                                       | Qué entrega                                                                                           | Depende de | Estado    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- | --------- |
| **F4.1 · Límite con el ERP**                  | Retiros, maestros del ERP en solo lectura, artículos y proveedores de consulta                        | —          | ✅ Hecha  |
| **F4.2 · Áreas**                              | Maestro de áreas y a qué área se comanda cada producto                                                | F4.1       | ✅ Hecha  |
| **F4.3 · Insumos y reglas de abastecimiento** | Insumo de la vertical, conversión directa y transformación, parámetros, ubicaciones y stock detallado | F4.1       | Pendiente |
| **F4.4 · Solicitudes y requerimientos**       | Solicitud por área, requerimiento por local y su seguimiento                                          | F4.2, F4.3 | Pendiente |
| **F4.5 · Recepción y transformación**         | Recepción con y sin OC, lotes, ubicación y artículos por procesar                                     | F4.3, F4.4 | Pendiente |

### F4.1 · Límite con el ERP

**Retirar**

- [x] Pedidos internos entre almacenes
- [x] Toma de inventario físico
- [x] Mantenimiento de proveedores (alta, edición, baja)
- [x] Órdenes de compra: creación, emisión, anulación y recepción desde la vertical
- [x] Sugerencia de compra actual (se rehace dentro del requerimiento)
- [x] Unidades para pedir y recepcionar del insumo (D-003)

**Pasar a solo lectura** _(con indicador «Sincronizado desde ERP»)_

- [x] Hecho en F2: empresa, locales, impuestos, medios de pago y series retirados (D-006)
- [x] Almacenes

**Nuevo: consultas del ERP** _(Compras → Artículos, Proveedores y Marcas, con filtros por marca y proveedor)_

- [x] Artículos: código, nombre, marca, unidad de compra, proveedor habitual
- [x] Proveedores y marcas

**Se conserva**

- Recetas de venta con costo, margen y food cost
- Movimientos y kardex como **consulta**
- Canales de venta y motivos

### F4.2 · Áreas

- [x] Maestro de áreas por local: nombre, tipo, piso o sala, impresora; admite varias del mismo tipo
- [x] Comanda: «Todos los productos» (por defecto con una sola área) o «Seleccionados» por categoría o producto
- [x] Aviso de productos sin área y de productos en más de un área _(panel «Revisión de comandas» por local)_
- [x] Migrar estaciones de producción existentes a áreas; el producto ya no guarda su estación y muestra «Se comanda en»

### F4.3 · Insumos y reglas de abastecimiento

- [ ] Insumo propio de la vertical con unidad de uso y categoría de la cadena
- [ ] Vínculo con uno o varios artículos del ERP (alternos) y artículo por defecto
- [ ] **Conversión directa:** factor fijo, aplicada al recepcionar
- [ ] **Transformación:** receta con rendimiento esperado; cada salida es insumo o merma
- [ ] Parámetros heredados **Cadena → Local → Almacén → Categoría → Insumo**: lote, vencimiento, FEFO, alertas, bloqueo de vencidos, ubicación, tipo de recepción
- [ ] Ubicaciones (pasillo, estante, fila, columna) y ubicación por defecto por almacén
- [ ] Stock principal (insumo × almacén) y stock detallado (lote × ubicación) cuando aplique
- [ ] Preparaciones (subrecetas) actuales encajadas como transformación

### F4.4 · Solicitudes y requerimientos de compra

- [ ] **Solicitud de compra** por área, en insumos, con marca preferida opcional · Borrador → Enviada → Atendida / Rechazada
- [ ] **Requerimiento de compra** por local: consolidar solicitudes o crear directo; traducir insumos a artículos; proveedor sugerido; ajuste de cantidades con permiso
- [ ] Estados: Borrador → Enviado → Aprobado → Convertido → Despachado → Recepcionado, y Anulado antes de ser tomado
- [ ] Seguimiento: n.° de OC, conversión total o parcial por línea
- [ ] Línea no disponible: alerta y reemplazo por un artículo alterno

### F4.5 · Recepción y transformación

- [ ] Recepción contra OC: **total** o **a detalle**, admite parcial
- [ ] Al recepcionar: conversión directa, lote y ubicación según el insumo; lo que requiere transformación queda **por procesar**
- [ ] **Ingreso sin OC** según configuración: comprobante (tipo, serie, número, monto, foto), tope, motivo y estado «Pendiente de regularizar»
- [ ] Registro de transformación con rendimiento real, salidas a insumo o merma y vencimiento del resultado

## F7 · Ventas y caja

> ⚠️ **Decisión pendiente antes de empezar.** Tomar pedidos en mesa y barra, comandar y cobrar es el **núcleo de la vertical** (D-005). Falta decidir **dónde se construye**:
>
> - **Dentro de este proyecto:** una sección POS (mesero y caja) junto al back office, compartiendo carta, mesas, áreas y canales.
> - **Aplicación aparte de la misma vertical:** el back office solo configura y supervisa, y el POS consume los mismos datos.
>
> Según la decisión, F7 incluirá la toma de pedido, la comanda a áreas, la división de cuenta y el cobro, o solo cajas, arqueos, listado de ventas y anulaciones desde el back office.

## Pendientes de revisión

Decisiones que ya funcionan, pero que deben validarse con datos de operación reales antes de darlas por cerradas.

| Tema                             | Cuándo                                                    | Qué comprobar                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Food cost objetivo**           | Con ventas reales en F9                                   | Ajustar los umbrales 30 % / 35 % por categoría (bebidas y postres suelen tener otro rango).                                                                                                                                                         |
| **Descuento de stock por venta** | Al construir F7 · Ventas                                  | Hoy las recetas calculan costo; descontar insumos al vender llega con las ventas. Decidir de qué almacén descuenta cada área.                                                                                                                       |
| **Herencia de parámetros**       | Al terminar F4.3                                          | Probar con un flujo real si los niveles Cadena → Local → Almacén → Categoría → Insumo bastan o sobra alguno.                                                                                                                                        |
| **Vencimiento al transformar**   | Al terminar F4.5                                          | Si el insumo porcionado hereda el vencimiento del lote, toma nueva vida útil o la menor de ambas.                                                                                                                                                   |
| **Concepto de cadena**           | Cuando haya locales de distinto formato                   | Crear «Concepto» (Cevichería, Hamburguesas) para agrupar locales y categorías.                                                                                                                                                                      |
| **Recargo al consumo**           | Al construir F7 · Ventas y caja, y medir en F9 · Reportes | Cuánto recauda por día y por canal; cuántas cuentas lo retiran a pedido del cliente; efecto en el ticket medio y en las propinas; si conviene configurarlo por local u horario además de por canal. Añadir pruebas E2E del cobro con y sin recargo. |
