# Módulos y navegación

El shell tiene tres niveles: la **barra principal** con los módulos, el **menú contextual** con las secciones del módulo activo y la **cabecera** con migas, buscador y local activo.

La estructura vive en `src/components/layout/navegacion.ts`. Una sección solo aparece si el rol del usuario está en su lista `roles`; el router aplica la misma regla y redirige a _Sin permiso_.

## Estado actual

| Módulo     | Sección                      | Ruta                           | Roles         | Estado   |
| ---------- | ---------------------------- | ------------------------------ | ------------- | -------- |
| Inicio     | Dashboard                    | `/dashboard`                   | Todos         | ✅       |
| Inicio     | Guía de componentes          | `/componentes`                 | admin         | ✅       |
| Sala       | Salones                      | `/salones`                     | admin         | ✅       |
| Sala       | Mesas                        | `/mesas`                       | Todos         | ✅       |
| Carta      | Carta y menú                 | `/carta`                       | admin         | ✅       |
| Carta      | Combos y menús               | `/combos`                      | admin         | ✅       |
| Inventario | Insumos                      | `/inventario`                  | admin         | ✅       |
| Inventario | Movimientos y kardex         | `/inventario/movimientos`      | admin         | ✅       |
| Inventario | Recetas y costos             | `/inventario/recetas`          | admin         | ✅       |
| Inventario | Transformaciones             | `/inventario/transformaciones` | admin         | ✅       |
| Inventario | Lotes y stock detallado      | `/inventario/stock-detallado`  | admin         | ✅       |
| Inventario | Parámetros de abastecimiento | `/inventario/parametros`       | admin         | ✅       |
| Inventario | Ubicaciones                  | `/inventario/ubicaciones`      | admin         | ✅       |
| Inventario | Almacenes                    | `/inventario/almacenes`        | admin         | ✅ ERP   |
| Compras    | Artículos                    | `/compras/articulos`           | admin         | ✅ ERP   |
| Compras    | Proveedores                  | `/compras/proveedores`         | admin         | ✅ ERP   |
| Compras    | Marcas                       | `/compras/marcas`              | admin         | ✅ ERP   |
| Admin      | Reportes y caja              | `/reportes`                    | admin, cajero | 🚧       |
| Admin      | Facturación                  | `/facturacion`                 | admin, cajero | 🚧       |
| Admin      | Usuarios y roles             | `/usuarios`                    | admin         | 🚧       |
| Config.    | Configuración de la vertical | `/configuracion/vertical`      | admin         | ✅ vacía |
| Config.    | Configuración por local      | `/configuracion/local`         | admin         | ✅ vacía |
| Config.    | Permisos por rol             | `/configuracion/roles`         | admin         | ✅ vacía |
| Config.    | Excepciones por usuario      | `/configuracion/excepciones`   | admin         | ✅ vacía |
| Config.    | Canales de venta             | `/configuracion/canales`       | admin         | ✅       |
| Config.    | Áreas e impresoras           | `/configuracion/areas`         | admin         | ✅       |
| Config.    | Motivos                      | `/configuracion/motivos`       | admin         | ✅       |

«ERP» indica una consulta de un maestro del ERP: sin alta, edición ni baja. Pedidos internos, toma de inventario y órdenes de compra se retiraron en F4.1.

«Vacía» indica que la pantalla existe y muestra su alcance, pero aún no tiene parámetros o permisos: cada fase los añade en `parametros.service.ts`. Empresa, locales, impuestos, medios de pago y series de comprobantes se gestionan en el ERP y no se muestran (D-006).

## Navegación final prevista

Con el reencuadre sobre el ERP ([D-005](./decisiones)), la barra quedará así. **ERP** marca consultas de solo lectura.

| Módulo        | Secciones                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio        | Dashboard                                                                                                                                       |
| Sala          | Salones, Mesas, Reservas                                                                                                                        |
| Carta         | Carta y menú, Combos y menús                                                                                                                    |
| Inventario    | Insumos, Reglas de abastecimiento, Ubicaciones y lotes, Movimientos y kardex, Recetas, Transformaciones, Almacenes (ERP)                        |
| Compras       | Solicitudes de compra, Requerimientos, Recepción, Artículos (ERP), Proveedores (ERP), Marcas (ERP)                                              |
| Ventas        | Alcance por decidir en F7                                                                                                                       |
| Clientes      | Clientes, Puntos, Promociones y cupones                                                                                                         |
| Reportes      | Ventas, Costos, consumo y mermas                                                                                                                |
| Configuración | Configuración de la vertical, Configuración por local, Permisos por rol, Excepciones por usuario, Canales de venta, Áreas e impresoras, Motivos |

## Piezas globales del shell

- **Buscador global** (`Ctrl K` / `⌘ K`): secciones, productos, mesas y acciones rápidas.
- **Selector de local**: guarda el local activo entre sesiones (`useLocalStore`).
- **Datos de ejemplo**: panel para simular latencia y fallos, y reiniciar la semilla.
- **Tema** claro u oscuro, persistido en el navegador.
