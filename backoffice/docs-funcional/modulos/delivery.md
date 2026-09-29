# Reparto y promociones

Dos pantallas que casi nadie abre dos veces al día, y que sin embargo deciden lo que cobra la caja
en cada pedido. No se configuran para el back office: se configuran **para el momento del cobro**.

## Zonas de reparto

Hasta dónde llega la moto de este local, qué cuesta y en cuánto tiempo se promete.

La zona es de un local, no de la cadena: la cobertura depende de dónde está la cocina. Cada zona
lleva sus distritos, el costo del envío, el pedido mínimo y los minutos que se prometen al cliente.

- **Un distrito solo puede estar en una zona del local.** Si estuviera en dos, la caja no sabría qué
  cobrar ni qué hora decir.
- **El envío gratis desde un monto es de la zona**, no una promoción aparte: es lo que el encargado
  piensa como «a San Isidro, gratis desde 80».
- **Fuera de cobertura no es un error del programa.** Cada local decide si bloquea el pedido o lo
  acepta avisando: un local que abre reparte «donde alcance», uno establecido no.
- **Las apps de delivery no tienen zona.** Ponen su logística y cobran su comisión; lo que se
  configura aquí es el reparto propio.

La caja pregunta «¿se llega?» con una dirección y una cuenta, y recibe tres respuestas posibles: se
llega, falta para el pedido mínimo, o está fuera de cobertura. Esa misma pregunta se puede hacer
desde la pantalla, con las palabras exactas que verá el cajero.

::: tip El mínimo se mide sobre los productos, no sobre el envío
Sumar el envío para llegar al pedido mínimo sería hacerse trampa: el mínimo existe para que el viaje
valga la pena.
:::

## Promociones y cupones

Toda promoción tiene la misma forma, y esa es la idea:

1. **A quién alcanza** — locales y canales.
2. **Cuándo rige** — fechas, días de la semana y franja del día.
3. **Cómo se activa** — sola en caja, o con un cupón que alguien teclea.
4. **Qué exige** — un monto mínimo de cuenta, o tantas unidades de ciertos productos o categorías.
5. **Qué da** — porcentaje, monto, precio fijo, N×M, un producto de regalo o el envío gratis.

Si una idea no entra en esa forma, es un caso nuevo que se discute. Un descuento que el comprobante
no sabe representar no es una promoción: es un descuento a dedo, y eso se pide con permiso y motivo.

### Cuál gana

Las promociones **no se acumulan por defecto**: entra la de mayor prioridad y, a igual prioridad, la
que más beneficia al cliente. Quien quiera acumularlas lo activa en la configuración, y entonces se
suman las que están marcadas como combinables.

Encima hay dos frenos: el **tope de cada promoción** (en soles o en porcentaje de la cuenta) y el
**tope del local**, que limita lo que todas juntas pueden rebajar. El tope es lo que evita que un
cupón difundido por error regale la caja de un sábado.

### Siempre se explica

En caja la pregunta nunca es «¿qué descuento hay?», es «¿por qué no entró la del martes?». Por eso la
evaluación devuelve las dos listas: lo que entró, con cuánto rebajó y por qué, y lo que se quedó
fuera, con su motivo —no era el día, faltaba el cupón, no llegó al mínimo, ya entró otra que no se
acumula—. La pantalla tiene la misma pregunta armada: se monta una cuenta a mano y se lee la
respuesta completa.

## Puntos

Solo las reglas: cuántos soles valen un punto, cuánto descuenta un punto al canjear, el canje mínimo,
la caducidad y qué canales acumulan. Sirven para que la caja sepa qué mostrar.

::: warning El saldo del cliente no vive aquí
Cuántos puntos tiene cada persona, cómo se los comunica y qué campañas se le hacen es fidelización, y
eso es otro sistema. La vertical solo necesita saber la regla para aplicarla al cobrar.
:::
