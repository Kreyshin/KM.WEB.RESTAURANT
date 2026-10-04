# Revisión del back office

Todo lo construido, en el orden en que conviene mirarlo, con una casilla por cosa. Marca lo que
pase; lo que no, anótalo debajo de su bloque y vuelve como corrección al roadmap.

**Cómo entrar:** `npm --prefix backoffice run dev`, `admin@kmrestaurante.pe`, contraseña `demo`
(cualquiera sirve). Los datos son de ejemplo y viven en tu navegador: el panel inferior derecho los
reinicia si algo se enreda.

**Qué mirar en cada punto:** que haga lo que dice, que lo diga en castellano y que no te obligue a
adivinar. Si algo funciona pero te hace pensar dos veces, eso también es un fallo.

- Fases: **F2** a **F10**, más lo transversal.
- Total: **134 puntos**.
- Estado del código al abrir esta revisión: 364 pruebas y 75 e2e en verde.

---

## 1 · Configuración y permisos (F2, F5)

### Configuración

- [ ] **Configuración › Vertical**: los parámetros se agrupan por tema y cada uno explica para qué sirve
- [ ] **Configuración › Por local**: el valor propio del local gana sobre el de la cadena y este sobre el de la empresa; se ve de dónde sale cada valor
- [ ] «Usar el heredado» devuelve un parámetro al valor de arriba
- [ ] **Configuración › Cadenas**: locales por cadena y parámetros propios de la cadena
- [ ] **Configuración › Canales**: modalidad de atención, comisión solo en apps y recargo al consumo por canal
- [ ] **Configuración › Áreas**: qué recibe cada área y el aviso cuando un producto llega a dos áreas o a ninguna
- [ ] **Configuración › Motivos**: los motivos y sus tipos; el tipo dice en qué operación se piden
- [ ] **Configuración › Motivos › Tipos de motivo** (D-017): crear uno nuevo (p. ej. «Consumo del personal») y verlo aparecer como pestaña
- [ ] En Canales y en Impresoras, el formulario explica por qué la modalidad y el uso no se editan

### Permisos

- [ ] **Configuración › Permisos por rol**: los roles vienen del ERP; aquí se les dan permisos de la vertical
- [ ] **Configuración › Excepciones por usuario**: conceder o quitar a una persona, viendo de dónde sale su permiso efectivo
- [ ] Una persona sin permiso ve el botón deshabilitado, no un error al pulsarlo

## 2 · Sala (F3, F6.1)

- [ ] **Sala › Salones y mesas**: alta, plano, capacidad y estados
- [ ] Arrastrar una mesa la deja donde la sueltas y ahí sigue al recargar
- [ ] Clic derecho sobre una mesa: cambiar estado, editar, juntar y separar
- [ ] Juntar mesas para un grupo, y el aviso al separar si una está ocupada
- [ ] **Sala › Reloj del servicio**: turnos en cuartos de hora y quién espera en la puerta
- [ ] **Reservar desde el reloj** (D-018): pulsar un hueco abre la reserva con esa mesa y esa hora puestas
- [ ] Las mesas unidas cambian de estado juntas: ocupar una ocupa toda la unión
- [ ] **Clientes › Clientes**: el cliente es del ERP y solo se consulta; encima va la ficha de sala (alergias, etiquetas, notas, salón preferido)
- [ ] **Clientes › Reservas**: agenda del día, personas esperadas y reservas por confirmar
- [ ] Crear una reserva: la mesa queda apartada por su duración y no admite dos a la misma hora
- [ ] Las mesas elegidas deben alcanzar para las personas; no admite mesas inactivas ni de otro local
- [ ] Cupo por franja, anticipación máxima y confirmación automática, configurables por local
- [ ] Cancelar y «no vino» piden motivo y quedan en la bitácora

## 3 · Carta y precios (F3, F4.5.2, F4.6)

- [ ] **Carta › Carta y menú**: categorías, secciones, productos, presentaciones y modificadores
- [ ] Alérgenos e imagen del plato; un producto puede limitarse a ciertos locales y canales
- [ ] **Carta › Listas de precios** (D-015): el catálogo guarda varias por local y canal, y «Poner en uso» cambia cuál cobra
- [ ] La que sale de uso vuelve al catálogo, no se borra; una con fechas entra y sale sola y lo dice
- [ ] La lista se crea para el local activo: ya no hay un segundo selector de local
- [ ] **Carta › Menús** (D-016): agrupa productos sin precio propio, con vigencia permanente, por fechas o por días
- [ ] Lista derivada de otra con un ajuste en %, y el precio heredado se ve en gris
- [ ] Descuento por línea con su vigencia
- [ ] «¿Cuánto se cobra?»: precio por local, canal y fecha, con IGV y reparto del combo
- [ ] **Carta › Combos**: solo lo que se cobra a un precio cerrado, con grupos de elección y reparto analítico
- [ ] Productos y Combos abren en tarjetas, con la foto del plato

## 4 · Inventario y recetas (F4)

