# Qué está listo

Honestidad sobre el alcance de lo que puedes abrir hoy.

## Operativo

| Módulo                       | Qué puedes hacer                                                  |
| ---------------------------- | ----------------------------------------------------------------- |
| Dashboard                    | Estado de la sala y ocupación por salón                           |
| Salones y mesas              | Alta, plano, estados, unión y asignación de mesero                |
| Clientes y reservas          | Ficha de sala y agenda del día                                    |
| Zonas de reparto             | Cobertura, envío, pedido mínimo y tiempo prometido por local      |
| Promociones y cupones        | Reglas que lee el POS, con simulador de cuenta y reglas de puntos |
| Carta                        | Categorías, productos, presentaciones, modificadores y alérgenos  |
| Listas de precios            | Por local y canal, base y temporada, derivadas con %              |
| Combos                       | Grupos de elección y reparto analítico del precio                 |
| Insumos                      | Catálogo, stock y alertas de mínimo                               |
| Recetas y costos             | Food cost contra objetivo, versiones y simulador de precio        |
| Producción                   | Partes que escalan la receta y crean lote                         |
| Transformaciones             | Despiece con reparto de costo por valor                           |
| Stock                        | Por insumo, lote y ubicación                                      |
| Parámetros de abastecimiento | Herencia completa hasta el insumo                                 |
| Ubicaciones, almacén y zonas | Estructura y quién gestiona cada zona                             |
| Compras                      | Solicitudes, requerimientos y recepción con y sin orden           |
| Configuración                | Vertical, por local, cadenas, canales, áreas y motivos            |
| Permisos                     | Por rol y excepciones por usuario                                 |
| Turnos y bitácora            | Franjas del personal y registro de acciones                       |
| Reportes                     | Ventas, rentabilidad por plato, consumo y mermas                  |

## Pendiente

| Módulo            | Qué falta                                         |
| ----------------- | ------------------------------------------------- |
| Facturación SUNAT | Envío real al OSE; lo demás ya funciona           |
| Usuarios y roles  | La ruta y los permisos existen; falta la pantalla |
| Comanda en cocina | Pantalla de cocina en tiempo real (KDS)           |

## Sobre los datos

Todo funciona con **datos de ejemplo en tu navegador**. No hay servidor detrás todavía.

El teclado llega a todo: los paneles se abren con foco dentro, se cierran con Escape y lo
devuelven donde estaba; el menú de una mesa se abre con Shift+F10.

No es una maqueta: las reglas de negocio están implementadas de verdad —el food cost se divide entre el rendimiento, las listas de temporada no se solapan, la recepción convierte y aparta lo que hay que transformar— y son las mismas que tendrá que respetar el backend cuando exista.
