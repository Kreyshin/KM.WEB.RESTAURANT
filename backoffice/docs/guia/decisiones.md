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

> **Reemplazada por D-004 y D-005.** Los pedidos internos entre almacenes se retiran: aún no aplican a un almacén de restaurante.

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

> **Reemplazada por D-004.** Las unidades de compra son del artículo del ERP; la conversión al insumo la define la regla de abastecimiento.

**Contexto.** Hay insumos que se piden por empaque (bidón, caja, jaba) y otros por peso. Las conversiones completas (presentaciones de proveedor, empaques múltiples) son responsabilidad del ERP.

**Decisión (básica).**

- El stock, el kardex, los costos y las recetas siguen en la **unidad del insumo** (kg, L, u.).
- Cada insumo tiene como máximo **una unidad para pedir** y **una para recepcionar**, cada una con su equivalencia fija (Jaba x30 = 30 u.). Sin valor, se usa la unidad del insumo.
- Pedidos internos: se pide en la unidad de pedido; se despacha y se recibe en la unidad de recepción. Los movimientos se registran convertidos a la unidad del insumo.
- La sugerencia bajo mínimo pide unidades enteras de pedido sin superar lo disponible en origen.

**Con ERP.** Las equivalencias llegan del ERP; la ficha del insumo solo las muestra o permite ajustarlas mientras no haya integración. Varias presentaciones por insumo, redondeos y conversiones de proveedor quedan fuera del restaurante.

## D-004 · Abastecimiento: artículos, insumos, compras y recepción

**Contexto.** El restaurante es una vertical sobre un ERP (ver D-005). El ERP compra **artículos** con sus unidades, marcas y proveedores; la cocina y la barra trabajan con **insumos**; la carta vende **productos**. Entre lo que se compra y lo que se usa puede haber una conversión simple o un proceso de transformación.

### Conceptos

| Concepto     | Dueño                | Qué es                                  | Unidad                                   |
| ------------ | -------------------- | --------------------------------------- | ---------------------------------------- |
| **Artículo** | ERP (solo lectura)   | Lo que se compra, con marca y proveedor | Unidad de compra (caja, saco, kg)        |
| **Insumo**   | Vertical (solo aquí) | Lo que usan cocina y barra              | Unidad de uso (kg, L, ml, u.)            |
| **Producto** | Vertical             | Lo que se vende: plato, bebida, combo   | Unidad de venta (plato, vaso, jarra, u.) |

- **Producto → insumos:** receta de venta. La reventa (Inca Kola) también pasa por un insumo: así puede usarse en una preparación.
- **Artículo → insumo:** regla de abastecimiento.

**Criterio para separar insumos.** Un insumo se separa solo cuando cambia lo que se vende o cómo se usa en la receta. Marca y presentación de compra son del artículo.

| Caso                           | Insumos                                   | Artículos que lo abastecen        |
| ------------------------------ | ----------------------------------------- | --------------------------------- |
| La marca no importa            | «Aceite vegetal»                          | Aceite marca A 5 L, marca B 1 L   |
| La marca es lo que se vende    | «Inca Kola 500 ml», «Coca-Cola 500 ml»    | Uno por marca y presentación      |
| Solo importa el insumo final   | «Filete de pescado»                       | Pescado lenguado, pescado corvina |
| Se quiere saber qué se consume | «Filete de lenguado», «Filete de corvina» | Uno por especie                   |

### Reglas de abastecimiento

- **Conversión directa:** factor fijo (1 caja x12 → 12 u.). Se aplica **automáticamente al recepcionar**.
- **Transformación:** receta de transformación con rendimiento esperado (10 kg pescado → 6 kg filete + 1.5 kg cabeza y espinas + merma). Cada salida se define como **insumo** o **merma**. Al registrarla, el usuario confirma lo que salió realmente y puede enviar a merma una salida esperada, con motivo. Mientras no se transforma, el artículo queda **por procesar**.
- Los artículos vinculados a un mismo insumo son sus **alternos**.
- **Vencimiento al transformar** (a investigar con pruebas): heredar el del lote de origen, nueva vida útil o la menor de ambas (propuesta por defecto).

### Stock, lotes y ubicaciones

- **Stock principal:** insumo × almacén, siempre.
- **Stock detallado:** insumo × almacén × lote × ubicación, solo para insumos que lo usan. Lote y ubicación son **opcionales e independientes**: solo lote, solo ubicación, ambos o ninguno.
- **Parámetros** (lote, vencimiento, FEFO, alertas, bloqueo de vencidos, ubicación, tipo de recepción) se heredan: **Cadena → Local → Almacén → Categoría → Insumo**; el nivel más específico gana. Se validará con un flujo de pruebas.
- **Lote:** si el ERP lo envía, se respeta; si no, el local puede crearlo y asignar vencimiento.
- **Ubicación:** estante, fila, columna, pasillo. Todo insumo con ubicación tiene una **ubicación por defecto por almacén**; la recepción deja el stock ahí automáticamente. Sin ella, no se puede recepcionar. Un WMS más avanzado queda para después.

### Áreas