- [ ] **Inventario › Insumos**: catálogo, stock, mínimo y alertas
- [ ] El insumo se vincula a artículos del ERP, con su conversión de compra a stock
- [ ] **Inventario › Recetas**: food cost contra su objetivo, margen de contribución y estado del costo
- [ ] Editor de receta: versiones (vigente, programada, histórica) y copiar de otra presentación escalando
- [ ] Ficha técnica con pasos, porciones y aprobación, si el local la activa
- [ ] Simulador de precio y pestaña «Si sube un insumo»
- [ ] **Inventario › Producción**: partes que escalan la receta y crean lote
- [ ] **Inventario › Transformaciones**: despiece con reparto del costo por valor, y la merma con su unidad
- [ ] **Inventario › Stock**: por insumo, lote, ubicación y lote + ubicación
- [ ] **Inventario › Movimientos**: kardex con filtros y exportación
- [ ] **Inventario › Parámetros de abastecimiento**: herencia empresa → cadena → local → zona → categoría → insumo
- [ ] **Inventario › Almacén y zonas**: un almacén por local, zonas dentro y quién gestiona cada una

## 5 · Compras (F4.4, F4.5)

- [ ] **Compras › Solicitudes**: cada área pide lo suyo
- [ ] **Compras › Requerimientos**: el local consolida, ajusta cantidades y lo envía al ERP (simulado)
- [ ] **Compras › Recepción con OC**: modo total a ciegas y modo a detalle
- [ ] Lote, vencimiento, ubicación y serie en los dos modos, con la conversión de compra a stock a la vista
- [ ] Hoja de recepción imprimible
- [ ] Ingreso sin OC: permitido, tope y comprobante según configuración; y su regularización
- [ ] «Por procesar»: lo que entra y hay que transformar antes de usarse

## 6 · Reparto y promociones (F6.2, D-011)

### Zonas de reparto

- [ ] **Clientes › Zonas de reparto**: distritos, costo de envío, pedido mínimo y tiempo prometido
- [ ] Un distrito no se puede poner en dos zonas del mismo local, y lo dice al intentarlo
- [ ] Envío gratis desde un monto, como propiedad de la zona
- [ ] «¿Se llega?»: se llega, bajo el mínimo (con cuánto falta) o fuera de cobertura
- [ ] Fuera de cobertura avisa o bloquea según lo que diga la configuración del local
- [ ] Un local configurado para no cobrar envío deja el costo en cero

### Promociones

- [ ] **Clientes › Promociones**: tabla con qué da, cuándo rige, a quién alcanza y prioridad
- [ ] Editor: alcance, vigencia, activación, condición y beneficio, cada uno en su bloque
- [ ] Beneficios: porcentaje, monto, precio fijo, N×M, producto gratis y envío gratis
- [ ] Cupones con usos totales y por cliente; no se repite un código entre promociones
- [ ] No se borra una promoción con cupones canjeados: se desactiva
- [ ] **«¿Qué se aplica?»**: se arma una cuenta y se ve lo que entra y **por qué cada una se queda fuera**
- [ ] Topes: el de la promoción y el del local, y se nota cuál recortó
- [ ] **Puntos**: reglas (soles por punto, valor, canje mínimo, caducidad, canales); el saldo del cliente no vive aquí

## 7 · Ventas y caja (F7, D-012)

### La cuenta

- [ ] **Admin › Caja**: cuentas abiertas del local, con lo que falta comandar a la vista
- [ ] Abrir cuenta: mesa con comensales, mostrador, para llevar y delivery con distrito
- [ ] Una mesa no admite dos cuentas abiertas
- [ ] Añadir productos con nota y modificadores, con su recargo
- [ ] Quitar un producto **sin comandar** no cuesta nada
- [ ] Anular un producto **ya comandado** pide motivo y queda en la bitácora
- [ ] Comandar reparte las líneas entre las áreas que las preparan, cada una con su número
- [ ] Si un producto no tiene área que lo prepare, avisa cuál es y no comanda nada a medias
- [ ] Mover la cuenta de mesa sin perder su historia
- [ ] Dividir la cuenta: las líneas elegidas se van a una cuenta que se cobra aparte

### Cobro y caja

- [ ] Precuenta: consumo → promociones → recargo al consumo → envío, con IGV desglosado
- [ ] No deja cobrar si quedan productos sin comandar
- [ ] Cobro con varios medios de pago, con referencia donde se pide
- [ ] Propina sugerida configurable, que el cajero puede cambiar
- [ ] Vuelto solo cuando hay efectivo de por medio
- [ ] Antes de cobrar se ve **qué sale del almacén** y qué productos no tienen receta
- [ ] Al cobrar, la mesa pasa a limpieza
- [ ] Anular una venta pide motivo y deja rastro
- [ ] **Admin › Arqueo**: apertura con fondo y resumen del turno
- [ ] Efectivo esperado = fondo + cobrado en efectivo − vueltos
- [ ] Cierre **a ciegas**: no se ve lo esperado hasta haber contado, y la diferencia se guarda igual
- [ ] Sin caja abierta no se cobra, salvo que el local lo desactive

### Consumo de stock (D-007)

