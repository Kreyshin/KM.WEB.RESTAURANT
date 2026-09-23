# Estructura del proyecto

```text
backoffice/
├─ docs/                     Esta documentación (VitePress)
├─ public/                   Archivos estáticos
└─ src/
   ├─ assets/main.css        Tokens del sistema de diseño Mesa y estilos globales
   ├─ components/
   │  ├─ layout/             Shell: barra, menú, cabecera, buscador, selector de local
   │  ├─ marca/              Identidad Mesa y Karma
   │  └─ ui/                 Componentes base Km*
   ├─ composables/           Lógica reutilizable (useListado)
   ├─ config/                Marca y textos de producto
   ├─ layouts/AppLayout.vue  Marco de las pantallas autenticadas
   ├─ router/                Rutas, títulos y guardas por rol
   ├─ services/
   │  ├─ *.service.ts        Contrato que consumen las vistas
   │  ├─ http.ts             Cliente HTTP listo para la API real
   │  └─ mock/               Base de datos simulada, consulta genérica y red simulada
   ├─ stores/                Pinia: auth, ui, local
   ├─ types/                 Modelo de dominio (index.ts) y tipos de UI (ui.ts)
   ├─ utils/                 Formato, fechas, exportación
   └─ views/                 Pantallas, una carpeta por módulo
```

## Convenciones

- **Nombres en español** en dominio, componentes y funciones: `salonesService.crear`, `formatearSoles`.
- **Componentes base con prefijo `Km`**. Se importan uno a uno; no hay registro global.
- **Una carpeta por módulo** en `views/`, con su vista principal y sus modales: `views/salones/SalonesView.vue`, `SalonFormModal.vue`.
- **Pruebas junto al código** que prueban: `consulta.ts` → `consulta.test.ts`.
- `src/assets/karma/` es identidad de plataforma preservada: no se edita ni se formatea.
