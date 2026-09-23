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
- **Ordena sin obligar** (D-007): todo control avanzado tiene un modo simple por defecto y se activa por configuración de cadena o local.

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
- **Comanda:** cada área recibe **todos los productos** (opción por defecto con una sola área) o **los seleccionados** por categoría o producto. Un producto en dos áreas se comanda a ambas; uno sin área se avisa en la revisión de comandas del local.
- El producto **no guarda** su área: el destino se deduce de las áreas, así una carta compartida funciona distinto en cada local. La ficha del producto muestra «Se comanda en» por local.
- Un área puede **no recibir comandas** (recepción, almacén): solo solicita. El área se ubica en un **salón** de su mismo local (o fuera de los salones, como recepción); dos áreas pueden llamarse igual si están en salones distintos. El salón pertenece a un local.

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

**Para después.** Traslados entre almacenes o locales; toma de inventario (ERP).

## D-005 · Límite ERP ↔ vertical y permisos

**Contexto.** El restaurante no es un sistema autónomo: depende de un ERP que es dueño de los maestros y del núcleo contable y logístico. Lo propio del rubro es la operación: tomar pedidos en mesa y barra, comandar y cobrar.

**Decisión.**

| Del ERP (solo lectura, «Sincronizado desde ERP»)                                                                         | De la vertical                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Empresa, series, impuestos, locales, almacenes, medios de pago, proveedores, artículos, marcas, roles, órdenes de compra | Canales de venta, áreas, insumos, reglas de abastecimiento, recetas, carta, combos, salones y mesas, solicitudes, requerimientos, recepción |

- El **horario de atención** del local también viene del ERP: puede servir a otras verticales.
- El **acceso a locales y almacenes** (ver o gestionar) se asigna y se bloquea en el ERP. La vertical no tiene pantalla para asignarlo: filtra lo que muestra según ese dato.
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

## D-007 · Receta estandarizada, food cost y control configurable

**Contexto.** Se contrastó el modelo con un sistema en producción (tres webinars de Restaurant.pe: productos y recetas, food cost, estandarización). El seguimiento concepto por concepto, con las notas del usuario, está en el artefacto «Contraste Restaurant.pe»: 57 conceptos, 46 adoptados, 9 postergados y 2 descartados.

**Principio transversal: ordenar sin obligar.** Un restaurante pequeño mide todo por unidad y no tiene procesos formales; uno establecido controla mermas, rendimientos y aprobaciones. Cada control avanzado nace como **parámetro con modo simple por defecto**, heredado Cadena → Local (el mismo patrón de los parámetros de abastecimiento). Aplica a: cantidad bruta/neta, rendimiento por insumo, ficha técnica, aprobación de versiones, vida útil validada, registro de desperdicio con responsable y bitácora de mermas.

**Decisión.**

| Tema        | Decisión                                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modelo      | Se mantiene artículo (ERP) → insumo (vertical) → producto. El insumo tiene capacidades: comprable, producible o ambas; cada lote guarda su origen. La reventa crea sola su receta 1:1. Preparaciones de varios niveles, sin ciclos.                                                                                                                                      |
| Receta      | Vive en la **presentación** (un producto sin presentaciones tiene una implícita). Unidad de uso convertible solo en la misma dimensión. Cantidad bruta o neta **opcional** según configuración. Versiones con vigencia; la aprobación y la ficha técnica completa son opcionales. Duplicar y escalar presentaciones.                                                     |
| Rendimiento | Rendimiento % opcional en el insumo para acondicionamiento simple; lo que da subproductos sigue siendo Transformación. El costo útil **se divide entre el rendimiento**, nunca se suma el % de merma.                                                                                                                                                                    |
| Costos      | Todo en **valores netos**. Costo de receta completo, parcial o desactualizado. Participación de cada ingrediente. Consumibles y costo variable total por canal. «Margen» pasa a **margen de contribución**. Objetivo de food cost heredado por cadena, local, categoría y presentación (fin del 30 %/35 % fijo). Simulador de precio que no cambia nada hasta confirmar. |
| Producción  | Parte de producción que escala la receta, exige asignar la diferencia y crea el lote con responsable y vencimiento (vida útil simple o validada).                                                                                                                                                                                                                        |
| Venta       | Cada venta guarda versión, costo y precio neto. Anulación con movimientos inversos. **Momento del descuento de stock** (al comandar o al cobrar) es parámetro de negocio. Plato fallido como desperdicio sin tocar la receta, con un flujo simple además del avanzado.                                                                                                   |
| Unidades    | Se recepciona en la unidad del artículo y la transformación genera N unidades de insumo: es núcleo y respeta el límite con el ERP.                                                                                                                                                                                                                                       |

