---
layout: home

hero:
  name: Mesa
  text: Back office de restaurante
  tagline: Documentación de KM.Restaurante — arquitectura, componentes y entidades del dominio. Todo funciona hoy con datos de ejemplo.
  image:
    src: /favicon.svg
    alt: Llama de la vertical Restaurante
  actions:
    - theme: brand
      text: Empezar
      link: /guia/introduccion
    - theme: alt
      text: Componentes
      link: /componentes/
    - theme: alt
      text: Abrir la demo
      link: https://kreyshin.github.io/KM.WEB.RESTAURANT/demo/
      target: _blank

features:
  - icon: ◈
    title: Front primero, datos simulados
    details: Cada pantalla consume un servicio. Hoy responde un mock en el navegador; mañana, la API real, sin tocar las vistas.
    link: /guia/datos-mock
  - icon: ◇
    title: Componentes Km*
    details: Tabla con orden y paginación, pestañas, drawer, fechas, carga de imágenes y estados. Con demo viva, código y props.
    link: /componentes/
  - icon: ⬡
    title: Entidades para el backend
    details: Los tipos de src/types describen el modelo de datos que luego se llevará a la base de datos.
    link: /guia/entidades
  - icon: ↗
    title: Roadmap por fases
    details: Once fases de front-end, de la base de interfaz a reportes y pulido final.
    link: /guia/roadmap
---
