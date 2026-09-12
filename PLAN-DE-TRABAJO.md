# KM.Restaurante — Plan de trabajo

> Documento de trabajo. Estado a 2026-09-12.
> Complementa [contexto-km-restaurante.md](contexto-km-restaurante.md), que define el alcance
> funcional. Aquí va el **orden**, las **dependencias** y los **criterios de terminado**.

---

## 1. Dónde estamos hoy

Existe un único entregable: el back office en `backoffice/` (Vue 3 + Vite + TS + Pinia + Tailwind),
con sistema de diseño propio «Mesa».

| Pieza | Estado | Nota |
| --- | --- | --- |
| Shell, routing, guardas por rol | ✅ Hecho | 4 módulos, menú contextual, responsive |
| Sistema de diseño «Mesa» | ✅ Hecho | Tokens `--rs-*`, claro/oscuro, contrastes AA medidos |
| Login y sesión | ⚠️ Mock | Cualquier contraseña; token falso en `localStorage` |
| Dashboard | ✅ Hecho | KPIs calculados sobre datos reales del store |
| Salones | ✅ Hecho | CRUD completo |
| Mesas | ✅ Hecho | CRUD + plano arrastrable + cambio de estado en línea |
| Carta, Inventario, Reportes, Usuarios, Facturación | ❌ Placeholder | Ruta y permisos listos, `EnConstruccionView` |
| Backend | ❌ No existe | Todo sale de `src/services/mock/db.ts` |
| Comandas, KDS, Delivery, QR | ❌ No empezado | Ni modelo ni interfaz |

**Deuda estructural inmediata:** el proyecto no está en git, no tiene linter, ni formateador, ni un
solo test. Eso se arregla antes de añadir superficie nueva, no después.

---

## 2. Fases

Las fases están ordenadas por **dependencia real**, no por apetito. La regla que las gobierna:
*no se construye una pantalla operativa sobre un maestro que todavía no existe*.

### Fase 0 — Higiene del proyecto

Pequeña y desbloqueante. Sin esto, todo lo demás se desarrolla a ciegas.

- [ ] `git init`, `.gitignore`, primer commit, convención de ramas y mensajes
- [ ] ESLint (`eslint-plugin-vue` + `typescript-eslint`) y Prettier, con script `lint`
- [ ] Vitest + `@vue/test-utils`; script `test`
- [ ] Tests semilla: guarda de rol del router, `salones.service`, `mesas.service`
- [ ] Script `verify` que encadene `lint`, `vue-tsc` y `test`

**Terminado cuando:** `npm run verify` pasa en limpio y hay historial de git.

---

### Fase 1 — Completar los maestros del back office

Es la fase que desbloquea todo lo operativo. **Carta es la pieza crítica**: sin catálogo de
productos no hay comanda, no hay ticket y no hay reporte de ventas.

#### 1.1 Carta y menú ← máxima prioridad

- [ ] Modelo: `Categoria`, `Producto`, `Variante`, `GrupoModificador`, `Modificador`
- [ ] Precios por producto y por variante; disponibilidad por horario o agotado
- [ ] CRUD de categorías con reordenación
- [ ] CRUD de productos con imagen, alérgenos y tiempo de preparación
- [ ] Editor de variantes y modificadores (ej. «sin cebolla», «extra queso» con recargo)

#### 1.2 Inventario e insumos

- [ ] Modelo: `Insumo`, `UnidadMedida`, `Movimiento`, `Receta`
- [ ] CRUD de insumos con stock mínimo y alerta
- [ ] Receta: relación producto → insumos con cantidades *(depende de 1.1)*
- [ ] Movimientos: entrada, salida, merma, ajuste, con motivo y responsable

#### 1.3 Usuarios y roles

- [ ] CRUD de usuarios y asignación de rol
- [ ] Matriz de permisos explícita, sustituyendo el `roles[]` del `meta` de cada ruta
- [ ] Alta, baja, reseteo de contraseña, asignación de mesero a salón

**Terminado cuando:** los tres módulos operan CRUD completo contra la capa de servicios y ya no
queda ningún `EnConstruccionView` en rutas de maestros.

---

### Fase 2 — Backend real y contrato de API

Hasta aquí todo vive en `localStorage`. Esta fase lo hace real.

- [ ] Congelar el contrato: generar OpenAPI a partir de `src/types/index.ts`
- [ ] **Decidir arquitectura del backend** (ver §4) antes de escribir la primera línea
- [ ] Autenticación real: JWT con refresh, interceptor de 401, expiración de sesión
- [ ] Sustituir cada servicio mock por `http.*` — las vistas no se tocan
- [ ] Manejo global de errores de red y estado sin conexión
- [ ] Modelo multi-local: la cabecera ya muestra «Local: Miraflores», pero es un literal
- [ ] Eliminar `src/services/mock/`
- [ ] Semillas y entorno de staging

