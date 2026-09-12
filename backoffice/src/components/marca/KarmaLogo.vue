<script setup lang="ts">
/**
 * PRESERVADO — Isotipo Karma Corp.
 *
 * Bloque «K» con el degradado oficial #6A0DAD → #8A2BE2, según §7 de
 * docs/KARMA-IDENTIDAD-VISUAL.md. Se conserva sin alteraciones y se usa como
 * atribución de plataforma dentro del sistema de restaurante.
 *
 * Sigue siendo una construcción provisional: cuando el repositorio Angular
 * incorpore `karma-corp-logo.svg` como activo maestro, este componente debe
 * reemplazarse por ese SVG. Nunca recolorearlo.
 */
withDefaults(defineProps<{ tamano?: number }>(), { tamano: 40 })
</script>

<template>
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 40 40"
    fill="none"
    role="img"
    aria-label="Karma Corp"
  >
    <defs>
      <linearGradient
        id="km-logo-degradado"
        x1="0"
        y1="0"
        x2="40"
        y2="40"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#6A0DAD" />
        <stop offset="1" stop-color="#8A2BE2" />
      </linearGradient>
    </defs>

    <rect width="40" height="40" rx="11" fill="url(#km-logo-degradado)" />
    <path
      d="M14 10v20M14 20l9-10M14 20l9 10"
      stroke="#fff"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
