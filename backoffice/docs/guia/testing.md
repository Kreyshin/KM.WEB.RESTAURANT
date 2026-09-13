# Testing y QA

Guía práctica para probar el back office. Todos los ejemplos son pruebas reales del proyecto: ábrelas, ejecútalas y rómpelas a propósito para ver cómo avisan.

## Por qué probar

Una prueba automática es una comprobación que antes hacías a mano y que ahora se repite sola, en segundos, cada vez que cambias algo. Su valor está en lo que **evita**: que un cambio en una pantalla rompa otra sin que nadie lo note.

::: tip Caso real del proyecto
En la Fase 2, guardar el horario de un local dejaba la petición colgada y el recargo del 15 % no mostraba su error. Ambos bugs se encontraron probando a mano. Hoy dos pruebas E2E los detectan solas: si alguien reintroduce el fallo, la suite se pone en rojo.
:::

## La pirámide

```text
            ▲  E2E (Playwright)            pocas · lentas · prueban flujos completos
           ▲▲▲  Componentes (Testing Library) bastantes · rápidas · prueban la interfaz
         ▲▲▲▲▲  Unitarias (Vitest)            muchas · instantáneas · prueban la lógica
       ▲▲▲▲▲▲▲  Estático (TypeScript, ESLint) siempre · gratis · evitan errores tontos
```

Cuanto más arriba, más se parece al uso real, pero más lenta y frágil es la prueba. Por eso la mayoría va abajo y solo los flujos críticos arriba.

| Nivel      | Qué responde                            | Herramienta                  | Dónde vive                    |
| ---------- | --------------------------------------- | ---------------------------- | ----------------------------- |
| Estático   | ¿El código es coherente?                | TypeScript, ESLint, Prettier | `npm run verify`              |
| Unitaria   | ¿Esta función calcula bien?             | Vitest                       | `src/**/*.test.ts`            |
| Componente | ¿Este componente se ve y responde bien? | Vitest + Testing Library     | `src/components/**/*.test.ts` |
| E2E        | ¿Una persona puede completar la tarea?  | Playwright                   | `e2e/*.spec.ts`               |

## Comandos

```bash
npm run test               # unitarias y de componente (una vez)
npm run test:watch         # se relanzan al guardar: ideal mientras programas
npm run test:e2e           # E2E en Chromium sin ventana
npm run test:e2e:ui        # E2E con interfaz visual: paso a paso, recomendado para aprender
npm run test:e2e:reporte   # abre el informe HTML de la última ejecución
npm run test:e2e:grabar    # graba tus clics y genera el código de la prueba
npm run verify             # formato + lint + tipos + unitarias y de componente
```

Filtrar una sola prueba:

```bash
npx vitest run src/components/ui/KmTabs.test.ts
npx playwright test -g "correlativo"
```

## Anatomía de una prueba: Preparar · Actuar · Comprobar

Toda prueba tiene tres pasos, en este orden. Si te cuesta escribir uno de ellos, el componente probablemente hace demasiadas cosas.

```ts
it('crea un registro, avisa y lo muestra en la tabla', async () => {
  // Preparar: montar con un servicio falso
  const { usuario, servicio } = montar()
  await screen.findByText('Salón')

  // Actuar: lo que haría una persona
  await usuario.click(screen.getByRole('button', { name: 'Nuevo canal' }))
  await usuario.type(screen.getByLabelText('Nombre'), 'Glovo')
  await usuario.click(screen.getByRole('button', { name: 'Crear canal' }))

  // Comprobar: lo que se ve y lo que se llamó
  expect(servicio.crear).toHaveBeenCalledWith({ nombre: 'Glovo', activo: true })
  expect(await screen.findByRole('status')).toHaveTextContent('Canal creado.')
})
```

_De `src/components/ui/KmCatalogo.test.ts`._

## 1. Pruebas unitarias

Para **lógica pura**: cálculos, validaciones, reglas de negocio. Sin interfaz.

```ts
// src/utils/impuestos.test.ts
it('calcula el recargo al consumo sobre el valor sin IGV', () => {
  const r = desglosarTicket(118, { ...base, recargoConsumoActivo: true })
  expect(r.recargo).toBe(10)
  expect(r.total).toBe(128)
})
```

