# Roadmap

Once fases, todas de **front-end** y sobre datos de ejemplo. Una fase no empieza sin los maestros que necesita.

| Fase                              | Grupo     | Objetivo                                                     | Estado    |
| --------------------------------- | --------- | ------------------------------------------------------------ | --------- |
| F0 · Higiene                      | Base      | Git, lint, formato, tipos y pruebas                          | ✅ Hecha  |
| F1 · Cimientos de interfaz y mock | Base      | Componentes y capa de datos reutilizables                    | ✅ Hecha* |
| F2 · Configuración del negocio    | Base      | Empresa, locales, impuestos, medios de pago, canales, series | ✅ Hecha  |
| F3 · Sala y carta                 | Maestros  | Cierre de sala y carta: imagen, combos, precio por canal     | En curso  |
| F4 · Inventario y compras         | Maestros  | Stock, kardex, recetas, proveedores, órdenes de compra       | En curso  |
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

## Pendientes de revisión

Decisiones que ya funcionan, pero que deben validarse con datos de operación reales antes de darlas por cerradas.

| Tema                   | Cuándo                                                    | Qué comprobar                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recargo al consumo** | Al construir F7 · Ventas y caja, y medir en F9 · Reportes | Cuánto recauda por día y por canal; cuántas cuentas lo retiran a pedido del cliente; efecto en el ticket medio y en las propinas; si conviene configurarlo por local u horario además de por canal. Añadir pruebas E2E del cobro con y sin recargo. |

El POS del mesero, la pantalla de cocina (KDS), la carta QR y la app de delivery son sistemas aparte. El back office solo los **configura** y **supervisa**.
