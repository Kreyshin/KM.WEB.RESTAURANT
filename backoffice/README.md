# Mesa — gestión de restaurante

Back office del vertical de restaurantes. **Un sistema Karma Corp**, con lenguaje visual propio.

## Stack

- **Vue 3** (`<script setup>`, TypeScript)
- **Vite** como bundler
- **Vue Router** con guardas de sesión y de rol
- **Pinia** para estado global (sesión, tema y notificaciones)
- **Tailwind CSS v4** + componentes propios (sin librería de UI externa)

## Identidad visual

Sistema de diseño propio: **verde comedor y latón sobre marfil**. Referencia deliberada al
comedor de manteles y bronce, resuelta con superficies planas, aire generoso y una serif de
display. Sin naranja: el calor lo aportan el marfil y el metal, no un color saturado.

| Elemento        | Decisión                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Color de acción | Verde `#1A6B4F`; en oscuro el gráfico sube a `#228764`, pero el botón se queda en 600 para sostener texto blanco a 6.44:1.    |
| Acento          | Latón `#C9A227`: filetes, sección activa, foco, estado reservado.                                                             |
| Superficies     | Marfil `#F5F2EC` / carbón verdoso `#0C120F`.                                                                                  |
| Barra principal | Verde profundo en **ambos** temas: es el ancla de identidad y no depende de la preferencia del usuario.                       |
| Tipografía      | **Fraunces** para títulos y cifras, **Inter** para la interfaz. La serif nunca entra en formularios ni tablas.                |
| Geometría       | Radios 8 / 14 / 20px; sombras muy bajas y de tinte verde.                                                                     |
| Estados         | Verde disponible · vino ocupada · latón reservada · pizarra en limpieza · gris inactiva. Cada uno lleva además glifo y texto. |

Los tonos de estado se calculan con `color-mix` sobre la superficie activa, así que un mismo token
sirve en marfil y en carbón. Dos ajustes van por tema porque la mezcla no se comporta igual:
el latón baja a `700` en claro (en `600` la insignia caía a 4:1) y los tintes profundos suben a sus
variantes claras en oscuro.

Contrastes medidos en la app, ambos temas AA:

| Elemento                    | Claro       | Oscuro      |
| --------------------------- | ----------- | ----------- |
| Título de página            | 16.78:1     | 15.21:1     |
| Botón primario              | 6.44:1      | 6.44:1      |
| Etiqueta de latón           | 5.96:1      | 9.35:1      |
| Módulo inactivo en la barra | 5.77:1      | 5.66:1      |
| Insignias de estado         | 6.07–7.81:1 | 5.75–7.87:1 |

### Identidad Karma preservada

La identidad de plataforma **no se ha perdido**:

- `src/assets/karma/karma-identidad.css` — implementación completa de
  `docs/KARMA-IDENTIDAD-VISUAL.md` (tokens `--km-*`, shell, temas). No se importa; es referencia y
  punto de retorno si el sistema debe reintegrarse al tema de plataforma.
- `src/components/marca/KarmaLogo.vue` — isotipo Karma con su degradado oficial, **sin alterar**.
  Sigue en uso como atribución: aparece en la portada de acceso y en el menú de perfil junto a
  «Un sistema Karma Corp».

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + build de producción
npm run preview
```

## Datos de demostración

Todavía no hay backend. La capa `src/services/` devuelve datos mock que se persisten en
`localStorage`, así que los cambios sobreviven al recargar. Para volver a la semilla original,
borra la clave `km.restaurante.mock.v1` o llama a `reiniciarMock()` desde
`src/services/mock/db.ts`.

Cuentas de prueba (cualquier contraseña sirve):

| Correo                   | Rol           |
| ------------------------ | ------------- |
| `admin@kmrestaurante.pe` | Administrador |
| `ana@kmrestaurante.pe`   | Cajero        |
| `lucia@kmrestaurante.pe` | Mesero        |

## Estructura

```
src/
├── assets/
│   ├── main.css   sistema de diseño de Mesa (tokens --rs-*)
│   └── karma/     identidad Karma preservada, no activa
├── components/
│   ├── layout/    shell: barra principal, menú de secciones, cabecera, perfil
│   ├── marca/     isotipos: MarcaMesa (propio) y KarmaLogo (plataforma)
│   └── ui/        librería de componentes propios (Km*)
├── config/        nombre, lema y atribución del sistema
├── layouts/       AppLayout (shell autenticado)
├── router/        rutas + guardas de sesión y rol
├── services/      capa de acceso a datos (hoy mock, mañana HTTP)
│   └── mock/      "base de datos" de demostración
├── stores/        Pinia: auth, ui (tema + notificaciones)
├── types/         modelo de dominio y tipos de UI
├── utils/         etiquetas, tonos y formas por estado de mesa
└── views/         una carpeta por módulo
```

## Conectar el backend real

El contrato con el backend vive en `src/types/index.ts`. Cuando exista el API Gateway:

1. Define `VITE_API_URL` en un `.env` (por defecto `/api`).
2. En cada servicio de `src/services/`, sustituye las llamadas a `db`/`latencia` por
   `http.get/post/put/delete` (`src/services/http.ts` ya inyecta el token de sesión).
3. Borra `src/services/mock/`.

Las vistas no necesitan cambios: solo consumen las funciones de los servicios.

## Estado de los módulos

| Módulo            | Estado                                                  |
| ----------------- | ------------------------------------------------------- |
| Login y roles     | ✅ Funcional (mock)                                     |
| Dashboard         | ✅ KPIs de ocupación calculados sobre mesas reales      |
| Salones           | ✅ CRUD completo                                        |
| Mesas             | ✅ CRUD + plano arrastrable + cambio de estado en línea |
| Carta y menú      | ⏳ Ruta y permisos listos, vista pendiente              |
| Inventario        | ⏳ Ruta y permisos listos, vista pendiente              |
| Reportes y caja   | ⏳ Ruta y permisos listos, vista pendiente              |
| Usuarios y roles  | ⏳ Ruta y permisos listos, vista pendiente              |
| Facturación SUNAT | ⏳ Ruta y permisos listos, vista pendiente              |
