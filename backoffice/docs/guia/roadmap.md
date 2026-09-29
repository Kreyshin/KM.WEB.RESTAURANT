# Roadmap

Fases de **front-end** sobre datos de ejemplo. Una fase no empieza sin los maestros que necesita.

> **Reencuadre (D-004, D-005).** El restaurante es una **vertical sobre un ERP**: los maestros del ERP se muestran de solo lectura y la vertical se centra en su operación. **F4 se rehace** con ese criterio.

| Fase                              | Grupo     | Objetivo                                                    | Estado         |
| --------------------------------- | --------- | ----------------------------------------------------------- | -------------- |
| F0 · Higiene                      | Base      | Git, lint, formato, tipos y pruebas                         | ✅ Hecha       |
| F1 · Cimientos de interfaz y mock | Base      | Componentes y capa de datos reutilizables                   | ✅ Hecha\*     |
| F2 · Configuración                | Base      | Configuración de la vertical y por local, permisos, canales | ✅ Hecha       |
| F3 · Sala y carta                 | Maestros  | Cierre de sala y carta: imagen, combos, precio por canal    | ✅ Hecha       |
| F4 · Abastecimiento               | Maestros  | Límite ERP, áreas, insumos, requerimientos, recepción       | ✅ Hecha       |
| F5 · Personal y permisos          | Maestros  | Catálogo de permisos, turnos y bitácora                     | ✅ Hecha       |
| F6 · Clientes y promociones       | Maestros  | Clientes, reservas, delivery y reglas de promociones        | ✅ Hecha       |
| F7 · Ventas y caja                | Operación | Pedido, comanda, cuenta y cobro · alcance por decidir       | ⚠️ Por decidir |
| F8 · Comprobantes                 | Operación | Boletas, facturas y notas de crédito con estados simulados  | ✅ Hecha       |
| F9 · Reportes y analítica         | Análisis  | Ventas, rentabilidad por plato, consumo y mermas            | Pendiente      |
| F10 · Pulido y entidades          | Análisis  | Accesibilidad, rendimiento y diccionario de entidades       | Pendiente      |

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

## F2 · Configuración

- [x] Datos de empresa: RUC con dígito verificador, razón social, logo
- [x] Locales con horario semanal y código de establecimiento SUNAT
- [x] Impuestos: IGV, recargo al consumo por canal (máx. 13 %) e ICBPER, con ticket de ejemplo
- [x] Medios de pago: efectivo, tarjeta, Yape, Plin, transferencia, crédito
- [x] Canales de venta: salón, para llevar, delivery y plataformas con comisión
- [x] Estaciones de producción e impresoras por local
- [x] Motivos de anulación, descuento y cortesía
- [x] Series y correlativos por local

**Ajuste por D-005 y D-006**

- [x] Quitar empresa, locales, impuestos, medios de pago y series de comprobantes (se gestionan en el ERP)
- [x] Configuración de la vertical (alcance global, sin parámetros aún)
- [x] Configuración por local según los locales a los que accede el usuario (sin parámetros aún)
- [x] Permisos por rol del ERP (sin permisos aún)
- [x] Excepciones por usuario (sin permisos aún)
- [x] Estaciones de producción se convierten en **Áreas** _(F4.2)_

## F3 · Sala y carta

- [x] Unir y separar mesas en el plano (no se separa una unión con la cuenta abierta)
- [x] Imagen de producto
- [x] Combos y menú del día, con precio suelto y ahorro
- [x] Precio por canal de venta
- [x] Horario de disponibilidad por categoría
- [x] Estación de producción por producto _(reemplazada en F4.2: el área define qué productos recibe)_

## F4 · Abastecimiento

Rehecha según [D-004](./decisiones.md) y [D-005](./decisiones.md). Se puede avanzar por partes: cada subfase deja la aplicación funcionando y con sus pruebas.

