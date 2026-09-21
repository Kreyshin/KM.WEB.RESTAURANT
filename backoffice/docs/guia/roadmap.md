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
| F6 · Clientes y promociones       | Maestros  | Clientes, reservas, delivery y reglas de promociones        | En curso       |
| F7 · Ventas y caja                | Operación | Pedido, comanda, cuenta y cobro · alcance por decidir       | ⚠️ Por decidir |
| F8 · Comprobantes                 | Operación | Boletas, facturas y notas de crédito con estados simulados  | Pendiente      |
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

**F6.2 · Delivery y promociones** _(siguiente)_

- [ ] Zonas de reparto por local: distritos, costo de envío, pedido mínimo y tiempo estimado
- [ ] Reglas de promociones y cupones que consume el POS (la fidelización en sí es otro sistema, D-007)
- [ ] Puntos: solo la configuración de las reglas, no el saldo del cliente

## F7 · Ventas y caja

> ⚠️ **Decisión pendiente antes de empezar.** Tomar pedidos en mesa y barra, comandar y cobrar es el **núcleo de la vertical** (D-005). Falta decidir **dónde se construye**:
>
> - **Dentro de este proyecto:** una sección POS (mesero y caja) junto al back office, compartiendo carta, mesas, áreas y canales.
> - **Aplicación aparte de la misma vertical:** el back office solo configura y supervisa, y el POS consume los mismos datos.
>
> Según la decisión, F7 incluirá la toma de pedido, la comanda a áreas, la división de cuenta y el cobro, o solo cajas, arqueos, listado de ventas y anulaciones desde el back office.

## Pendientes de revisión

Decisiones que ya funcionan, pero que deben validarse con datos de operación reales antes de darlas por cerradas.

| Tema                             | Cuándo                                                    | Qué comprobar                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Food cost objetivo**           | Con ventas reales en F9                                   | Ajustar los umbrales 30 % / 35 % por categoría (bebidas y postres suelen tener otro rango).                                                                                                                                                         |
| **Descuento de stock por venta** | Al construir F7 · Ventas                                  | Momento configurable: al comandar o al cobrar (D-007). Cada venta guarda versión de receta, costo y precio neto. Almacén de consumo del área postergado.                                                                                            |
| **Herencia de parámetros**       | Al terminar F4.3                                          | Probar con un flujo real si los niveles Cadena → Local → Almacén → Categoría → Insumo bastan o sobra alguno.                                                                                                                                        |
| **Vencimiento al transformar**   | Al terminar F4.5                                          | Si el insumo porcionado hereda el vencimiento del lote, toma nueva vida útil o la menor de ambas.                                                                                                                                                   |
| **Recargo al consumo**           | Al construir F7 · Ventas y caja, y medir en F9 · Reportes | Cuánto recauda por día y por canal; cuántas cuentas lo retiran a pedido del cliente; efecto en el ticket medio y en las propinas; si conviene configurarlo por local u horario además de por canal. Añadir pruebas E2E del cobro con y sin recargo. |
