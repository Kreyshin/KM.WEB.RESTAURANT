# KM.Restaurante — Plan de trabajo

> Estado a 2026-09-14. Vista de conjunto y orden de trabajo.
>
> El **detalle por fase** vive en [`backoffice/docs/guia/roadmap.md`](backoffice/docs/guia/roadmap.md)
> y las **decisiones** en [`backoffice/docs/guia/decisiones.md`](backoffice/docs/guia/decisiones.md).
> Cuando este documento y el roadmap discrepen, manda el roadmap.

---

## 1. Qué estamos construyendo

Un **back office de restaurante como vertical sobre el ERP de Karma Corp** ([D-005](backoffice/docs/guia/decisiones.md)).
Eso define el reparto de responsabilidades y no se discute por módulo:

|             | ERP                                                                                                              | Vertical (este proyecto)                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Maestros    | Empresa, locales, almacenes, artículos, proveedores, marcas, impuestos, medios de pago, series, usuarios y roles | Salones, mesas, áreas, carta, insumos, recetas, canales, motivos |
| Procesos    | Compras, contabilidad, logística                                                                                 | Abastecimiento de cocina, operación de sala, venta y comanda     |
| En pantalla | Solo lectura, con «Sincronizado desde ERP»                                                                       | Alta, edición y baja                                             |

Un único entregable hoy: `backoffice/` (Vue 3 + Vite + TS + Pinia + Tailwind v4), con el sistema de
diseño «Mesa». Todo funciona **sobre datos de ejemplo**: las vistas nunca leen datos, siempre llaman
a un servicio, y el mock se sustituye por HTTP sin tocar las vistas.

## 2. Estado por fase

| Fase                              | Objetivo                                                    | Estado                 |
| --------------------------------- | ----------------------------------------------------------- | ---------------------- |
| F0 · Higiene                      | Git, lint, formato, tipos y pruebas                         | ✅                     |
| F1 · Cimientos                    | Componentes `Km*` y capa de datos mock                      | ✅                     |
| F2 · Configuración                | Configuración de la vertical y por local, permisos, canales | ✅                     |
| F3 · Sala y carta                 | Imagen, combos, precio por canal, mesas unidas              | ✅                     |
| F4 · Abastecimiento               | Rehecha según D-004 y D-005, por subfases                   | 🔨 En curso            |
| F5 · Personal y permisos          | Catálogo de permisos, turnos, bitácora                      | ✅                     |
| F6.1 · Clientes y reservas        | Cliente del ERP con ficha de sala, reservas por mesa y cupo | ✅                     |
| **F6.2 · Delivery y promociones** | Zonas de reparto y reglas de promociones para el POS        | 🔨 **Lo siguiente**    |
| F7 · Ventas y caja                | Pedido, comanda, cuenta y cobro                             | ⚠️ Alcance por decidir |
| F8 · Comprobantes                 | Boletas, facturas y notas de crédito                        | ⏳                     |
| F9 · Reportes                     | Ventas, rentabilidad por plato, consumo y mermas            | ⏳                     |
| F10 · Pulido                      | Accesibilidad, rendimiento y diccionario de entidades       | ⏳                     |

### F4 · Abastecimiento, al detalle

| Subfase                                   | Qué entrega                                                                                            | Estado |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| F4.1 · Límite con el ERP                  | Retiros, maestros del ERP en solo lectura, artículos y proveedores de consulta                         | ✅     |
| F4.2 · Áreas                              | Maestro de áreas y a qué área se comanda cada producto                                                 | ✅     |
| F4.3 · Insumos y reglas de abastecimiento | Insumo de la vertical, conversión y transformación, parámetros heredados, ubicaciones, stock detallado | ✅     |
| F4.4 · Solicitudes y requerimientos       | Solicitud por área, requerimiento por local y su seguimiento                                           | ✅     |
| F4.5 · Recepción y transformación         | Recepción con y sin OC, lotes, ubicación, artículos por procesar                                       | ✅     |
| F4.5.1 · Zonas y modos de integración     | Almacén por local con zonas, cadena opcional, modo de integración por capacidad (D-008, D-009)         | ✅     |
| F4.5.2 · Lista de precios                 | Productos vendibles, listas por local y canal, vigencias y descuentos (D-010)                          | ✅     |
| F4.6.1 · Receta y costos                  | Receta por presentación, versiones, costos netos y food cost configurable (D-007)                      | ✅     |
| F4.6.2 · Ficha y capacidades              | Ficha técnica, aprobación, capacidades del insumo, reventa 1:1, modificadores con insumos              | ✅     |
| F4.6.3 · Carta por local y canal          | Agrupación de categorías, categoría y producto por local y canal, objetivo por categoría               | ✅     |

## 3. Lo siguiente

1. **F6.2** — zonas de reparto y reglas de promociones para el POS.
2. **F7 a F9** — operación y análisis.

## 4. Decisiones abiertas

| #     | Decisión                                                                                                                                               | Bloquea          | Notas                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------- |
| **A** | POS: ✅ decidido. La caja con estilo de back office se construye en este proyecto; la app del mesero es otro proyecto de la suite con los mismos datos | F7               | Queda definir el alcance de la caja al empezar F7.                                          |
| **B** | Backend: stack y forma (monolito modular vs. servicios)                                                                                                | Integración real | Karma Corp ya tiene plataforma: conviene alinear con el resto del ERP, no elegir por gusto. |
| **C** | Transporte en tiempo real para comanda y KDS                                                                                                           | F7               | WebSocket propio o servicio gestionado; afecta coste y complejidad de reconexión.           |
| **D** | Facturación electrónica: OSE de terceros o integración directa                                                                                         | F8               | Probablemente ya resuelto en el ERP; confirmar antes de diseñar nada.                       |

Las decisiones ya cerradas (D-001 a D-010) están en
[decisiones.md](backoffice/docs/guia/decisiones.md). Las que funcionan pero deben validarse con
datos reales están al final del [roadmap](backoffice/docs/guia/roadmap.md).

## 5. Trabajo transversal

Acompaña a todas las fases, no es una fase.

- **Accesibilidad** — contrastes medidos; falta auditar teclado y lector de pantalla en el plano de mesas.
- **Rendimiento** — virtualizar tablas cuando la carta pase de ~200 productos.
- **CI/CD** — `npm run verify` en cada push; publicación de docs y demo ya automatizada.
- **Semilla realista** — se amplía en cada fase, con las entidades de esa fase.
- **Observabilidad** — registro de errores de cliente (con backend).

## 6. Regla de trabajo

No se construye una pantalla operativa sobre un maestro que todavía no existe, y no se cierra una
fase sin `npm run verify` en verde, su entrada en el [roadmap](backoffice/docs/guia/roadmap.md) y sus
entidades documentadas en [entidades.md](backoffice/docs/guia/entidades.md).
