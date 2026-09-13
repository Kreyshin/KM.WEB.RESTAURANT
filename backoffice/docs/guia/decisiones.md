# Decisiones de diseño

Registro de decisiones discutibles del modelo y la interfaz. Cada entrada se escribe **antes** de construir, para revisarla a tiempo.

## Cómo se decide

Una lista cerrada (definida en código) frente a algo configurable (definido por el usuario) se evalúa desde tres frentes, pensando en lo que se prevé útil y no solo en lo que existe hoy:

| Frente         | Pregunta                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------- |
| **Usuario**    | ¿Entiende qué hace el campo y cuándo se usa? ¿Lo obliga a clasificar sin beneficio visible? |
| **Negocio**    | ¿Es una decisión que el restaurante cambia con el tiempo? Entonces debe ser configurable.   |
| **Desarrollo** | ¿Añadir un valor nuevo exige programar un flujo? ¿Cuánto cuesta y quién puede hacerlo?      |

Reglas de trabajo:

- Todo campo nuevo responde **quién lo usa y cuándo**. Si es para una fase futura, la pantalla lo indica.
- El sistema es **lógico, no cerrado**: se cierran solo los valores que corresponden a flujos programados; las condiciones de negocio son datos.

## D-001 · Canales de venta y modalidad de atención

**Contexto.** La pantalla de canales tenía una columna «Tipo» (lista fija) que parecía repetir el nombre del canal, no se usaba en ninguna pantalla y no explicaba su propósito.

**Alternativas evaluadas.**

| Opción                                           | Usuario                      | Negocio                                               | Desarrollo                                                              |
| ------------------------------------------------ | ---------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Solo nombre de canal                             | Simple                       | El sistema no sabe si pedir mesa o dirección          | Imposible programar la operación                                        |
| Opciones sueltas por canal (¿mesa?, ¿dirección?) | Flexible, pero más campos    | Permite combinaciones sin sentido que hay que validar | Cada opción sigue exigiendo código; la agrupación en reportes se pierde |
| **Modalidad cerrada + condiciones por canal**    | Una elección con ayuda clara | Comisión, recargo y precios son datos del canal       | Una modalidad nueva = un flujo nuevo, coste acotado y explícito         |

**Decisión.** Separar dos conceptos:

- **Modalidad de atención** (cerrada): _En mesa_, _Mostrador o para llevar_, _Reparto propio_, _App de delivery_. Define qué pide la operación. Añadir una nueva requiere desarrollo porque implica un flujo de pantalla distinto.
- **Canal** (configurable): nombre, comisión (solo apps), si cobra recargo al consumo, precios propios en la carta y estado.

**Consecuencias.**

- La modalidad se muestra bajo el nombre, sin columna propia, con ayuda en el formulario.
- La comisión solo existe en apps de delivery.
- El recargo al consumo se decide en cada canal; Impuestos solo define el porcentaje.
- Revisar al construir Ventas (F7): si aparece una forma de atención que no encaja en las cuatro, se evalúa con esta misma tabla antes de añadirla.

## D-002 · Inventario: qué opera el restaurante y qué queda en el ERP

**Contexto.** El back office tenía un modal para registrar cualquier movimiento insumo por insumo (entrada, salida, merma, ajuste, traslado). Con un ERP que hace de núcleo, ese registro manual duplica funciones; y pedir mercadería entre almacenes es un documento con varias líneas, no un movimiento suelto.

**Alternativas evaluadas.**

| Opción                                                    | Usuario                                       | Negocio                                       | Desarrollo                                  |
| --------------------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| Todo el inventario en el back office                      | Una sola herramienta, pero compite con el ERP | Dos fuentes de verdad para stock y costo      | Duplica kardex, costos y ajustes            |
| Nada de inventario (todo al ERP)                          | Cocina y barra dependen de otra herramienta   | Se pierde lo propio: recetas, mermas, pedidos | El ERP tendría que conocer recetas y turnos |
| **Operación de la vertical aquí, núcleo contable en ERP** | Cada rol hace lo suyo donde trabaja           | Stock valorizado en un solo sitio (ERP)       | Integración por movimientos con referencia  |

**Decisión.**

- **Aquí (restaurante):** pedidos internos entre almacenes (pedir → despachar → recibir), mermas operativas, producción de preparaciones y descuento por receta. Movimientos y kardex son de consulta.
- **ERP (núcleo):** entradas y salidas manuales, ajustes valorizados, costo oficial y toma de inventario especializada.
- Los pedidos mueven stock en dos pasos: **sale al despachar**, **entra al recibir**. Lo despachado que no llega se registra como merma «Faltante en traslado».

**Pendiente de evaluar (vertical).** Condición de conservación del insumo (ambiente, refrigerado, congelado) y qué admite cada almacén; vida útil y vencimientos; unidad de compra frente a unidad de uso. Afectan a qué se puede pedir o trasladar y a las alertas.

## D-003 · Unidades para pedir y recepcionar

**Contexto.** Hay insumos que se piden por empaque (bidón, caja, jaba) y otros por peso. Las conversiones completas (presentaciones de proveedor, empaques múltiples) son responsabilidad del ERP.

**Decisión (básica).**

- El stock, el kardex, los costos y las recetas siguen en la **unidad del insumo** (kg, L, u.).
- Cada insumo tiene como máximo **una unidad para pedir** y **una para recepcionar**, cada una con su equivalencia fija (Jaba x30 = 30 u.). Sin valor, se usa la unidad del insumo.
- Pedidos internos: se pide en la unidad de pedido; se despacha y se recibe en la unidad de recepción. Los movimientos se registran convertidos a la unidad del insumo.
- La sugerencia bajo mínimo pide unidades enteras de pedido sin superar lo disponible en origen.

**Con ERP.** Las equivalencias llegan del ERP; la ficha del insumo solo las muestra o permite ajustarlas mientras no haya integración. Varias presentaciones por insumo, redondeos y conversiones de proveedor quedan fuera del restaurante.
