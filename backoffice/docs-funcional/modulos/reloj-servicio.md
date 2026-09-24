# Reloj del servicio

Mesas en filas, el turno en columnas de cuarto de hora.

El **plano de salón** responde _¿dónde está cada mesa?_. El **reloj** responde la única pregunta que se hace en la puerta con gente esperando de pie: _¿cuánto hay que esperar y dónde los siento?_.

::: tip Por qué en cuartos de hora
El eje de tiempo de un restaurante no son días: son los minutos de un servicio. Una mesa que se libera a las 21:15 y otra a las 21:45 son decisiones distintas, y ninguna de las dos se ve en un plano.
:::

## Cómo se lee

| Elemento               | Qué dice                                                        |
| ---------------------- | --------------------------------------------------------------- |
| Columna fija           | Mesa, aforo y, si gira más de una vez, cuántos turnos lleva     |
| Franjas                | Cuartos de hora; la hora en punto pesa más para anclar la vista |
| Línea naranja vertical | **Ahora**. Se mueve sola: un reloj parado no es un reloj        |
| Filas rayadas          | Mesas fuera de uso                                              |

La ventana del servicio no está fijada a mano: se calcula de las reservas del día, desde una hora antes de la primera hasta una después de la última.

## Los turnos

Cada reserva es un bloque que ocupa desde su hora durante su duración.

| Bloque               | Estado                                    |
| -------------------- | ----------------------------------------- |
| Gris, borde punteado | ◷ Pendiente — pedida, sin confirmar       |
| Pizarra llena        | ◆ Confirmada — todavía no han llegado     |
| Fuego lleno          | ● Sentada — la mesa está trabajando ahora |

## La rotación

Junto a cada mesa que gira más de una vez aparece `×2`, `×3`. Es **el número del negocio**: dos servicios en la misma mesa son el doble de facturación con el mismo mantel.

Verla junto al reloj permite decidir con datos si merece la pena apretar la duración de los turnos de las ocho o dejarlos largos.

## Su hora ya pasó

En una franja propia arriba, las reservas **confirmadas o pendientes cuya hora ya pasó y que no se han sentado**. Es el problema real de un jefe de sala: una mesa apartada que nadie ocupa es una mesa perdida dos veces.

Un clic abre la reserva para sentarla o marcarla.

## En la puerta

El control de la esquina es el que se usa de verdad. Se escribe **cuánta gente acaba de entrar sin reserva** y el reloj responde:

- marca con un canto naranja **todas las mesas donde caben**;
- en cada una, **cuándo queda libre** (`ahora`, `en 25 min`);
- arriba, el resumen: _«8 mesas · siéntalos ahora»_.

No basta con que la mesa esté vacía: el sistema descarta las que tienen una reserva encima dentro de la próxima hora y media, porque sentar ahí a alguien significa levantarlo a media cena.

Si no hay ninguna, lo dice claro en vez de enseñar una lista vacía.

## Mover una reserva de mesa

Se arrastra el bloque a otra fila. La fila de destino se ilumina mientras se arrastra: **pizarra** si cabe, **vino** si no.

El sistema comprueba dos cosas antes de mover, que son las que se descubren tarde:

- que **quepa la gente** — sentar a seis en una mesa de cuatro;
- que **no haya otro grupo** a esa hora en esa mesa, diciendo con quién choca.

La hora y la duración no se tocan: cambiar de mesa no es cambiar de reserva.

::: info No hace falta arrastrar
El mismo cambio está en el panel lateral de la reserva, que se abre con un clic. Ahí también se la sienta.
:::
