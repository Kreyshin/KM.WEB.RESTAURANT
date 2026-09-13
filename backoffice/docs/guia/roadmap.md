# Roadmap

Once fases, todas de **front-end** y sobre datos de ejemplo. Una fase no empieza sin los maestros que necesita.

| Fase                              | Grupo     | Objetivo                                                     | Estado    |
| --------------------------------- | --------- | ------------------------------------------------------------ | --------- |
| F0 · Higiene                      | Base      | Git, lint, formato, tipos y pruebas                          | ✅ Hecha  |
| F1 · Cimientos de interfaz y mock | Base      | Componentes y capa de datos reutilizables                    | ✅ Hecha* |
| F2 · Configuración del negocio    | Base      | Empresa, locales, impuestos, medios de pago, canales, series | ✅ Hecha  |
| F3 · Sala y carta                 | Maestros  | Cierre de sala y carta: imagen, combos, precio por canal     | ✅ Hecha  |
| F4 · Inventario y compras         | Maestros  | Stock, kardex, recetas, proveedores, órdenes de compra       | ✅ Hecha  |
| F5 · Personal y permisos          | Maestros  | Usuarios, matriz de permisos, turnos, auditoría              | Pendiente |
| F6 · Clientes y promociones       | Maestros  | Clientes, puntos, cupones, reservas, zonas de delivery       | Pendiente |
| F7 · Ventas y caja                | Operación | Cajas, arqueos, listado de ventas, anulaciones               | Pendiente |
| F8 · Comprobantes                 | Operación | Boletas, facturas y notas de crédito con estados simulados   | Pendiente |
| F9 · Reportes y analítica         | Análisis  | Ventas, rentabilidad por plato, stock valorizado             | Pendiente |
| F10 · Pulido y entidades          | Análisis  | Accesibilidad, rendimiento y diccionario de entidades        | Pendiente |

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

## F4 · Inventario y compras

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
| **Descuento de stock por venta** | Al construir F7 · Ventas                                  | Hoy las recetas calculan costo; descontar insumos al vender llega con las ventas. Decidir de qué almacén descuenta cada estación.                                                                                                                   |
| **Recargo al consumo**           | Al construir F7 · Ventas y caja, y medir en F9 · Reportes | Cuánto recauda por día y por canal; cuántas cuentas lo retiran a pedido del cliente; efecto en el ticket medio y en las propinas; si conviene configurarlo por local u horario además de por canal. Añadir pruebas E2E del cobro con y sin recargo. |

El POS del mesero, la pantalla de cocina (KDS), la carta QR y la app de delivery son sistemas aparte. El back office solo los **configura** y **supervisa**.