- [ ] El momento del descuento es configurable: al comandar, al cobrar o nunca
- [ ] Si falta stock, **la venta se cobra igual** y el faltante queda en la bitácora
- [ ] Anular un producto o una venta entera devuelve los insumos al almacén
- [ ] El movimiento lleva la cuenta como referencia y se encuentra desde el kardex

## 8 · Comprobantes (F8, D-013)

- [ ] **Admin › Facturación**: emitidos con su estado y, aparte, las ventas sin comprobante
- [ ] Periodo y estado como filtros (una semana por defecto)
- [ ] La factura exige RUC válido, razón social y dirección
- [ ] La boleta pide documento por encima del importe configurado (700 soles por defecto)
- [ ] Emisión automática al cobrar, configurable por local; si no puede, la venta queda en la cola
- [ ] Estados del envío: por enviar, enviado, aceptado, rechazado, observado, con código y mensaje
- [ ] Un rechazado se corrige y se reintenta, y se cuentan los intentos
- [ ] Un aceptado ya no se toca: se corrige con nota de crédito
- [ ] Nota de crédito **total**: anula la venta y devuelve el stock
- [ ] Nota de crédito **parcial**: rebaja el importe y la venta sigue en pie
- [ ] Sin serie activa del tipo, avisa cuál falta en vez de inventarla
- [ ] Emitir y anular son permisos distintos

## 9 · Reportes (F9, D-014)

- [ ] **Admin › Reportes**: ingreso neto frente a lo cobrado, con el IGV al lado
- [ ] La propina y el recargo al consumo van en «no es ingreso»
- [ ] Las ventas anuladas se cuentan aparte y no suman
- [ ] Ticket medio y gasto por comensal
- [ ] Reparto por canal, con la comisión de las apps como gasto, no como menor venta
- [ ] Curva por hora del servicio
- [ ] **Rentabilidad por plato**: unidades, ingreso neto, costo, margen y food cost contra su objetivo
- [ ] Clases A, B y C por aporte al margen
- [ ] Los platos sin receta se marcan y no entran en el food cost
- [ ] Se avisa de que el costo es el de la receta de hoy, no el del día de la venta
- [ ] **Consumo y mermas**: lo que dicen las recetas frente a lo que salió del almacén
- [ ] La diferencia, valorizada al costo y ordenada por lo que cuesta
- [ ] Exportación a CSV y Excel de la pestaña que se está mirando
- [ ] Los números de la semilla (tres semanas) se parecen a los de un local de verdad

## 10 · Pulido (F10)

- [ ] Un panel se abre con el foco dentro y se cierra con Escape
- [ ] Al cerrarlo, el foco vuelve al botón que lo abrió
- [ ] Con el tabulador no te escapas al fondo mientras hay un panel abierto
- [ ] El menú de una mesa se abre con Shift+F10 y al cerrarse el foco vuelve a la mesa
- [ ] Una tabla muy larga se pinta por tandas, con «mostrar más» y el contador
- [ ] Tema claro y oscuro, y el foco se ve en los dos

## 11 · Transversal

- [ ] El **local activo** manda sobre todo lo que se ve
- [ ] La **búsqueda global** (`Ctrl` + `K`) encuentra secciones, productos y mesas
- [ ] Los listados comparten buscador, filtros, orden, paginación y exportación
- [ ] **«Sincronizado desde ERP»** marca bien lo que aquí solo se consulta
- [ ] **Admin › Bitácora**: quién hizo cada acción sensible, con filtros y exportación
- [ ] Los mensajes de error dicen qué pasó y qué hacer, sin jerga del programa
- [ ] Nada promete algo que todavía no hace

---

## Lo que ya sabemos que falta

No hace falta que lo marques: está reconocido y con su sitio en el plan.

- **Congelar el costo en la línea de venta.** Hoy los reportes usan la receta vigente, así que el
  margen histórico se mueve cuando cambia un precio de insumo. Es lo primero de la lista.
- **Pantalla de Usuarios y roles.** La ruta, los permisos y la navegación existen; la pantalla no.
- **Comanda en tiempo real hacia cocina (KDS).** Espera la decisión C: transporte en tiempo real.
- **Envío real de comprobantes al OSE.** Espera la decisión D; los estados ya están construidos.
- **ICBPER** de las bolsas y **consumo del personal** en la caja.
- **Repaso con lector de pantalla real**, que el barrido automático de F10 no sustituye.
- **Backend.** Todo corre con datos de ejemplo en el navegador (decisión B).

## Decisiones que necesitan tu palabra

- **B · Backend:** stack y forma. Karma Corp ya tiene plataforma; conviene alinear, no elegir por gusto.
- **C · Tiempo real:** WebSocket propio o servicio gestionado, para comanda y KDS.
- **D · Facturación electrónica:** OSE de terceros o integración directa. Puede que el ERP ya lo tenga resuelto.

## Anotaciones de la revisión

Lo que falle, aquí abajo: pantalla, qué esperabas y qué pasó.

| Pantalla | Qué esperabas | Qué pasó |
| -------- | ------------- | -------- |
|          |               |          |
