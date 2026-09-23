# Publicación

Cada push a `main` ejecuta el workflow `.github/workflows/pages.yml`, que publica dos sitios estáticos en GitHub Pages:

| Sitio         | URL                                                                                             | Origen                          |
| ------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| Documentación | [kreyshin.github.io/KM.WEB.RESTAURANT](https://kreyshin.github.io/KM.WEB.RESTAURANT/)           | `backoffice/docs` (VitePress)   |
| Demo          | [kreyshin.github.io/KM.WEB.RESTAURANT/demo](https://kreyshin.github.io/KM.WEB.RESTAURANT/demo/) | `backoffice/src` en modo `demo` |

## Pasos del workflow

1. Instala dependencias con `npm ci`.
2. Ejecuta `npm run verify`: si falla formato, lint, tipos o pruebas, no se publica nada.
3. `npm run build:demo` → `dist-demo/`.
4. `npm run docs:build` → `docs/.vitepress/dist/`.
5. Une ambos en `site/` (la demo en `site/demo/`) y lo despliega en Pages.

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
