<script setup lang="ts">
/**
 * Llama oficial de la vertical Restaurante.
 *
 * Conserva los degradados naranja, plata y grafito del activo maestro. Los
 * colores son fijos: la marca no cambia con el tema de la interfaz.
 */
withDefaults(defineProps<{ tamano?: number }>(), { tamano: 44 })
</script>

<template>
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 512 512"
    fill="none"
    role="img"
    aria-label="Mesa · Restaurante"
  >
    <defs>
      <linearGradient
        id="rs-fuego-principal"
        x1="116"
        y1="72"
        x2="233"
        y2="447"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#fff0dc" />
        <stop offset="0.18" stop-color="#ffb45f" />
        <stop offset="0.52" stop-color="#f36b25" />
        <stop offset="0.82" stop-color="#a53518" />
        <stop offset="1" stop-color="#4d1a13" />
      </linearGradient>
      <linearGradient
        id="rs-fuego-acento"
        x1="414"
        y1="171"
        x2="326"
        y2="442"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#ffb45f" />
        <stop offset="0.38" stop-color="#f47526" />
        <stop offset="0.78" stop-color="#b33a18" />
        <stop offset="1" stop-color="#5d1c12" />
      </linearGradient>
      <linearGradient
        id="rs-plata"
        x1="307"
        y1="76"
        x2="235"
        y2="460"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#fff" />
        <stop offset="0.28" stop-color="#e8ebf0" />
        <stop offset="0.58" stop-color="#aeb5c0" />
        <stop offset="0.82" stop-color="#646d79" />
        <stop offset="1" stop-color="#343b45" />
      </linearGradient>
      <linearGradient
        id="rs-grafito"
        x1="197"
        y1="183"
        x2="330"
        y2="434"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#737c89" />
        <stop offset="0.42" stop-color="#3e4651" />
        <stop offset="0.78" stop-color="#1e252d" />
        <stop offset="1" stop-color="#10151b" />
      </linearGradient>
      <linearGradient
        id="rs-blanco"
        x1="250"
        y1="28"
        x2="286"
        y2="320"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#fff" />
        <stop offset="0.52" stop-color="#f4f5f7" />
        <stop offset="1" stop-color="#bbc2cc" />
      </linearGradient>
      <filter
        id="rs-sombra-llama"
        x="35"
        y="4"
        width="445"
        height="488"
        filterUnits="userSpaceOnUse"
        color-interpolation-filters="sRGB"
      >
        <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#05070a" flood-opacity="0.58" />
      </filter>
    </defs>

    <g filter="url(#rs-sombra-llama)">
      <path
        d="M181 466C108 421 75 358 91 294C101 252 128 220 158 187C196 145 219 101 203 45C266 100 274 170 239 231C220 264 189 290 175 327C158 372 169 419 181 466Z"
        fill="url(#rs-fuego-principal)"
      />
      <path
        d="M224 472C183 424 179 374 201 327C220 288 254 258 276 220C309 165 320 108 284 42C370 106 382 199 339 274C315 316 278 345 258 386C244 415 239 445 241 474L224 472Z"
        fill="url(#rs-plata)"
      />
      <path
        d="M201 327C220 288 254 258 276 220C292 193 303 166 305 137C325 194 315 247 282 294C252 336 225 374 224 424C187 386 183 365 201 327Z"
        fill="url(#rs-grafito)"
      />
      <path
        d="M246 300C225 261 232 222 256 184C286 137 294 91 270 30C336 88 339 160 306 217C286 252 259 271 246 300Z"
        fill="url(#rs-blanco)"
      />
      <path
        d="M304 465C286 420 297 376 332 342C368 307 406 281 414 218C465 289 434 374 380 415C351 437 329 454 320 476L304 465Z"
        fill="url(#rs-fuego-acento)"
      />
      <path
        d="M317 414C327 376 354 351 383 329C403 314 420 296 432 273C422 332 391 374 354 403C337 416 326 430 320 447C316 437 315 426 317 414Z"
        fill="#f8f9fb"
        fill-opacity="0.92"
      />
    </g>
  </svg>
</template>
