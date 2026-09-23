# Qué es Mesa

Mesa es el back office de la vertical de **restaurantes** de Karma Systems: la pantalla donde el negocio se administra, no donde se toma el pedido.

Cubre el ciclo de la sala —sentar, comandar, cobrar— y todo lo que hay detrás: la carta y sus precios, las recetas y su costo, el inventario de cocina y barra, y las compras que lo abastecen.

::: tip Esta sección no habla de tecnología
Aquí se explica **cómo se opera el restaurante**: el vocabulario, las pantallas y el orden en que se trabaja. Si buscas arquitectura, componentes o el modelo de datos, esa es la [guía técnica](/guia/introduccion).
:::

## Para quién es cada parte

| Si eres…              | Vivirás sobre todo en…                                    |
| --------------------- | --------------------------------------------------------- |
| Administrador o dueño | Carta, listas de precios, recetas y costos, configuración |
| Jefe de sala          | Salones, mesas y reservas                                 |
| Cajero                | Reportes, caja y facturación                              |
| Jefe de cocina        | Recetas, producción, transformaciones e insumos           |
| Encargado de almacén  | Stock, recepción, solicitudes y requerimientos            |

## Qué no es

- **No es el punto de venta.** Aquí no se toma la comanda ni se cobra. Eso es la caja y la app del mesero, que consumen lo que este back office configura.
- **No es el ERP.** Empresa, impuestos, proveedores, artículos y órdenes de compra viven en el ERP de Karma. Mesa los consume y muestra «Sincronizado desde ERP».
- **No es un sistema cerrado.** Casi todo control avanzado —cantidad bruta y neta, rendimientos, aprobación de recetas— nace **apagado**. Un restaurante pequeño no debería tropezar con controles que no necesita.

## El principio que lo ordena todo

> **Ordenar sin obligar.**

Un restaurante pequeño mide por unidad y no tiene procesos formales; uno establecido controla mermas, rendimientos y aprobaciones. Cada control avanzado existe como opción con un modo simple por defecto, que se activa cuando el negocio lo pide.

## Una advertencia sobre los datos

Lo que puedes abrir hoy funciona con **datos de ejemplo guardados en tu navegador**. Crea, edita y borra sin miedo: nada sale de tu equipo.

Para volver al punto de partida: **tu perfil → Datos de ejemplo → Reiniciar datos**.
