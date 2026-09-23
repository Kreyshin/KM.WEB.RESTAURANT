<script setup lang="ts">
/**
 * PRESERVADO — Isotipo Karma Novum.
 *
 * Activo maestro entregado por la corporación, en
 * `src/assets/karma/karma-novum-icono.svg`. Se conserva sin alteraciones: no
 * recolorear, no recortar, no cambiar los degradados. Se usa como atribución
 * de plataforma dentro del sistema de restaurante.
 */
withDefaults(defineProps<{ tamano?: number }>(), { tamano: 40 })
</script>

<template>
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 1254 1254"
    fill="none"
    role="img"
    aria-label="Karma Novum"
  >
    <defs>
      <linearGradient
        id="km-novum-plata"
        x1="80"
        y1="240"
        x2="760"
        y2="760"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stop-color="#F2F5FA" />
        <stop offset="0.52" stop-color="#C9D0DB" />
        <stop offset="1" stop-color="#A5ADBA" />
      </linearGradient>
      <linearGradient
        id="km-novum-violeta-externo"
        x1="704"
        y1="492"
        x2="1222"
        y2="1052"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stop-color="#8A79FF" />
        <stop offset="1" stop-color="#4A42FF" />
      </linearGradient>
      <linearGradient
        id="km-novum-violeta-interno"
        x1="608"
        y1="592"
        x2="1016"
        y2="1052"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stop-color="#7A88FF" />
        <stop offset="1" stop-color="#4250FF" />
      </linearGradient>
      <linearGradient
        id="km-novum-azul"
        x1="312"
        y1="970"
        x2="603"
        y2="970"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stop-color="#163D8E" />
        <stop offset="1" stop-color="#2766EC" />
      </linearGradient>
    </defs>

    <polygon points="563,502 61,1050 251,1045 560,712" fill="url(#km-novum-plata)" />
    <polygon points="608,201 734,318 734,615 598,467 598,213" fill="url(#km-novum-plata)" />
    <polygon
      points="734,477 733,616 700,580 1101,1049 1210,1051 1213,1037"
      fill="url(#km-novum-violeta-externo)"
    />
    <polygon
      points="601,584 660,638 1013,1051 839,1051 599,781"
      fill="url(#km-novum-violeta-interno)"
    />
    <polygon points="603,889 462,889 312,1049 456,1048" fill="url(#km-novum-azul)" />
  </svg>
</template>