| Subfase                                       | Qué entrega                                                                                           | Depende de | Estado   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- | -------- |
| **F4.1 · Límite con el ERP**                  | Retiros, maestros del ERP en solo lectura, artículos y proveedores de consulta                        | —          | ✅ Hecha |
| **F4.2 · Áreas**                              | Maestro de áreas y a qué área se comanda cada producto                                                | F4.1       | ✅ Hecha |
| **F4.3 · Insumos y reglas de abastecimiento** | Insumo de la vertical, conversión directa y transformación, parámetros, ubicaciones y stock detallado | F4.1       | ✅ Hecha |
| **F4.4 · Solicitudes y requerimientos**       | Solicitud por área, requerimiento por local y su seguimiento                                          | F4.2, F4.3 | ✅ Hecha |
| **F4.5 · Recepción y transformación**         | Recepción con y sin OC, lotes, ubicación y artículos por procesar                                     | F4.3, F4.4 | ✅ Hecha |
| **F4.5.1 · Zonas e integración**              | Almacén por local con zonas, cadena opcional y modo de integración por capacidad                      | F4.5       | ✅ Hecha |
| **F4.5.2 · Lista de precios**                 | Productos vendibles, listas por local y canal, temporadas, descuentos y reparto de combo              | F4.5.1     | ✅ Hecha |
| **F4.6 · Receta estandarizada y costos**      | Receta por presentación, versiones, rendimiento, costos netos y food cost configurable (D-007)        | F4.5.2     | ✅ Hecha |

### F4.1 · Límite con el ERP

**Retirar**

- [x] Pedidos internos entre almacenes
- [x] Toma de inventario físico
- [x] Mantenimiento de proveedores (alta, edición, baja)
- [x] Órdenes de compra: creación, emisión, anulación y recepción desde la vertical
- [x] Sugerencia de compra actual (se rehace dentro del requerimiento)
- [x] Unidades para pedir y recepcionar del insumo (D-003)

**Pasar a solo lectura** _(con indicador «Sincronizado desde ERP»)_

- [x] Hecho en F2: empresa, locales, impuestos, medios de pago y series retirados (D-006)
- [x] Almacenes

**Nuevo: consultas del ERP** _(Compras → Artículos, Proveedores y Marcas, con filtros por marca y proveedor)_

- [x] Artículos: código, nombre, marca, unidad de compra, proveedor habitual
- [x] Proveedores y marcas

**Se conserva**

- Recetas de venta con costo, margen y food cost
- Movimientos y kardex como **consulta**
- Canales de venta y motivos

### F4.2 · Áreas

- [x] Maestro de áreas por local: nombre, tipo, piso o sala, impresora; admite varias del mismo tipo
- [x] Comanda: «Todos los productos» (por defecto con una sola área) o «Seleccionados» por categoría o producto
- [x] Aviso de productos sin área y de productos en más de un área _(panel «Revisión de comandas» por local)_
- [x] Migrar estaciones de producción existentes a áreas; el producto ya no guarda su estación y muestra «Se comanda en»

### F4.3 · Insumos y reglas de abastecimiento

- [x] Insumo propio de la vertical con unidad de uso y categoría de la cadena
- [x] Vínculo con uno o varios artículos del ERP (alternos) y artículo por defecto _(el proveedor sale del artículo: el insumo ya no lo guarda)_
- [x] **Conversión directa:** factor fijo, aplicada al recepcionar
- [x] **Transformación:** receta con rendimiento esperado; cada salida es insumo o merma, con reparto del costo
- [x] Parámetros heredados **Cadena → Local → Almacén → Categoría → Insumo**: lote, vencimiento, FEFO, alertas, bloqueo de vencidos, ubicación, tipo de recepción _(pantalla con simulador: dice de qué nivel sale cada valor)_
- [x] Ubicaciones (pasillo, estante, fila, columna) y ubicación por defecto por almacén
- [x] Stock principal (insumo × almacén) y stock detallado (lote × ubicación) cuando aplique, con aviso de descuadres
- [x] Preparaciones (subrecetas) actuales encajadas como transformación

Pantallas nuevas: **Transformaciones**, **Stock** (por insumo, por lote, por ubicación y lote × ubicación), **Parámetros de abastecimiento** y **Ubicaciones**.

