# Listados con useListado

`useListado` concentra todo el estado de una tabla paginada. La vista enlaza `consulta` con sus controles y pinta `items`; el composable se encarga del resto.

```ts
const { consulta, items, total, cargando, error, recargar } = useListado(
  (c) => salonesService.consultar(c),
  { porPagina: 10, orden: { campo: 'nombre', direccion: 'asc' } },
)
```

## Qué hace por ti

- **Búsqueda con espera**: al teclear en `consulta.buscar` espera 250 ms antes de pedir datos.
- **Vuelve a la página 1** cuando cambian búsqueda, filtros u orden.
- **Recarga** cuando cambian `pagina` o `porPagina`.
- **Descarta respuestas viejas**: si una petición lenta llega después de una más reciente, se ignora.
- **Normaliza errores** a un texto listo para `KmTable`.

## Opciones

| Opción           | Tipo                  | Por defecto |
| ---------------- | --------------------- | ----------- |
| `porPagina`      | `number`              | `10`        |
| `orden`          | `Orden`               | sin orden   |
| `filtros`        | `Consulta['filtros']` | `{}`        |
| `esperaBusqueda` | `number` (ms)         | `250`       |

## Devuelve

| Valor      | Tipo                  | Uso                                                             |
| ---------- | --------------------- | --------------------------------------------------------------- |
| `consulta` | `reactive<Consulta>`  | Enlázalo con `v-model` en búsqueda, filtros, orden y paginación |
| `items`    | `Ref<T[]>`            | Filas de la página actual                                       |
| `total`    | `Ref<number>`         | Total para la paginación                                        |
| `cargando` | `Ref<boolean>`        | Estado de carga                                                 |
| `error`    | `Ref<string \| null>` | Mensaje de error                                                |
| `recargar` | `() => Promise<void>` | Tras crear, editar o eliminar                                   |

## Filtros con booleanos

Un `<select>` trabaja con texto; el filtro espera booleano. Usa un `computed` de ida y vuelta:

```ts
const filtroEstado = computed({
  get: () => {
    const activo = consulta.filtros?.activo
    return activo === undefined ? '' : activo ? 'activo' : 'inactivo'
  },
  set: (valor) => {
    consulta.filtros = {
      ...consulta.filtros,
      activo: valor === '' ? undefined : valor === 'activo',
    }
  },
})
```

Ejemplo completo en [KmTable y paginación](/componentes/tabla) y en `views/salones/SalonesView.vue`.
