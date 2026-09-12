<script setup lang="ts">
/**
 * Isotipo del sistema: un plato sobre la mesa, visto en planta.
 *
 * Construcción abstracta —aro de latón, centro macizo y filete de mesa— para
 * que funcione a 24px en la barra y a 64px en portada sin perder lectura.
 * Los colores son fijos a propósito: la marca no cambia con el tema.
 */
withDefaults(defineProps<{ tamano?: number }>(), { tamano: 44 })
</script>

<template>
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 44 44"
    fill="none"
    role="img"
    aria-label="Mesa"
  >
    <defs>
      <linearGradient
        id="rs-marca-fondo"
        x1="0"
        y1="0"
        x2="44"
        y2="44"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#0B2E23" />
        <stop offset="1" stop-color="#124436" />
      </linearGradient>
    </defs>

    <rect width="44" height="44" rx="13" fill="url(#rs-marca-fondo)" />

    <!-- Aro del plato -->
    <circle cx="22" cy="19.5" r="10" stroke="#C9A227" stroke-width="1.6" />
    <!-- Centro -->
    <circle cx="22" cy="19.5" r="4.4" fill="#D9BC5E" />
    <!-- Filete de la mesa -->
    <path d="M11 34h22" stroke="#C9A227" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
  </svg>
</template>