El **reparto del costo** entre las salidas de una transformación es un porcentaje explícito por salida, que debe sumar 100 %. La merma no absorbe costo, así que lo que se pierde encarece lo que sí sale.

### F4.4 · Solicitudes y requerimientos de compra

- [x] **Solicitud de compra** por área, en insumos, con marca preferida opcional · Borrador → Enviada → Atendida / Rechazada (con motivo)
- [x] **Requerimiento de compra** por local: consolidar solicitudes o crear directo; traducir insumos a artículos (redondeo a unidades de compra); proveedor sugerido; ajuste de cantidades con permiso `compras.ajustarCantidades`
- [x] Estados: Borrador → Enviado → Aprobado → Convertido → Despachado → Recepcionado, y Anulado antes de ser tomado (libera sus solicitudes)
- [x] Seguimiento: avance por etapas, historial, n.° de OC, conversión total o parcial por línea
- [x] Línea no disponible: alerta y reemplazo por un artículo alterno; no se convierte en OC mientras haya alguna

Pantallas nuevas: **Solicitudes de compra** y **Requerimientos de compra**. Aprobar, convertir y despachar llegan del ERP; con datos de ejemplo se simulan desde el seguimiento. El proveedor sugerido es el habitual del artículo: sugerir por historial queda para cuando haya compras reales.

### F4.5 · Recepción y transformación

- [x] Recepción contra OC: **total**, **a detalle** o **ambos** según el parámetro del insumo; admite parcial y completa el requerimiento a «Recepcionado»
- [x] Al recepcionar: conversión con el factor del artículo, lote, vencimiento y ubicación solo si el insumo los controla en ese almacén; lo que el artículo marca «Llega sin procesar» queda **por procesar**
- [x] **Ingreso sin OC** configurable por local: permitido o no, tope, comprobante obligatorio (tipo, serie, número, monto, proveedor u ocasional), motivo y estado «Pendiente de regularizar» con permiso para regularizar
- [x] Solo se registra en almacenes que el usuario **gestiona** según el ERP
- [x] Costo neto de la OC por unidad del insumo alimenta el promedio; variación contra la recepción anterior

**Parte de producción** (D-007)

- [x] Cantidad a procesar que escala entradas y salidas; desde «Por procesar» se abre con lo pendiente
- [x] Modo **simple** (aplica lo esperado) o **detallado** (reales, y la diferencia entre entrada y salidas va a merma con motivo), configurable por local
- [x] Lote del resultado con responsable y vencimiento; vida útil **simple** (propuesta desde el insumo) o **validada** (solo la aprobada), configurable para la cadena
- [x] Estados: en proceso, terminada, rechazada (consume entradas y no produce)
- [x] Consumo de entradas por FEFO en el stock detallado, respetando lotes vencidos bloqueados
- [x] Insumo comprable, producible o **ambos**; cada lote guarda su origen (compra o producción) y su documento
- [x] Bloqueo de dependencias circulares entre transformaciones
- [x] Reparto de costo por cantidad o por valor (costo actual), además del % explícito

Pantallas nuevas: **Compras → Recepción** e **Inventario → Producción**. La **Configuración de la vertical y por local** ya es editable, con herencia visible («Propio de este local», «Heredado de la cadena»).

Queda fuera y se anota como pendiente de revisión: foto del comprobante, vencimiento del producido limitado por el lote de origen, y costo real de la parte frente al costo estándar de la transformación (hoy el insumo producido mantiene el costo estándar y la parte guarda el real).

### F4.5.1 · Zonas y modos de integración ✅

Según [D-009](./decisiones.md). Ajuste del modelo antes de F4.6.

