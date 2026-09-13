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