- Maestro configurable (reemplaza a las estaciones de producción): puede haber varias del mismo tipo, por piso o sala. Pertenece a un local.
- **Comanda:** cada área recibe **todos los productos** (opción por defecto con una sola área) o **los seleccionados** por categoría o producto. Un producto en dos áreas se comanda a ambas; uno sin área se avisa al guardar.

### Flujo de compras

1. **Solicitud de compra** (por área): pide **insumos**, con marca preferida opcional (solo las marcas de sus artículos). Estados: Borrador → Enviada → Atendida / Rechazada.
2. **Requerimiento de compra** (por local): consolida solicitudes o se crea directo. Traduce insumos a **artículos** con la regla por defecto. El sistema **sugiere el proveedor** (maestro global del ERP) según configuración e historial. Ajustar cantidades al consolidar requiere permiso.
   Estados: **Borrador → Enviado → Aprobado → Convertido → Despachado → Recepcionado**, y **Anulado** mientras no haya sido tomado ni aprobado.
   - Muestra el n.° de OC y si la conversión fue **total o parcial** por línea.
   - Línea **no disponible** → alerta → reemplazo por un artículo alterno.
3. **Aprobación, OC y despacho:** en el ERP (o el proveedor informa el despacho); la vertical lo refleja.
4. **Recepción** (en la vertical, informa al ERP): **total** o **a detalle**, admite parcial. Aplica conversión directa, lote y ubicación según el insumo; deja por procesar lo que requiere transformación.

### Ingreso sin orden de compra

Permitido según configuración, para compras de emergencia o de mercado. Controles combinables:

- Comprobante obligatorio: tipo, serie y número, proveedor u «ocasional», monto y foto.
- Tope por ingreso o por día sin aprobación.
- Motivo obligatorio.
- El stock entra de inmediato, pero el ingreso queda **Pendiente de regularizar** hasta que administración lo valide.

**Para después.** Concepto de cadena (Cevichería, Hamburguesas) que agrupa locales y categorías por concepto; traslados entre almacenes o locales; toma de inventario (ERP).

## D-005 · Límite ERP ↔ vertical y permisos

**Contexto.** El restaurante no es un sistema autónomo: depende de un ERP que es dueño de los maestros y del núcleo contable y logístico. Lo propio del rubro es la operación: tomar pedidos en mesa y barra, comandar y cobrar.

**Decisión.**

| Del ERP (solo lectura, «Sincronizado desde ERP»)                                                                         | De la vertical                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Empresa, series, impuestos, locales, almacenes, medios de pago, proveedores, artículos, marcas, roles, órdenes de compra | Canales de venta, áreas, insumos, reglas de abastecimiento, recetas, carta, combos, salones y mesas, solicitudes, requerimientos, recepción |

- El **horario de atención** del local también viene del ERP: puede servir a otras verticales.
- Se retiran del back office: pedidos internos, toma de inventario y el mantenimiento de proveedores y órdenes de compra _(hecho en F4.1)_.
- Artículos, proveedores, marcas y almacenes se consultan en solo lectura desde `erp.service.ts`.
- **Permisos:** los roles vienen del ERP y no se crean aquí. La vertical asigna **permisos de la vertical a cada rol del ERP** (el mismo rol puede funcionar distinto en otra vertical) y admite **ajustes por usuario**. Los define un administrador; el usuario solo cambia preferencias sin impacto (tema, colores).

## D-006 · Configuración de la vertical: global, por local y permisos

**Contexto.** Empresa, locales, impuestos y medios de pago se gestionan enteramente en el ERP. Mostrarlos en la vertical, aunque sea en solo lectura, es carga sin valor para el usuario del restaurante. En cambio, la vertical sí necesita decidir cómo funciona, y eso puede variar por local.

**Decisión.**

- Se **quitan** del back office las pantallas de empresa, locales, impuestos, medios de pago y series de comprobantes. Sus datos se siguen usando internamente (selector de local, cálculo de tickets).
- Se crea la sección **Configuración** con cuatro partes:

| Parte                            | Alcance                                     | Quién la ve                                                                                                                |
| -------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Configuración de la vertical** | Toda la cadena                              | Administrador de la vertical                                                                                               |
| **Configuración por local**      | Un local                                    | Cada usuario ve solo los locales a los que tiene acceso (dato del ERP): con uno, configura el suyo; con varios, elige cuál |
| **Permisos por rol**             | Permisos de la vertical para un rol del ERP | Administrador; los roles no se crean aquí                                                                                  |
| **Excepciones por usuario**      | Ajustes sobre los permisos de su rol        | Administrador                                                                                                              |

- **Herencia:** un local sin valor propio usa el de la vertical (base de la cadena Cadena → Local → Almacén → Categoría → Insumo de D-004).
- Los catálogos de **parámetros** y **permisos** empiezan vacíos. Cada fase añade sus definiciones en `parametros.service.ts` y las pantallas las muestran sin cambios.
- También se quitan las **series de comprobantes**: la numeración la gestiona el ERP.
- Canales de venta, estaciones e impresoras y motivos siguen en Configuración.