- [x] Un almacén por local; los actuales «Almacén principal», «Cámara de frío» y «Barra» pasan a ser **zonas** del almacén de Miraflores
- [x] Parámetros de abastecimiento: nivel Zona en lugar de Almacén
- [x] Stock por zona con total del almacén; recepción, producción, movimientos y ubicaciones registran en zona
- [x] Acceso por zona configurable en la vertical
- [x] Registro del modo de integración por capacidad (autónomo, sincronizado, delegado) por empresa y local, y tabla de vínculos; en pantalla, «Sincronizado con el ERP» donde corresponda
- [x] Renombrar el nivel general «Cadena» a «Empresa» y agregar la entidad Cadena opcional (D-008)
- [x] Pantallas: Inventario › Almacén y zonas (con quién gestiona cada zona), Configuración › Cadenas y Consola de Karma (/karma/integracion, desde el panel de datos de ejemplo)
- [x] Requerimientos avisa cuando Compras está en modo autónomo

### F4.5.2 · Productos vendibles y lista de precios ✅

Según [D-010](./decisiones.md).

- [x] Presentación como producto vendible con código; producto de carta como agrupador
- [x] Adicional (modificador con recargo) como producto vendible
- [x] Listas por local y canal, derivables con ajuste %, con o sin IGV, vigencia y descuento por línea
- [x] Lista base y listas de temporada sin solaparse; precio vigente resuelto por local, canal y fecha
- [x] Combo con precio de lista y reparto analítico entre componentes
- [x] Migrar el precio por canal de los productos a listas (Rappi pasa a lista derivada +15 %)
- [x] Modo de integración «precios» visible en la pantalla _(envío real al ERP: con backend)_

### Documentación de arquitectura

- [x] Diagramas y explicación (artefacto «Arquitectura Mesa»): núcleo, módulos y verticales; modos de integración; empresa, sucursal de venta, cadena, local, almacén, zona y ubicación; lista de precios; comprobante, asiento y kardex de una venta

### F4.6 · Receta estandarizada y costos

Se entrega en tres partes: **F4.6.1** modelo y costos ✅, **F4.6.2** ficha, aprobación y capacidades del insumo ✅, **F4.6.3** carta por local y canal ✅.

Según [D-007](./decisiones.md). Todo control avanzado es opcional y se activa por cadena o local; el modo por defecto es simple.

**Modelo**

- [x] Capacidades del insumo (comprable, producible) y reventa con receta 1:1 automática _(F4.6.2: comprable, producible o ambas)_
- [x] Receta por presentación; duplicar y escalar presentaciones _(F4.6.1)_
- [x] Unidad de uso convertible en la misma dimensión; unidad del insumo bloqueada cuando ya se usó _(F4.6.1)_
- [x] Cantidad bruta o neta por línea _(opcional)_ y rendimiento % del insumo _(opcional)_, costo útil = costo ÷ rendimiento _(F4.6.1)_
- [x] Notas rápidas separadas de modificadores que suman o quitan insumos _(F4.6.2)_

**Ficha y versiones**

- [x] Versiones con vigencia _(F4.6.1)_
- [x] Aprobación _(opcional)_ que exige rendimiento, componentes con costo y pasos _(F4.6.2)_
- [x] _(F4.6.2)_ Ficha técnica _(opcional)_: pasos con tiempo, temperatura y equipo, conservación, foto de emplatado, tolerancia de peso; alérgenos desde sus insumos

**Costos y food cost**

- [x] Valores netos en food cost, margen y simulador
- [x] Estado del costo: completo, parcial o desactualizado
- [x] Participación de cada ingrediente y clasificación A/B/C
- [x] Consumibles en la receta y costo variable total por canal
- [x] Margen de contribución en lugar de «margen»
- [x] Objetivo de food cost heredado por cadena, local, sección, categoría y presentación
- [x] Simulador de precio desde objetivo o desde precio aceptado
- [x] Recetas afectadas por un aumento de costo de un insumo
- [x] Costo de combos a partir de sus componentes

**Carta** _(F4.6.3)_

- [x] Agrupación de categorías en un nivel desde la misma pantalla: se llama **Sección** («Fondos» agrupa criollos y marinos)
- [x] Categoría por local y por canal, incluidas apps externas; la categoría hereda las restricciones de su sección
- [x] Producto por local: se ofrece o no; el precio por local sale de su lista de precios (D-010)

## F5 · Personal y permisos

Los usuarios y sus roles llegan del ERP; la vertical decide qué puede hacer cada rol dentro de ella.

**Permisos**