**Descartado.** Cuenta contable por categoría y **cierre de período**: el ERP ya recibe ventas, compras e inventario por interfaces; la vertical no cierra ni reenvía información a una raíz. El food cost real se calcula leyendo lo que el ERP ya tiene.

**Postergado.** Producto favorito, comisión por presentación, presentaciones de peso variable, food cost teórico del período, comparación entre sucursales, tipos de salida (merma, desperdicio, cortesía, consumo interno), almacén de consumo del área, vender sin stock y alertas.

**Conceptos nuevos que abren decisiones** (ver «Decisiones abiertas» del plan):

- **Sucursal y local.** La sucursal agrupa locales (región o zona: San Borja 1 y San Borja 2). El ERP debería enviar sucursal y local de venta; hoy la vertical solo conoce local.
- **Lista de precios.** La vertical arma el detalle, en valores netos, y lo informa al ERP; el ERP puede editarlo registrando el motivo. El historial de precios de compra sale de la OC del ERP comparada con el requerimiento.
- **Canales de la categoría** también deciden qué se publica en integraciones con apps externas.
- **Fidelización** será otro sistema; el back office solo configura sus reglas para el POS.
- **Dos puntos de venta** de la misma suite: caja con estilo de back office y app del mesero, con datos compartidos.
- **Plan diario de consumo**: prever comensales y stock antes del servicio, con excepciones durante el día.
- **Módulo de análisis** aparte (posiblemente de pago): bitácora de mermas y comparaciones, sin influir en la operación.

## D-008 · Empresa, sucursal de venta, cadena y local

**Contexto.** Un grupo puede operar varios conceptos (cevicherías, hamburgueserías) repartidos en zonas (Lima, Provincia). La vertical usaba «cadena» para referirse a toda la empresa y no tenía cómo configurar un concepto distinto de otro sin repetir cada local.

**Decisión.** Dos agrupaciones independientes sobre los mismos locales:

| Nivel                 | Dueño                                  | Para qué                                                                                                                                  |
| --------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Empresa**           | ERP (con configuración de la vertical) | Razón social. Impuestos y lo de peso vienen del ERP; la vertical guarda aquí sus valores base                                             |
| **Sucursal de venta** | ERP                                    | Agrupación administrativa o geográfica de locales para ventas y procesos de venta. La vertical no la configura; el acceso se da en el ERP |
| **Cadena**            | Vertical                               | Agrupación por concepto de negocio: carta, recetas, parámetros de la vertical y objetivo de food cost                                     |
| **Local** (de venta)  | ERP (con configuración de la vertical) | Excepciones del local. En la vertical se sigue llamando «Local»                                                                           |

Ejemplo: Sucursal Lima → Cevichería 1, Cevichería 2, Hamburguesería 1; Sucursal Provincia → Cevichería 3, Hamburguesería 3. Cadena Cevicherías → Cevichería 1, 2 y 3; Cadena Hamburgueserías → las hamburgueserías.

- **Herencia de la vertical:** Empresa → Cadena → Local. En abastecimiento continúa Almacén → Categoría → Insumo.
- Un local pertenece **como mucho a una cadena**. La cadena es **opcional**: un local sin cadena hereda directo de la Empresa. Quien tiene uno o pocos locales no crea cadenas ni se consulta ese nivel; técnicamente, la cadena solo se resuelve cuando existe (sin joins permanentes).
- **Acceso:** el acceso a una cadena se asigna en la vertical; el acceso a cada local viene del núcleo del ERP. Tener acceso a una cadena no da acceso a todos sus locales: permite configurar lo de la cadena y operar solo los locales que el ERP concede.
- **Lista de precios:** es por local (configuración de la vertical por local). La cadena no interviene.
- En el sistema, lo que hoy dice «Cadena» refiriéndose a toda la empresa pasa a decir **«Empresa»**.

## D-009 · Núcleo mínimo, integración por capacidad y zonas

**Contexto.** Karma es una plataforma con núcleo, módulos del ERP (ventas, inventarios, contabilidad, planillas…) y varias verticales (restaurante, ropa, gimnasio, ferretería). Cada vertical se vende sola como suite completa de su rubro y puede crecer conectándose al ERP. Los ERP tradicionales acoplan módulos por instalación y eso resta flexibilidad comercial.

**Decisión 1 · Núcleo mínimo.** El núcleo contiene solo lo que cualquier módulo necesita para existir: empresa, usuarios, roles y accesos, y parámetros generales de empresa. **Módulos del ERP y verticales son pares** sobre el núcleo. La sucursal y el local de venta son de Ventas; la sucursal de inventario y los almacenes, de Inventarios. Si hace falta un lugar físico común (dirección, código anexo SUNAT), lo decide el equipo del ERP.

