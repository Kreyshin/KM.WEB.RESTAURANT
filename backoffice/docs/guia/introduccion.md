# Introducción

**Mesa** es el back office de KM.Restaurante: la parte del sistema donde se administra el negocio —salones, mesas, carta, inventario, personal, ventas, comprobantes y reportes—. No incluye el punto de venta del mesero, la pantalla de cocina ni la carta QR, que son sistemas aparte.

## Enfoque

El proyecto se construye **front-end primero**:

1. Cada pantalla se desarrolla completa y funcional sobre **datos de ejemplo** que viven en el navegador.
2. Las vistas nunca leen esos datos directamente: siempre llaman a un **servicio** (`*.service.ts`).
3. Cuando exista la API, solo cambia la implementación de cada servicio. Las vistas no se tocan.
4. Los tipos de `src/types` son el borrador del **modelo de datos** que se llevará al backend.

::: tip Demo pública
La [demo](https://kreyshin.github.io/KM.WEB.RESTAURANT/demo/) es el back office real compilado. Entra con los datos precargados (cualquier contraseña vale). Los cambios se guardan solo en tu navegador y se pueden reiniciar desde **Perfil → Datos de ejemplo**.
:::

## Stack

| Pieza                   | Uso                                                    |
| ----------------------- | ------------------------------------------------------ |
| Vue 3 + TypeScript      | Componentes con `<script setup>` y tipos estrictos     |
| Vite                    | Servidor de desarrollo y build                         |
| Pinia                   | Estado global: sesión, tema, local activo              |
| Vue Router              | Rutas con guardas por rol                              |
| Tailwind CSS v4         | Utilidades sobre los tokens del sistema de diseño Mesa |
| @vuepic/vue-datepicker  | Base de `KmFecha` y `KmRangoFechas`                    |
| Vitest + Vue Test Utils | Pruebas de lógica crítica                              |
| ESLint + Prettier       | Calidad y formato                                      |
| VitePress               | Esta documentación                                     |

## Poner en marcha

```bash
cd backoffice
npm install
npm run dev          # app en http://localhost:5173
npm run docs:dev     # esta documentación en local
```

## Scripts

| Script               | Qué hace                                                        |
| -------------------- | --------------------------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo                                          |
| `npm run verify`     | Formato, lint, tipos y pruebas. Debe pasar antes de cada commit |
| `npm run test`       | Pruebas unitarias                                               |
| `npm run build`      | Build de producción                                             |
| `npm run build:demo` | Build de la demo para GitHub Pages (`dist-demo/`)               |
| `npm run docs:build` | Build de esta documentación                                     |