- [x] Catálogo de permisos de la vertical por módulo (Carta, Recetas, Inventario, Compras, Personal)
- [x] Asignación editable por rol, con el administrador siempre completo para no quedarse fuera
- [x] Excepciones por persona: conceder o quitar sobre lo de su rol; «quitar» manda
- [x] El permiso «Asignar permisos» controla quién puede cambiar esto

**Turnos**

- [x] Turno por local: nombre, horario (admite cruzar medianoche), días y personal
- [x] Una persona no puede estar en dos turnos que se cruzan el mismo día; solo se asigna a quien tiene acceso al local
- [x] «Ahora mismo»: quién debería estar en el local a esta hora
- [x] Con la capacidad «asistencia» delegada al ERP, los turnos se consultan y no se editan

**Bitácora**

- [x] Registro de acciones sensibles: permisos, turnos, modo de integración, recetas, precios y compras sin OC
- [x] Filtros por módulo, persona, local, fechas y texto, con exportación
- [x] Solo se consulta: no se edita ni se borra
- [ ] Ampliar el registro a ajustes de stock y anulaciones _(cuando existan esas acciones)_

## F6 · Clientes y promociones

Se entrega en dos partes: **F6.1** clientes y reservas ✅, **F6.2** zonas de delivery y reglas de promociones.

**F6.1 · Clientes y reservas**

- [x] Cliente del ERP en solo lectura (documento, contacto, distrito) con su indicador de origen
- [x] **Ficha de sala** propia de la vertical: alergias, etiquetas, notas y salón preferido
- [x] Reservas del local: fecha, hora, duración, personas, mesas, canal y nota
- [x] La mesa queda apartada por la duración: no se reserva dos veces en horas que se cruzan
- [x] Las mesas elegidas deben alcanzar para las personas; no admite mesas inactivas ni de otro local
- [x] Cupo de personas por franja, anticipación máxima y confirmación automática, configurables por local
- [x] Estados: pendiente → confirmada → sentada; cancelar y «no vino» piden motivo y quedan en la bitácora
- [x] Sentar ocupa la mesa; confirmar una reserva de hoy la marca como reservada
- [x] Agenda del día con personas esperadas y reservas por confirmar; las alergias del cliente se ven en la fila
- [x] Permiso «Gestionar reservas»

**F6.2 · Delivery y promociones** ✅

- [x] Zonas de reparto por local: distritos, costo de envío, pedido mínimo y tiempo estimado
- [x] Un distrito solo puede estar en una zona del mismo local: el POS necesita un costo y un tiempo
- [x] Envío gratis desde un monto, propiedad de la zona; el local puede no cobrar envío nunca
- [x] Fuera de cobertura configurable por local: se avisa o se bloquea (D-011)
- [x] «¿Se llega?»: estado, envío, tiempo y cuánto falta para el mínimo, con la explicación del cajero
- [x] Promoción de forma única: a quién alcanza, cuándo rige, cómo se activa, qué exige y qué da
- [x] Beneficio de lista cerrada: %, monto, precio fijo, N×M, producto gratis y envío gratis
- [x] Cupones con usos totales y por cliente; el código no se repite y los usos no se reescriben al editar
- [x] No se acumulan por defecto: manda la prioridad; con acumular activado se suman las combinables
- [x] Tope por promoción (monto o %) y tope de cuenta por local, que recorta desde la menor prioridad
- [x] «¿Qué se aplica?»: lo que entra, cuánto rebaja y **por qué cada promoción se queda fuera**
- [x] Puntos: solo la configuración de las reglas, no el saldo del cliente
- [x] Permisos «Editar zonas de reparto» y «Editar promociones»; los cambios van a la bitácora

## F7 · Ventas y caja

Línea base estándar (D-012): se implanta lo que hacen igual los sistemas de punto de venta de
restaurante, para verlo funcionando y refinarlo con uso. La caja se construye aquí; la app del
mesero es otro proyecto de la suite que consume los mismos datos.