**Decisión 2 · La vertical es dueña de sus tablas.** Registra siempre sus locales, almacenes, precios o turnos, aunque exista el módulo equivalente del ERP. «Básico» no es recortado: es la suite completa del rubro más funciones mínimas de otros dominios (lista de precios, almacén, marcación de turno) que invitan a crecer.

**Decisión 3 · Integración por capacidad.** Cada tema que puede conversar con el ERP (precios, inventario, compras, ventas, asistencia, contabilidad) tiene un modo:

| Modo                       | Qué pasa                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Autónomo** (por defecto) | La vertical registra y decide sola                                                                                                                     |
| **Sincronizado**           | La vertical sigue registrando en sus tablas y homologa con el ERP en ambos sentidos; en conflicto decide el ERP y ambos registran el cambio con motivo |
| **Delegado**               | El ERP opera; la vertical consulta y propone                                                                                                           |

- **Instalar un módulo no conecta nada.** El modo se decide aparte.
- **Alcance:** por empresa, con excepción por local (probar la integración en un local nuevo).
- **Lo configura Karma** desde su consola, acordado con el cliente; el cliente no tiene esa pantalla.
- **Transición registrada:** al sincronizar hay carga inicial y vínculo de registros; al volver a autónomo la vertical conserva sus datos.
- **Kit compartido entre verticales:** tabla de vínculos (entidad ↔ id externo, estado, versión), eventos de salida y entrada, política de conflicto por capacidad y lectura del modo. El código de la vertical pregunta el modo de la capacidad, nunca «¿está el ERP?».

**Decisión 4 · Zonas dentro del almacén.**

| Nivel                    | Dueño                                              | Ejemplo                         |
| ------------------------ | -------------------------------------------------- | ------------------------------- |
| **Almacén**              | Vertical, vinculado a Inventarios si se sincroniza | Almacén Miraflores              |
| **Zona**                 | Vertical                                           | Cámara de frío, Barra, Despensa |
| **Ubicación** (opcional) | Vertical                                           | Cámara · Rack 1 · Fila 2        |

- **Un almacén por local** por ahora; más adelante se evaluará un depósito externo o un centro de producción.
- Los movimientos entre zonas son internos: el ERP ve el total del almacén.
- Los parámetros de abastecimiento usan **Zona** donde hoy dicen Almacén.
- **Acceso por zona:** configuración de la vertical (el bartender solo gestiona la barra). El acceso al almacén viene del ERP cuando está sincronizado.
- La idea es transversal (sububicaciones); cada vertical la nombra a su manera.

## D-010 · Productos vendibles y lista de precios

**Contexto.** La lista de precios vive en la vertical (D-009) y debe homologarse con Ventas y Contabilidad del ERP sin que el comprobante, el asiento y el kardex se contradigan.

**Regla de coherencia.** Una venta tiene tres vistas enlazadas por su identificador: el **comprobante** (lo que compró el cliente), el **asiento** (el ingreso, con los mismos conceptos del comprobante, y el costo) y el **kardex** (los insumos consumidos). Pueden nombrar cosas distintas —«Combo marino» frente a «lenguado, limón, pisco»— siempre que el ingreso cuadre con los comprobantes y el costo con el kardex valorizado.

**Decisión.**

1. **Presentación = producto vendible propio**, con código, precio, afectación y receta. El producto de carta las agrupa; sin presentaciones tiene una implícita.
2. **Combo** con línea propia en la lista y **una sola línea en el comprobante**. Consume la receta de los componentes elegidos y guarda un **reparto analítico** del precio entre ellos (proporcional a su precio de lista), que no cambia el comprobante. Se desglosa solo si mezcla afectaciones tributarias.
3. **Modificador con recargo = producto vendible «adicional»** con precio en la lista; en el comprobante, línea aparte por defecto (configurable para sumarla al plato). El modificador sin recargo solo ajusta la receta.
4. **Una lista por local y canal** (Salón, Delivery, Rappi…), que puede **derivarse de otra con un ajuste %**. La comisión de las apps es gasto, no rebaja de precio.
5. **Descuento de lista** por línea, en % o monto, con vigencia. Lo condicionado (2×1, horario, cupón, cliente) va a Promociones (F6). En el comprobante, descuento por ítem; el ingreso se registra neto.
6. **Vigencias:** una lista base sin vigencia por local y canal; las de temporada prevalecen mientras rigen y no pueden solaparse. Lo que no está en la de temporada toma la base.
7. **Con o sin IGV** por empresa, con excepción por lista. La tasa viene del ERP y cada venta guarda su foto (valor, IGV, tasa). El recargo al consumo se calcula aparte.
8. **Código:** la vertical usa el suyo; en modo sincronizado la tabla de vínculos guarda el del ERP; en delegado lo asigna el ERP.

**A validar con el contador:** tasa y régimen de IGV del restaurante, recargo al consumo, cortesías como transferencia gratuita, consumo del personal y propinas.
