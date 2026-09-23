# Publicación

Cada push a `main` ejecuta el workflow `.github/workflows/pages.yml`, que publica tres sitios estáticos en GitHub Pages:

| Sitio                 | URL                                                                                                   | Origen                          |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| Guía funcional        | [kreyshin.github.io/KM.WEB.RESTAURANT](https://kreyshin.github.io/KM.WEB.RESTAURANT/)                 | `backoffice/docs-funcional`     |
| Documentación técnica | [kreyshin.github.io/KM.WEB.RESTAURANT/tecnica](https://kreyshin.github.io/KM.WEB.RESTAURANT/tecnica/) | `backoffice/docs` (esta)        |
| Demo                  | [kreyshin.github.io/KM.WEB.RESTAURANT/demo](https://kreyshin.github.io/KM.WEB.RESTAURANT/demo/)       | `backoffice/src` en modo `demo` |

La guía funcional ocupa la raíz porque es la puerta de entrada para quien opera el restaurante; esta documentación se dirige a quien lo construye y vive bajo `/tecnica/`.

## Pasos del workflow

1. Instala dependencias con `npm ci`.
2. Ejecuta `npm run verify`: si falla formato, lint, tipos o pruebas, no se publica nada.
3. `npm run build:demo` → `dist-demo/`.
4. `npm run docs:build` → `docs/.vitepress/dist/`.
5. `npm run funcional:build` → `docs-funcional/.vitepress/dist/`.
6. Une los tres en `site/`: la guía funcional en la raíz, esta documentación en `site/tecnica/` y la demo en `site/demo/`. Despliega en Pages.

## Modo demo

`vite build --mode demo` cambia dos cosas:

- `base` pasa a `/KM.WEB.RESTAURANT/demo/`.
- El router usa **hash** (`#/salones`), porque GitHub Pages no reescribe subrutas al `index.html` de una SPA.

La demo usa exactamente los mismos mocks que el desarrollo local. Los datos viven en el navegador de cada visitante.

## Configuración inicial del repositorio

Una sola vez, en GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Probar en local

```bash
npm run build:demo && npx vite preview --mode demo
npm run docs:build && npm run docs:preview
```