**Terminado cuando:** la app funciona con el backend y `src/services/mock/` ya no existe.

---

### Fase 3 — Operación en vivo: comandas y cocina

El corazón del sistema. Es donde el producto empieza a valer para el restaurante.

- [ ] Modelo `Comanda` y `ItemComanda` con estados y modificaciones
- [ ] Canal en tiempo real (WebSocket) con reconexión y reconciliación de estado
- [ ] Toma de comanda por mesa, desde el plano de salón ya construido
- [ ] KDS: pantalla de cocina con «en preparación» / «listo», agrupada por estación
- [ ] Descuento automático de inventario al cerrar comanda *(depende de 1.2)*
- [ ] Notificación mesero ↔ cocina ↔ caja

**Terminado cuando:** un pedido viaja de mesa a cocina y vuelve, sin recargar ninguna pantalla.

---

### Fase 4 — Caja, reportes y SUNAT

- [ ] Apertura y cierre de caja con arqueo y diferencias
- [ ] Cobro: efectivo, tarjeta, Yape/Plin, división de cuenta, propina
- [ ] Reportes: ventas por periodo, por producto, por mesero, ticket medio, horas punta
- [ ] **Facturación electrónica SUNAT**: boleta y factura, series y correlativos, envío al OSE,
      CDR, anulaciones y notas de crédito, contingencia
- [ ] Exportación contable

**Terminado cuando:** se puede cerrar un día completo y emitir comprobantes válidos.

---

### Fase 5 — Extensiones

Solo tienen sentido con las fases 3 y 4 en producción.

- [ ] Delivery: asignación de repartidor, estados de entrega, integración de ruta
- [ ] Pedido por QR en mesa: carta pública, pedido y pago del propio comensal
- [ ] App de mesero como PWA instalable

---

## 3. Trabajo transversal

No es una fase; acompaña a todas.

- [ ] **Accesibilidad**: los contrastes están medidos, falta auditar navegación por teclado
      completa y lectores de pantalla en el plano de mesas (hoy es un `button` arrastrable)
- [ ] **Rendimiento**: virtualizar tablas cuando la carta pase de ~200 productos
- [ ] **CI/CD**: `verify` en cada PR, despliegue automático a staging
- [ ] **Observabilidad**: registro de errores de cliente
- [ ] **Datos de prueba realistas**: la semilla actual tiene 12 mesas y 5 usuarios

---

## 4. Decisiones abiertas

Bloquean fases concretas. Conviene cerrarlas antes de llegar a ellas.

| # | Decisión | Bloquea | Notas |
| --- | --- | --- | --- |
| D1 | ¿Microservicios o monolito modular? | Fase 2 | El contexto original asume microservicios con API Gateway, pero para un primer restaurante en producción un monolito modular es más barato de operar y se parte después. Recomiendo empezar monolito. |
| D2 | Stack del backend | Fase 2 | Karma Corp ya tiene plataforma; conviene alinear con lo que usa el resto del ERP en lugar de elegir por gusto. |
| D3 | App de mesero: ¿PWA en este mismo front o aplicación aparte? | Fase 3 | Reutilizar este front ahorra un stack entero; una app aparte da mejor experiencia offline. |
| D4 | Proveedor SUNAT: ¿OSE de terceros o integración directa? | Fase 4 | El OSE de terceros acorta muchísimo el desarrollo y absorbe cambios normativos. |
| D5 | Multi-local y multi-empresa: ¿desde el principio? | Fase 2 | Meterlo después es una migración de datos dolorosa. La cabecera ya lo insinúa. |
| D6 | Transporte en tiempo real: ¿WebSocket propio o servicio gestionado? | Fase 3 | Afecta a coste de operación y a la complejidad de reconexión. |

---

## 5. Criterio de orden

Si hubiera que recortar, este es el orden de valor por esfuerzo:

1. **Fase 0** — barata y evita retrabajo en todo lo demás.
2. **Carta (1.1)** — sin ella no existe ninguna fase posterior.
3. **Fase 2** — mientras siga en mock, nada de lo construido es utilizable de verdad.
4. **Fase 3** — es el argumento de compra del producto.
5. **Fase 4** — obligatoria para operar legalmente en Perú, pero después de que haya qué facturar.
6. **Fase 5** — opcional.

Usuarios (1.3) e Inventario (1.2) pueden aplazarse detrás de la Fase 2 si hace falta llegar antes a
una demo con datos reales.
