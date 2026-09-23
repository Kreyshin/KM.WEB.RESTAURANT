# Capa de datos mock

Toda la app funciona sin servidor. La regla que lo hace reemplazable es simple: **las vistas solo hablan con servicios**.

```text
Vista (.vue) ──► servicio (*.service.ts) ──► mock/  (hoy)
                                         └─► http.ts (mañana)
```

## Piezas

| Archivo                        | Responsabilidad                                                      |
| ------------------------------ | -------------------------------------------------------------------- |
| `services/mock/db.ts`          | Semilla de datos y persistencia en `localStorage` (clave versionada) |
| `services/mock/consulta.ts`    | `aplicarConsulta`: búsqueda, filtros, orden y paginación en memoria  |
| `services/mock/repositorio.ts` | `crearRepositorio`: CRUD genérico sobre una colección                |
| `services/mock/red.ts`         | Latencia y tasa de error simuladas, configurables en caliente        |
| `services/http.ts`             | Cliente `fetch` con token, listo para la API                         |

## La consulta

Todos los listados paginados reciben la misma `Consulta`, que se traduce 1:1 a query string cuando haya API:

```ts
interface Consulta {
  buscar?: string
  orden?: { campo: string; direccion: 'asc' | 'desc' }
  pagina?: number
  porPagina?: number
  filtros?: Record<string, string | number | boolean | undefined>
}
// GET /salones?buscar=terr&orden=nombre:asc&pagina=1&porPagina=10&activo=true
```

Y devuelven un `Paginado<T>`:

```ts
interface Paginado<T> {
  items: T[]
  total: number // total tras buscar y filtrar, antes de paginar
  pagina: number // ajustada si pediste una fuera de rango
  porPagina: number
}
```

`aplicarConsulta` busca sin distinguir mayúsculas ni tildes, ignora filtros vacíos y no muta la colección original. Está cubierta por pruebas en `consulta.test.ts`.

## Repositorio genérico

Para una entidad nueva basta con declarar el repositorio y añadir solo las reglas de negocio propias:

```ts
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('locales', {
  prefijo: 'l',
  entidad: 'Local',
  camposBusqueda: ['nombre', 'distrito', 'direccion'],
})

export const localesService = {
  ...repo, // consultar, todos, obtener, crear, actualizar, eliminar

  async listarActivos() {
    const { items } = await repo.consultar({ filtros: { activo: true }, porPagina: 100 })
    return items
  },
}
```

## Red simulada

Cada respuesta pasa por `simularRed`, que aplica la latencia configurada y, según la tasa de error, rechaza con un `ApiError`. Se ajusta desde **Perfil → Datos de ejemplo** con tres perfiles:

| Perfil    | Latencia | Fallos |
| --------- | -------- | ------ |
| Normal    | 220 ms   | 0 %    |
| Red lenta | 1800 ms  | 0 %    |
| Inestable | 700 ms   | 25 %   |

Úsalo para comprobar que cada pantalla muestra bien sus estados de carga y error antes de tener backend.

## Errores

Los servicios lanzan `ApiError`, la misma forma que devolverá la API:

```ts
interface ApiError {
  mensaje: string
  campos?: Record<string, string> // errores por campo para el formulario
}
```

## Migrar un servicio a la API

```ts
// Antes (mock)
async consultar(consulta) {
  return latencia(aplicarConsulta(db.salones, consulta, ['nombre']))
}

// Después (API) — la vista no cambia
async consultar(consulta) {
  return http.get<Paginado<Salon>>(`/salones?${aQueryString(consulta)}`)
}
```