Qué probar aquí:

- **Casos límite**: 0, vacío, el máximo permitido y uno por encima (13 % y 14 %).
- **Reglas que protegen dinero o datos**: correlativo que no retrocede, último administrador activo.
- **Cada rama**: si hay un `if`, al menos un caso por cada camino.

## 2. Pruebas de componente

Montan un componente en un DOM simulado (jsdom) y lo usan como una persona. Se escriben con **Testing Library**, cuya regla de oro es:

> Cuanto más se parezca la prueba a cómo se usa el software, más confianza da.

Por eso **no** se comprueban variables internas ni clases CSS, sino lo que se ve y lo que se puede hacer.

### Cómo encontrar elementos

Usa este orden de preferencia. Los primeros son los mismos que usa un lector de pantalla, así que una prueba difícil de escribir suele revelar un problema de accesibilidad.

| Prioridad | Consulta               | Ejemplo                                             |
| --------- | ---------------------- | --------------------------------------------------- |
| 1         | `getByRole`            | `getByRole('button', { name: 'Guardar cambios' })`  |
| 2         | `getByLabelText`       | `getByLabelText('Nombre')`                          |
| 3         | `getByPlaceholderText` | `getByPlaceholderText('Buscar salón')`              |
| 4         | `getByText`            | `getByText('Duplicada')`                            |
| 5         | `getByTestId`          | Último recurso, cuando no hay nada visible que usar |

Variantes: `getBy…` falla si no existe; `queryBy…` devuelve `null` (para comprobar que algo **no** está); `findBy…` espera a que aparezca (para lo asíncrono).

### Simular a la persona

`renderizar` (en `src/test/renderizar.ts`) monta con un Pinia limpio y te da `usuario`:

```ts
const { usuario, emitted } = renderizar(KmTabs, { props: { ... } })
await usuario.click(boton)
await usuario.type(campo, 'Glovo')
await usuario.keyboard('{ArrowRight}')
```

### Dobles de prueba

A veces una dependencia estorba: un servicio, una librería, la fecha de hoy. Se sustituye por un **doble**.

| Doble                        | Para qué                      | En el proyecto                                                                     |
| ---------------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| **Espía** (`vi.fn`)          | Saber si se llamó y con qué   | `expect(servicio.eliminar).toHaveBeenCalledWith('c2')`                             |
| **Respuesta forzada**        | Provocar un caso difícil      | `servicio.crear.mockRejectedValueOnce({ campos: { nombre: 'Nombre duplicado' } })` |
| **Módulo falso** (`vi.mock`) | Sustituir una librería entera | El calendario en `KmRangoFechas.test.ts`                                           |
| **Reloj falso**              | Fijar «hoy»                   | `vi.setSystemTime(new Date(2026, 8, 12))`                                          |

No abuses: cuantos más dobles, menos se parece la prueba a la realidad.

## 3. Pruebas E2E con Playwright

Abren la app real en Chromium y recorren un flujo completo. Cada prueba empieza con un navegador limpio, así que siempre parte de los datos de ejemplo iniciales.

```ts
// e2e/configuracion.spec.ts
test('el correlativo no puede retroceder', async ({ page }) => {
  await fila(page, 'B001').getByRole('button', { name: 'Editar' }).click()
  await expect(drawer(page).getByLabel('Serie')).toBeDisabled()

  await drawer(page).getByLabel('Último número emitido').fill('10')
  await drawer(page).getByRole('button', { name: 'Guardar cambios' }).click()

  await expect(drawer(page).getByText('No puede retroceder')).toBeVisible()
})
```

### Piezas del proyecto

| Pieza         | Archivo                | Qué hace                                                                |
| ------------- | ---------------------- | ----------------------------------------------------------------------- |
| Configuración | `playwright.config.ts` | Arranca `npm run dev`, guarda traza y captura si algo falla             |
| Fixtures      | `e2e/fixtures.ts`      | `entrar(correo)`, red sin latencia, `drawer(page)`, `fila(page, texto)` |
| Flujos        | `e2e/*.spec.ts`        | Acceso y permisos, salones, configuración                               |

### Esperas: la clave de una E2E estable

Nunca uses `waitForTimeout(2000)`. Las aserciones de Playwright **reintentan solas** hasta 5 segundos:

```ts
await expect(page.getByText('Salón creado.')).toBeVisible() // espera lo necesario
```

### Depurar una prueba que falla

1. `npm run test:e2e:ui`: ejecuta paso a paso y muestra el DOM en cada acción.
2. Si falló sin ventana, abre la traza que indica el error: `npx playwright show-trace test-results/…/trace.zip`. Tiene una línea de tiempo con capturas, red y consola.
3. `npx playwright test --headed -g "nombre"` para verla en un navegador visible.

### Grabar en vez de escribir

```bash
npm run dev             # en una terminal
npm run test:e2e:grabar # en otra
```

Haz clic por la app y Playwright escribe el código. Úsalo como borrador: después cambia los selectores frágiles por `getByRole` y añade las aserciones.

## Comprobar que la prueba sirve

Una prueba que nunca falla no protege nada. Hábito recomendado cada vez que escribas una:

1. Escribe la prueba y compruébala en verde.
2. **Rompe a propósito** el código que protege (quita la validación, cambia un `<` por `<=`).
3. La prueba debe ponerse en rojo con un mensaje que explique el problema.
4. Restaura el código.

Así se validaron las E2E de horario y recargo: al reintroducir los bugs de la Fase 2, ambas fallaron.

## Qué probar y qué no

**Sí**

- Reglas de negocio y cálculos con dinero
- Validaciones y sus mensajes
- Permisos por rol
- Componentes que usan muchas pantallas (`KmCatalogo`, `KmTable`)
- Bugs que ya ocurrieron: cada bug corregido merece su prueba
- Accesibilidad básica: roles, etiquetas, teclado

**No**

- Estilos y colores exactos (cambian a menudo)
- Librerías de terceros por dentro (el calendario ya tiene sus pruebas)
- Detalles de implementación: nombres de variables, cuántas veces se renderiza
- Cada combinación posible en E2E: eso va en unitarias

## QA manual: lista por pantalla

La automatización no sustituye mirar. Antes de dar por terminada una pantalla:

**Datos**

- [ ] Carga con los datos de ejemplo
- [ ] Estado vacío con búsqueda sin resultados y sin registros
- [ ] **Datos de ejemplo → Red lenta**: se ve la carga
- [ ] **Datos de ejemplo → Inestable**: se ve el error y _Reintentar_ funciona

**Formularios**

- [ ] Guardar vacío muestra errores en cada campo
- [ ] Valores límite: 0, negativos, muy largos, tildes y ñ
- [ ] Un error del servicio (duplicado) aparece en su campo
- [ ] Cancelar no guarda nada; editar precarga los datos

**Uso real**

- [ ] Todo se puede hacer solo con teclado (Tab, Enter, Escape)
- [ ] Tema oscuro legible
- [ ] Ancho de tablet (768 px) sin desbordes
- [ ] Recargar la página conserva los cambios guardados
- [ ] Un rol sin permiso no ve la sección ni entra por URL

## Flujo de trabajo recomendado

1. **Antes de programar**, escribe en una lista los casos: lo normal, los errores y los límites.
2. Programa la regla en el servicio y cubre sus casos con **unitarias**.
3. Construye la pantalla y prueba con `test:watch` abierto.
4. Si creas un componente reutilizable, añade su **prueba de componente**.
5. Añade **una E2E** para el flujo principal de la pantalla.
6. Pasa la **lista de QA manual**.
7. `npm run verify` y `npm run test:e2e` en verde antes del commit.

## Para seguir aprendiendo

| Recurso                                                                                                    | Qué aprenderás                                                                |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Vitest](https://vitest.dev/guide/)                                                                        | Aserciones, dobles, relojes falsos                                            |
| [Testing Library: guía de consultas](https://testing-library.com/docs/queries/about)                       | Cómo elegir selectores                                                        |
| [Playwright: mejores prácticas](https://playwright.dev/docs/best-practices)                                | E2E estables, localizadores, trazas                                           |
| [Testing Library: errores comunes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) | Antipatrones (aplican igual en Vue)                                           |
| ISTQB Foundation (programa gratuito)                                                                       | Vocabulario y técnicas de QA: particiones, valores límite, tablas de decisión |