- [x] Cuenta abierta por mesa, mostrador, para llevar o delivery; la modalidad sale del canal
- [x] Una mesa no admite dos cuentas abiertas; abrir la cuenta la ocupa y cobrar la manda a limpieza
- [x] Línea con estado propio: pendiente se quita, comandada se **anula con motivo y permiso**
- [x] Comanda por área según la configuración de comandas, con número propio por área
- [x] Aviso si un producto no tiene área que lo prepare: no se comanda nada a medias
- [x] Precuenta encadenada: consumo → promociones (D-011) → recargo al consumo → envío, con IGV desglosado
- [x] Mover la cuenta de mesa y dividirla en cuentas hijas que se cobran aparte
- [x] Cobro con varios medios de pago, referencia donde se pide, propina sugerida y vuelto solo en efectivo
- [x] Nota de venta con la serie del local; boleta y factura electrónica quedan para F8
- [x] Anular una venta con motivo, permiso y rastro en la bitácora
- [x] Caja: apertura con fondo, resumen del turno, efectivo esperado y **cierre a ciegas** con arqueo por medio
- [x] Descuento de stock por venta, con el momento configurable: al comandar, al cobrar o nunca (D-007)
- [x] La venta **no se bloquea por stock**: se descuenta lo que hay y el faltante queda en la bitácora
- [x] Lo anulado vuelve al almacén, tanto un producto como una venta entera
- [x] El cobro enseña qué sale del almacén y qué productos no tienen receta
- [ ] Comanda en tiempo real hacia un KDS _(depende de la decisión C)_
- [ ] ICBPER de las bolsas y consumo del personal

## F8 · Comprobantes electrónicos

Emisión con **envío simulado** (D-013): los estados y las reglas están construidos para cuando se
enchufe el OSE real (decisión D). La vertical emite; quien declara es el ERP.

- [x] Boleta o factura sobre la venta cobrada, con la serie del local y sus importes congelados
- [x] La factura exige RUC válido, razón social y dirección fiscal
- [x] La boleta pide documento por encima del importe configurado (700 soles por defecto, SUNAT)
- [x] Emisión al cobrar, configurable por local; si no se puede, la venta queda en la cola de Facturación
- [x] Estados del envío: por enviar → enviado → aceptado, rechazado u observado, con código y mensaje
- [x] Un rechazado se corrige y se reintenta, contando los intentos; un aceptado ya no se toca
- [x] Nota de crédito con motivo, total o parcial; la total anula la venta y devuelve el stock
- [x] Sin serie activa del tipo no se emite: se dice cuál falta en vez de inventarla
- [x] Permisos separados para emitir y para anular
- [ ] Envío real a un OSE _(decisión D)_
- [ ] Resumen diario de boletas, comunicación de baja y notas de débito

## Pendientes de revisión

Decisiones que ya funcionan, pero que deben validarse con datos de operación reales antes de darlas por cerradas.

| Tema                             | Cuándo                                                    | Qué comprobar                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Food cost objetivo**           | Con ventas reales en F9                                   | Ajustar los umbrales 30 % / 35 % por categoría (bebidas y postres suelen tener otro rango).                                                                                                                                                         |
| **Descuento de stock por venta** | Al construir F7 · Ventas                                  | Momento configurable: al comandar o al cobrar (D-007). Cada venta guarda versión de receta, costo y precio neto. Almacén de consumo del área postergado.                                                                                            |
| **Herencia de parámetros**       | Al terminar F4.3                                          | Probar con un flujo real si los niveles Cadena → Local → Almacén → Categoría → Insumo bastan o sobra alguno.                                                                                                                                        |
| **Vencimiento al transformar**   | Al terminar F4.5                                          | Si el insumo porcionado hereda el vencimiento del lote, toma nueva vida útil o la menor de ambas.                                                                                                                                                   |
| **Recargo al consumo**           | Al construir F7 · Ventas y caja, y medir en F9 · Reportes | Cuánto recauda por día y por canal; cuántas cuentas lo retiran a pedido del cliente; efecto en el ticket medio y en las propinas; si conviene configurarlo por local u horario además de por canal. Añadir pruebas E2E del cobro con y sin recargo. |
