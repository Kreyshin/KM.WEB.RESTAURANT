# Crear un módulo nuevo

Receta para añadir una pantalla de mantenimiento, usando **Proveedores** como ejemplo. Salones (`views/salones/`) es la pantalla de referencia.

## 1. Tipo

En `src/types/index.ts`. Es el borrador de la tabla en base de datos.

```ts
export interface Proveedor {
  id: string
  razonSocial: string
  ruc: string
  telefono?: string
  activo: boolean
}

export type NuevoProveedor = Omit<Proveedor, 'id'>
```

## 2. Semilla

En `services/mock/db.ts`: añade la colección al `Esquema`, datos a `semilla()` y **sube la versión de la clave** (`km.restaurante.mock.vN`) para que los navegadores con la semilla anterior empiecen de cero.

## 3. Servicio

```ts
// services/proveedores.service.ts
import type { NuevoProveedor } from '@/types'
import { db } from './mock/db'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('proveedores', {
  prefijo: 'pv',
  entidad: 'Proveedor',
  camposBusqueda: ['razonSocial', 'ruc'],
})

export const proveedoresService = {
  ...repo,

  async crear(datos: NuevoProveedor) {
    if (db.proveedores.some((p) => p.ruc === datos.ruc)) {
      throw { mensaje: 'Ya existe un proveedor con ese RUC.', campos: { ruc: 'RUC duplicado' } }
    }
    return repo.crear(datos)
  },
}
```

Si hay reglas críticas (unicidad, bloqueos de borrado, cálculos), escribe su prueba en `proveedores.service.test.ts`.

## 4. Vista

`views/proveedores/ProveedoresView.vue` con `KmCard`, `KmBusqueda`, `KmTable`, `KmPaginacion` y `useListado`. El formulario va en un `KmModal` o `KmDrawer` aparte: `ProveedorFormModal.vue`.

## 5. Ruta y navegación

```ts
// router/index.ts
{
  path: 'proveedores',
  name: 'proveedores',
  component: () => import('@/views/proveedores/ProveedoresView.vue'),
  meta: { titulo: 'Proveedores', roles: ['admin'] },
}
```

```ts
// components/layout/navegacion.ts — dentro del módulo que corresponda
{ nombreRuta: 'proveedores', etiqueta: 'Proveedores', descripcion: 'Quién nos abastece', roles: ['admin'] }
```

## 6. Verificar

```bash
npm run verify
```

## Lista de comprobación

- [ ] Estados de carga, vacío y error visibles (prueba con **Datos de ejemplo → Inestable**)
- [ ] Búsqueda, orden y paginación funcionan juntos
- [ ] Errores de validación del servicio llegan al campo del formulario
- [ ] Acciones destructivas piden confirmación con `KmConfirm`
- [ ] Se ve bien en tema oscuro y en tablet
- [ ] Documenta la entidad en [Entidades](./entidades)
