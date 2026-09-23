<script setup lang="ts">
/**
 * Íconos de línea 24×24 de la misma familia que `KmBotonIcono`, para
 * acompañar datos (conversiones, controles, modos) sin ser botones.
 */
export type NombreIcono =
  | 'caja'
  | 'estante'
  | 'flecha'
  | 'lote'
  | 'calendario'
  | 'ubicacion'
  | 'serie'
  | 'candado'
  | 'ojoCerrado'
  | 'conteo'
  | 'impresora'
  | 'alerta'
  | 'check'
  | 'rechazo'
  | 'procesar'
  | 'dividir'

withDefaults(defineProps<{ nombre: NombreIcono; tamano?: 'xs' | 'sm' | 'md' | 'lg' }>(), {
  tamano: 'sm',
})

const tamanos = { xs: 'size-3.5', sm: 'size-4', md: 'size-5', lg: 'size-6' } as const

const trazos: Record<NombreIcono, string[]> = {
  caja: ['M3 8l9-5 9 5v8l-9 5-9-5V8z', 'M3 8l9 5 9-5', 'M12 13v8'],
  estante: ['M4 3v18M20 3v18', 'M4 9h16M4 15h16', 'M7 6h4M13 12h4M7 18h5'],
  flecha: ['M4 12h15', 'M14 6l6 6-6 6'],
  lote: ['M4 7h16v10H4z', 'M8 7v10M11 7v10M13 7v10M16 7v10'],
  calendario: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4M16 3v4'],
  ubicacion: [
    'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z',
    'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  ],
  serie: ['M4 6v12', 'M7 6v12', 'M11 6v12', 'M13 6v12', 'M17 6v12', 'M20 6v12'],
  candado: ['M6 11h12v10H6z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  ojoCerrado: [
    'M3 3l18 18',
    'M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9',
    'M6.6 6.6C3.8 8.4 2 12 2 12s3.5 6 10 6a9.6 9.6 0 0 0 5.4-1.6',
    'M9.9 9.9a3 3 0 0 0 4.2 4.2',
  ],
  conteo: ['M9 4h6v3H9z', 'M7 5H5v16h14V5h-2', 'M8 12l2 2 4-4', 'M8 17h8'],
  impresora: ['M7 9V3h10v6', 'M7 17H4v-8h16v8h-3', 'M7 14h10v7H7z'],
  alerta: ['M12 3l10 18H2L12 3z', 'M12 10v4', 'M12 17.5v.5'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  rechazo: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M9 9l6 6M15 9l-6 6'],
  procesar: ['M6 3v8a3 3 0 0 0 6 0V3', 'M9 3v18', 'M17 3c-2 2-2 7 0 9v9'],
  dividir: ['M12 3v6', 'M12 9l-6 6v6', 'M12 9l6 6v6'],
}
</script>

<template>
  <svg
    :class="tamanos[tamano]"
    class="shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="d in trazos[nombre]" :key="d" :d="d" />
  </svg>
</template>
