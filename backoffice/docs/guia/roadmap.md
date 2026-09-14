# Roadmap

Fases de **front-end** sobre datos de ejemplo. Una fase no empieza sin los maestros que necesita.

> **Reencuadre (D-004, D-005).** El restaurante es una **vertical sobre un ERP**: los maestros del ERP se muestran de solo lectura y la vertical se centra en su operación. F4 se rehace como **F4R · Abastecimiento**.

| Fase                              | Grupo     | Objetivo                                                     | Estado     |
| --------------------------------- | --------- | ------------------------------------------------------------ | ---------- |
| F0 · Higiene                      | Base      | Git, lint, formato, tipos y pruebas                          | ✅ Hecha   |
| F1 · Cimientos de interfaz y mock | Base      | Componentes y capa de datos reutilizables                    | ✅ Hecha*  |
| F2 · Configuración del negocio    | Base      | Empresa, locales, impuestos, medios de pago, canales, series | ✅ Hecha   |
| F3 · Sala y carta                 | Maestros  | Cierre de sala y carta: imagen, combos, precio por canal     | ✅ Hecha   |
| F4 · Inventario y compras         | Maestros  | Stock, kardex, recetas, proveedores, órdenes de compra       | ♻️ Rehacer |
| F4R · Abastecimiento              | Maestros  | Límite ERP, áreas, insumos, requerimientos y recepción       | En curso   |
| F5 · Personal y permisos          | Maestros  | Permisos por rol del ERP y por usuario, turnos, auditoría    | Pendiente  |
| F6 · Clientes y promociones       | Maestros  | Clientes, puntos, cupones, reservas, zonas de delivery       | Pendiente  |
| F7 · Ventas y caja                | Operación | Cajas, arqueos, listado de ventas, anulaciones               | Pendiente  |
| F8 · Comprobantes                 | Operación | Boletas, facturas y notas de crédito con estados simulados   | Pendiente  |
| F9 · Reportes y analítica         | Análisis  | Ventas, rentabilidad por plato, stock valorizado             | Pendiente  |
| F10 · Pulido y entidades          | Análisis  | Accesibilidad, rendimiento y diccionario de entidades        | Pendiente  |

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

## F2 · Configuración del negocio

- [x] Datos de empresa: RUC con dígito verificador, razón social, logo
- [x] Locales con horario semanal y código de establecimiento SUNAT
- [x] Impuestos: IGV, recargo al consumo por canal (máx. 13 %) e ICBPER, con ticket de ejemplo
- [x] Medios de pago: efectivo, tarjeta, Yape, Plin, transferencia, crédito
- [x] Canales de venta: salón, para llevar, delivery y plataformas con comisión
- [x] Estaciones de producción e impresoras por local
- [x] Motivos de anulación, descuento y cortesía
- [x] Series y correlativos por local

## F3 · Sala y carta

- [x] Unir y separar mesas en el plano (no se separa una unión con la cuenta abierta)
- [x] Imagen de producto
- [x] Combos y menú del día, con precio suelto y ahorro
- [x] Precio por canal de venta
- [x] Horario de disponibilidad por categoría
- [x] Estación de producción por producto

## F4R · Abastecimiento (reencuadre)

Ver [D-004](./decisiones.md#d-004-·-abastecimiento-articulos-insumos-compras-y-recepcion) y [D-005](./decisiones.md#d-005-·-limite-erp-↔-vertical-y-permisos).

**1 · Límite con el ERP**

- [ ] Retirar pedidos internos, toma de inventario y mantenimiento de proveedores y órdenes de compra
- [ ] Solo lectura con «Sincronizado desde ERP»: empresa, series, impuestos, locales, almacenes, medios de pago
- [ ] Maestros ERP de consulta: artículos (unidad de compra, marca), proveedores, marcas

**2 · Áreas**

- [ ] Maestro de áreas por local (reemplaza estaciones de producción)
- [ ] Comanda: todos los productos o seleccionados por categoría o producto; aviso de productos sin área

**3 · Insumos y reglas de abastecimiento**

- [ ] Insumo propio de la vertical con unidad de uso
- [ ] Reglas: conversión directa y transformación (salidas como insumo o merma, rendimiento esperado)
- [ ] Parámetros heredados Cadena → Local → Almacén → Categoría → Insumo: lote, vencimiento, FEFO, ubicación, tipo de recepción
- [ ] Ubicaciones (pasillo, estante, fila, columna) y ubicación por defecto por almacén
- [ ] Stock principal y stock detallado por lote y ubicación

**4 · Solicitudes y requerimientos de compra**

- [ ] Solicitud por área en insumos, con marca preferida opcional
- [ ] Requerimiento por local: consolidar, traducir a artículos, proveedor sugerido
- [ ] Estados, n.° de OC, conversión total o parcial, línea no disponible con alterno

**5 · Recepción y transformación**

- [ ] Recepción total o a detalle, parcial; lote y ubicación según insumo
- [ ] Ingreso sin OC con comprobante, tope, motivo y «Pendiente de regularizar»
- [ ] Artículos por procesar y registro de transformación con rendimiento real

## F4 · Inventario y compras _(versión autónoma, se reemplaza por F4R)_

- [x] Almacenes por local y stock por almacén
- [x] Vista de insumos con alerta de mínimo y stock valorizado
- [x] Movimientos: entrada, salida, merma y ajuste
- [x] Kardex por insumo con saldo
- [x] Traslados entre almacenes
- [x] Toma de inventario físico con faltantes y sobrantes valorizados
- [x] Recetas por plato con costo, margen y food cost
- [x] Preparaciones (subrecetas) con producción en cocina
- [x] Proveedores con validación de RUC
- [x] Órdenes de compra: borrador, emisión, anulación y recepción parcial
- [x] Costo promedio ponderado al recibir
- [x] Sugerencia de compra por insumos bajo mínimo

## Pendientes de revisión

Decisiones que ya funcionan, pero que deben validarse con datos de operación reales antes de darlas por cerradas.

| Tema                             | Cuándo                                                    | Qué comprobar                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Food cost objetivo**           | Con ventas reales en F9                                   | Ajustar los umbrales 30 % / 35 % por categoría (bebidas y postres suelen tener otro rango).                                                                                                                                                         |
| **Descuento de stock por venta** | Al construir F7 · Ventas                                  | Hoy las recetas calculan costo; descontar insumos al vender llega con las ventas. Decidir de qué almacén descuenta cada área.                                                                                                                       |
| **Herencia de parámetros**       | Al terminar F4R                                           | Probar con un flujo real si los niveles Cadena → Local → Almacén → Categoría → Insumo bastan o sobra alguno.                                                                                                                                        |
| **Vencimiento al transformar**   | Al terminar F4R                                           | Si el insumo porcionado hereda el vencimiento del lote, toma nueva vida útil o la menor de ambas.                                                                                                                                                   |
| **Recargo al consumo**           | Al construir F7 · Ventas y caja, y medir en F9 · Reportes | Cuánto recauda por día y por canal; cuántas cuentas lo retiran a pedido del cliente; efecto en el ticket medio y en las propinas; si conviene configurarlo por local u horario además de por canal. Añadir pruebas E2E del cobro con y sin recargo. |

El POS del mesero, la pantalla de cocina (KDS), la carta QR y la app de delivery son sistemas aparte. El back office solo los **configura** y **supervisa**.
