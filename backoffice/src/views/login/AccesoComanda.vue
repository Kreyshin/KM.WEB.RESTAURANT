<script setup lang="ts">
import FormularioAcceso from '@/components/acceso/FormularioAcceso.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaMesa from '@/components/marca/MarcaMesa.vue'
import { computed } from 'vue'
import { marca } from '@/config/marca'

/**
 * Variante «Comanda»: el acceso impreso como una comanda de cocina.
 *
 * No es un formulario con un marco bonito: es el papel que sale por la
 * impresora del pase, con su troquel dentado, su cabecera en versalitas y su
 * correlativo. Entrar al sistema es mandar la primera comanda del día.
 *
 * La vertical hermana usa la misma idea con su objeto de oficio —allí la pieza
 * es una tarjeta-llave de habitación—, y de ahí viene el aire de familia.
 */
const ahora = new Date()
/** En cocina el reloj es de 24 horas: «20:29», nunca «08:29 p. m.». */
const hora = ahora.toLocaleTimeString('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const anio = ahora.getFullYear()

/**
 * Troquel del papel, recortado de verdad con `clip-path`.
 *
 * Dibujarlo con degradados no sirve: el diente tendría que pintarse del color
 * del fondo, y el fondo lleva halos. Recortando la pieza, el troquel funciona
 * sobre cualquier superficie.
 */
const DIENTES = 26
const ALTO_DIENTE = 9

const troquel = computed(() => {
  const puntos: string[] = []
  const x = (i: number) => `${((i / DIENTES) * 100).toFixed(3)}%`

  // Canto superior, de izquierda a derecha.
  for (let i = 0; i < DIENTES; i += 1) {
    puntos.push(`${x(i)} 0`, `${x(i + 0.5)} ${ALTO_DIENTE}px`)
  }
  puntos.push('100% 0', '100% 100%')

  // Canto inferior, de derecha a izquierda.
  for (let i = DIENTES; i > 0; i -= 1) {
    puntos.push(`${x(i - 0.5)} calc(100% - ${ALTO_DIENTE}px)`, `${x(i - 1)} 100%`)
  }
  puntos.push('0 100%')

  return `polygon(${puntos.join(', ')})`
})
</script>

<template>
  <div class="acceso-fondo grid h-full place-items-center overflow-y-auto p-5 sm:p-8">
    <div class="w-full max-w-md py-6">
      <!-- La marca va fuera: la comanda no lleva el logotipo impreso. -->
      <div class="mb-7 flex items-center justify-center gap-3">
        <MarcaMesa :tamano="38" />
        <div>
          <p class="rs-display text-lg leading-none font-semibold text-tinta">{{ marca.nombre }}</p>
          <p class="rs-etiqueta mt-1 text-laton-texto">{{ marca.descriptor }}</p>
        </div>
      </div>

      <!-- El papel, arrancado de la impresora del pase. -->
      <article class="acceso-comanda bg-panel" :style="{ clipPath: troquel }">
        <header class="border-b border-dashed border-linea px-7 pt-9 pb-5 text-center">
          <p class="rs-etiqueta text-tenue">Comanda de apertura</p>
          <p class="rs-display mt-2 text-[1.7rem] leading-none font-semibold text-tinta">
            Buen servicio
          </p>

          <dl class="mt-4 flex items-center justify-center gap-5 font-mono text-[11px] text-tenue">
            <div class="flex items-center gap-1.5">
              <dt class="sr-only">Turno</dt>
              <dd>TURNO {{ hora }}</dd>
            </div>
            <span aria-hidden="true">·</span>
            <div class="flex items-center gap-1.5">
              <dt class="sr-only">Correlativo</dt>
              <dd>N.º {{ anio }}-0001</dd>
            </div>
          </dl>
        </header>

        <div class="px-7 pt-6 pb-7">
          <FormularioAcceso accion="Marcar comanda" />
        </div>

        <footer
          class="flex items-center justify-between gap-4 border-t border-dashed border-linea px-7 pt-3.5 pb-6"
        >
          <span class="font-mono text-[11px] tracking-widest text-tenue">*** PASE ***</span>
          <span class="flex items-center gap-2">
            <KarmaLogo :tamano="15" />
            <span class="text-[11px] text-tenue">{{ marca.plataforma }}</span>
          </span>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
/*
 * Fondo: el fuego de la vertical abierto en dos halos sobre la porcelana. Sin
 * imágenes, así que escala a cualquier pantalla sin pesar nada.
 */
.acceso-fondo {
  background-color: var(--rs-bg);
  background-image:
    radial-gradient(
      36rem 22rem at 8% -6%,
      color-mix(in srgb, var(--rs-verde-500) 55%, transparent),
      transparent 64%
    ),
    radial-gradient(
      32rem 20rem at 102% 106%,
      color-mix(in srgb, var(--rs-laton-500) 55%, transparent),
      transparent 68%
    );
}

/*
 * El papel: esquinas rectas, porque una comanda no tiene bordes redondeados.
 * No lleva sombra: `clip-path` recortaría cualquier sombra exterior, así que
 * la pieza se separa del fondo por contraste, no por elevación.
 */
.acceso-comanda {
  position: relative;
  transform: rotate(0.5deg);
}

@media (prefers-reduced-motion: reduce) {
  .acceso-comanda {
    transform: none;
  }
}
</style>
