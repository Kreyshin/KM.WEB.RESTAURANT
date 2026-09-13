# Entidades del dominio

Estas entidades salen de `src/types/index.ts` y son la base para diseñar la base de datos. Se amplían en cada fase del [roadmap](./roadmap).

Convenciones del contrato:

- `id` lo asigna el servidor. Los payloads de creación son `NuevoX = Omit<X, 'id'>`.
- Fechas en **ISO 8601**; fechas sin hora en `YYYY-MM-DD`.
- Importes en **soles (PEN)** como número con dos decimales.

## Mapa de relaciones

```text
Local
Salon 1──* Mesa *──0..1 Usuario (mesero)
Categoria 1──* Producto 1──* Variante
                        1──* GrupoModificador 1──* Modificador
                        1──0..1 Receta 1──* IngredienteReceta *──1 Insumo
Insumo 1──* Movimiento *──1 Usuario
```

## Empresa

### Local

| Campo       | Tipo    | Notas                                    |
| ----------- | ------- | ---------------------------------------- |
| `id`        | string  |                                          |
| `nombre`    | string  | «Miraflores»                             |
| `direccion` | string  |                                          |
| `distrito`  | string  |                                          |
| `telefono`  | string? |                                          |
| `activo`    | boolean | Los inactivos no aparecen en el selector |

## Personal

### Usuario

| Campo       | Tipo                                            | Notas |
| ----------- | ----------------------------------------------- | ----- |
| `id`        | string                                          |       |
| `nombre`    | string                                          |       |
| `email`     | string                                          | Único |
| `rol`       | `'admin' \| 'cajero' \| 'mesero' \| 'cocinero'` |       |
| `activo`    | boolean                                         |       |
| `avatarUrl` | string?                                         |       |

Reglas: debe quedar al menos un **administrador activo**, y no se elimina un usuario con mesas asignadas.

## Sala

### Salon

| Campo         | Tipo    | Notas               |
| ------------- | ------- | ------------------- |
| `id`          | string  |                     |
| `nombre`      | string  | Único               |
| `descripcion` | string? |                     |
| `orden`       | number  | Orden en selectores |
| `activo`      | boolean |                     |

Regla: no se elimina un salón con mesas asignadas.

### Mesa

| Campo          | Tipo                                                              | Notas                          |
| -------------- | ----------------------------------------------------------------- | ------------------------------ |
| `id`           | string                                                            |                                |
| `salonId`      | string                                                            | → Salon                        |
| `codigo`       | string                                                            | «M-12», único dentro del salón |
| `capacidad`    | number                                                            | Personas                       |
| `forma`        | `'cuadrada' \| 'redonda' \| 'rectangular'`                        |                                |
| `estado`       | `'libre' \| 'ocupada' \| 'reservada' \| 'limpieza' \| 'inactiva'` |                                |
| `meseroId`     | string?                                                           | → Usuario                      |
| `posX`, `posY` | number                                                            | Posición en el plano, 0–100 %  |

## Carta

### Categoria

| Campo         | Tipo    | Notas |
| ------------- | ------- | ----- |
| `id`          | string  |       |
| `nombre`      | string  |       |
| `descripcion` | string? |       |
| `orden`       | number  |       |
| `activa`      | boolean |       |

### Producto

| Campo                  | Tipo                 | Notas                                                              |
| ---------------------- | -------------------- | ------------------------------------------------------------------ |
| `id`                   | string               |                                                                    |
| `categoriaId`          | string               | → Categoria                                                        |
| `nombre`               | string               |                                                                    |
| `descripcion`          | string?              |                                                                    |
| `precio`               | number               | Precio base                                                        |
| `disponible`           | boolean              | Conmutador de agotado                                              |
| `tiempoPreparacionMin` | number?              |                                                                    |
| `alergenos`            | `Alergeno[]`         | gluten, lácteos, huevo, pescado, mariscos, frutos secos, soya, ají |
| `variantes`            | `Variante[]`         |                                                                    |
| `gruposModificadores`  | `GrupoModificador[]` |                                                                    |

### Variante

Presentación alternativa (personal, fuente…). `precio` es el **precio final**, no un recargo.

| Campo    | Tipo    |
| -------- | ------- |
| `id`     | string  |
| `nombre` | string  |
| `precio` | number  |
| `activa` | boolean |

### GrupoModificador y Modificador

| Campo                     | Tipo   | Notas                               |
| ------------------------- | ------ | ----------------------------------- |
| `seleccionMinima`         | number | `1` lo vuelve obligatorio           |
| `seleccionMaxima`         | number | `1` = elección única; `>1` = extras |
| `modificadores[].nombre`  | string | «Sin cebolla»                       |
| `modificadores[].recargo` | number | `0` si no cuesta                    |

## Inventario

### Insumo

| Campo           | Tipo                                                  | Notas                           |
| --------------- | ----------------------------------------------------- | ------------------------------- |
| `id`            | string                                                |                                 |
| `nombre`        | string                                                |                                 |
| `unidad`        | `'kg' \| 'g' \| 'l' \| 'ml' \| 'unidad' \| 'paquete'` |                                 |
| `stock`         | number                                                |                                 |
| `stockMinimo`   | number                                                | Umbral de alerta                |
| `costoUnitario` | number                                                |                                 |
| `proveedor`     | string?                                               | Pasará a relación con Proveedor |
| `activo`        | boolean                                               |                                 |

### Movimiento

| Campo       | Tipo                                           | Notas              |
| ----------- | ---------------------------------------------- | ------------------ |
| `id`        | string                                         |                    |
| `insumoId`  | string                                         | → Insumo           |
| `tipo`      | `'entrada' \| 'salida' \| 'merma' \| 'ajuste'` | Determina el signo |
| `cantidad`  | number                                         | Siempre positiva   |
| `motivo`    | string?                                        |                    |
| `usuarioId` | string                                         | → Usuario          |
| `fecha`     | string                                         | ISO 8601           |

Regla: una salida o merma no puede dejar el stock en negativo, y la cantidad debe ser mayor que cero. Un insumo usado en una receta no se puede eliminar.

### Receta

| Campo                     | Tipo   | Notas                   |
| ------------------------- | ------ | ----------------------- |
| `productoId`              | string | → Producto (1 a 1)      |
| `ingredientes[].insumoId` | string | → Insumo                |
| `ingredientes[].cantidad` | number | En la unidad del insumo |
