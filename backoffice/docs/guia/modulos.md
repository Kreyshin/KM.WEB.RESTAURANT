# Módulos y navegación

El shell tiene tres niveles: la **barra principal** con los módulos, el **menú contextual** con las secciones del módulo activo y la **cabecera** con migas, buscador y local activo.

La estructura vive en `src/components/layout/navegacion.ts`. Una sección solo aparece si el rol del usuario está en su lista `roles`; el router aplica la misma regla y redirige a _Sin permiso_.

## Estado actual

| Módulo    | Sección                 | Ruta                         | Roles         | Estado |
| --------- | ----------------------- | ---------------------------- | ------------- | ------ |
| Inicio    | Dashboard               | `/dashboard`                 | Todos         | ✅     |
| Inicio    | Guía de componentes     | `/componentes`               | admin         | ✅     |
| Sala      | Salones                 | `/salones`                   | admin         | ✅     |
| Sala      | Mesas                   | `/mesas`                     | Todos         | ✅     |
| Operación | Carta y menú            | `/carta`                     | admin         | ✅     |
| Operación | Inventario              | `/inventario`                | admin         | 🚧     |
| Admin     | Reportes y caja         | `/reportes`                  | admin, cajero | 🚧     |
| Admin     | Facturación             | `/facturacion`               | admin, cajero | 🚧     |
| Admin     | Usuarios y roles        | `/usuarios`                  | admin         | 🚧     |
| Config.   | Empresa                 | `/configuracion/empresa`     | admin         | ✅     |
| Config.   | Locales                 | `/configuracion/locales`     | admin         | ✅     |
| Config.   | Impuestos y cargos      | `/configuracion/impuestos`   | admin         | ✅     |
| Config.   | Medios de pago          | `/configuracion/medios-pago` | admin         | ✅     |
| Config.   | Canales de venta        | `/configuracion/canales`     | admin         | ✅     |
| Config.   | Estaciones e impresoras | `/configuracion/produccion`  | admin         | ✅     |
| Config.   | Motivos                 | `/configuracion/motivos`     | admin         | ✅     |
| Config.   | Series de comprobantes  | `/configuracion/series`      | admin         | ✅     |

## Navegación final prevista

Al terminar el [roadmap](./roadmap), la barra tendrá 11 módulos:

| Módulo        | Secciones                                                                    |
| ------------- | ---------------------------------------------------------------------------- |
| Inicio        | Dashboard, Dashboard ejecutivo                                               |
| Sala          | Salones, Mesas, Reservas                                                     |
| Carta         | Carta y menú, Combos y menú del día, Precios por canal                       |
| Inventario    | Insumos, Almacenes, Movimientos y kardex, Recetas, Toma de inventario        |
| Compras       | Proveedores, Órdenes de compra                                               |
| Ventas        | Ventas, Cajas y arqueos, Anulaciones                                         |
| Clientes      | Clientes, Puntos, Promociones y cupones                                      |
| Comprobantes  | Boletas y facturas, Notas de crédito                                         |
| Reportes      | Ventas, Productos, Personal, Costos y stock                                  |
| Personal      | Usuarios, Roles y permisos, Turnos y asistencia, Auditoría                   |
| Configuración | Empresa y locales, Impuestos y pagos, Canales y estaciones, Series, Delivery |

## Piezas globales del shell

- **Buscador global** (`Ctrl K` / `⌘ K`): secciones, productos, mesas y acciones rápidas.
- **Selector de local**: guarda el local activo entre sesiones (`useLocalStore`).
- **Datos de ejemplo**: panel para simular latencia y fallos, y reiniciar la semilla.
- **Tema** claro u oscuro, persistido en el navegador.
