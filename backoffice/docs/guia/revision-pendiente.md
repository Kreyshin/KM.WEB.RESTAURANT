# Revisión pendiente

Lo construido que aún no revisa el responsable de producto. Se marca al revisarlo; lo que no pase vuelve como corrección al roadmap.

## F4.5 · Recepción y transformación

- [ ] Recepción con OC (rehecha tras la revisión): el modo es de toda la OC; total a ciegas (todo o nada, rechazo con motivo) y a detalle (se cuenta y puede llegar menos); lote, vencimiento, ubicación y **serie** en los dos modos; conversión compra → stock a la vista; hoja de recepción imprimible; 7 OCs de ejemplo con cada combinación
- [ ] Ingreso sin OC (configurable: permitido, tope y comprobante) y regularización
- [ ] Por procesar: artículos que entran y se transforman
- [ ] Partes de producción, modo simple y detallado; rechazo y eliminación en proceso
- [ ] Transformaciones con reparto del costo por valor
- [ ] Solicitudes y requerimientos (ajuste de cantidades, envío simulado al ERP)
- [ ] Stock con vistas por insumo, lote, ubicación y lote + ubicación; total y por almacén

## F4.5.1 · Zonas y modos de integración

- [ ] Inventario › Almacén y zonas: CRUD de zonas y «Quién gestiona cada zona»
- [ ] Configuración › Cadenas: locales por cadena y parámetros propios
- [ ] Parámetros de abastecimiento con nivel Empresa (antes «Cadena») y nivel Cadena opcional
- [ ] Consola de Karma (`/karma/integracion`, desde el panel de datos de ejemplo): modos, motivo, historial y vínculos
- [ ] Aviso de Compras autónomo en Requerimientos _(Recepción aún no cambia según el modo)_

## F4.5.2 · Lista de precios

- [ ] Carta › Listas de precios: listas por local y canal, base y temporada, derivadas con %
- [ ] Precios por línea con precio heredado en gris y descuento con vigencia
- [ ] «¿Cuánto se cobra?»: precio por local, canal y fecha, IGV y reparto del combo
- [ ] Formulario de producto sin precio por canal (ahora remite a Listas de precios)

## F4.6.1 · Receta estandarizada y costos

- [ ] Inventario › Recetas: costo por local y canal, food cost contra su objetivo, margen de contribución y estado del costo
- [ ] Editor: versiones (vigente, programada, histórica), unidades convertibles, consumibles por canal, peso A/B/C
- [ ] Copiar receta de otra presentación escalando cantidades
- [ ] Objetivo propio de la presentación y simulador de precio
- [ ] Pestañas Combos (costo con la opción más cara) y «Si sube un insumo»
- [ ] Configuración: objetivo de food cost, bruta/neta, rendimiento y tolerancia; rendimiento en el insumo

## F4.6.2 · Ficha y capacidades

- [ ] Reventa en el editor de receta: la Inca Kola tiene receta 1:1 automática
- [ ] Ficha técnica (activar en Configuración › Recetas y costos): porciones, pasos, conservación, foto y tolerancia
- [ ] Aprobación de versiones (activar en Configuración): borrador, qué falta y botón Aprobar
- [ ] Alérgenos desde los insumos y aviso de los que la carta no declara
- [ ] Modificadores que suman o quitan insumos (Extras y «Sin cebolla» del lomo) y notas rápidas
- [ ] Insumo: capacidades comprable, producible o ambas

## F4.6.3 · Carta por local y canal

- [ ] Categorías: Sección (un nivel), locales y canales donde se ofrece, objetivo de food cost
- [ ] Ejemplos: «Fondos» agrupa criollos y marinos (objetivo 33 %); Postres no sale en apps; Menú del día solo en Miraflores y salón
- [ ] Productos: filtro «qué se ofrece» por local y canal
- [ ] Formulario de producto: se ofrece o no por local, con el precio de salón de cada local (el tiradito no se ofrece en Barranco)

## F5 · Personal y permisos

- [ ] Configuración › Permisos por rol: interruptores por módulo y guardado (el administrador no se edita)
- [ ] Configuración › Excepciones por usuario: conceder o quitar por persona, con el origen del permiso
- [ ] Admin › Turnos: «Ahora mismo», turnos del local, cruces de horario y asistencia delegada al ERP
- [ ] Admin › Bitácora: filtros por módulo, persona, local y fechas, con exportación

## F6.1 · Clientes y reservas

- [ ] Clientes › Clientes: cliente del ERP en solo lectura y ficha de sala (alergias, etiquetas, notas, salón preferido)
- [ ] Clientes › Reservas: agenda del día, personas esperadas, por confirmar y cambio de día
- [ ] Crear y editar reserva: mesas con su capacidad, cruce de horarios, cupo por franja y anticipación
- [ ] Confirmar, sentar, «no vino» y cancelar con motivo; las alergias del cliente se ven en la fila
- [ ] Configuración › Reservas: confirmación automática, duración, anticipación y cupo

## Documentos

- [ ] Artefacto «Arquitectura Mesa» (diagramas de núcleo, modos, jerarquía, precios y contabilidad)
