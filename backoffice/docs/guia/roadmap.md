# Roadmap

Once fases, todas de **front-end** y sobre datos de ejemplo. Una fase no empieza sin los maestros que necesita.

| Fase                              | Grupo     | Objetivo                                                     | Estado    |
| --------------------------------- | --------- | ------------------------------------------------------------ | --------- |
| F0 · Higiene                      | Base      | Git, lint, formato, tipos y pruebas                          | ✅ Hecha  |
| F1 · Cimientos de interfaz y mock | Base      | Componentes y capa de datos reutilizables                    | ✅ Hecha* |
| F2 · Configuración del negocio    | Base      | Empresa, locales, impuestos, medios de pago, canales, series | Pendiente |
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

- [ ] Datos de empresa: RUC, razón social, logo
- [ ] Locales con horario
- [ ] Impuestos: IGV y recargo al consumo
- [ ] Medios de pago: efectivo, tarjeta, Yape, Plin
- [ ] Canales de venta: salón, para llevar, delivery
- [ ] Estaciones de producción e impresoras
- [ ] Motivos de anulación y descuento
- [ ] Series y correlativos por local

## Fuera de alcance

El POS del mesero, la pantalla de cocina (KDS), la carta QR y la app de delivery son sistemas aparte. El back office solo los **configura** y **supervisa**.
