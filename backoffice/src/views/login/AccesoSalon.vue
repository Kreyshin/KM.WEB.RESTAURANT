<script setup lang="ts">
import { computed } from 'vue'
import FormularioAcceso from '@/components/acceso/FormularioAcceso.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaMesa from '@/components/marca/MarcaMesa.vue'
import { marca } from '@/config/marca'

/**
 * Variante «Salón»: el plano del comedor media hora antes del servicio.
 *
 * En vez de una ilustración de archivo, la escena se dibuja con la propia
 * unidad de negocio: cada pieza es una mesa y su color dice en qué estado
 * está. Es el mismo plano que el usuario verá en Sala, contado como escena, así
 * que la pantalla de acceso ya enseña el producto.
 *
 * La vertical hermana usa este mismo armazón con su unidad: allí las celdas son
 * ventanas de una fachada, una por habitación. De ahí el aire de familia.
 */

type Estado = 'ocupada' | 'libre' | 'reservada' | 'limpieza'

const FILAS = 4
const COLUMNAS = 7

/**
 * Patrón fijo, no aleatorio: un comedor que cambia en cada recarga parece un
 * error, y además impediría comparar capturas entre despliegues. Se escribe en
 * una sola cadena —`o` ocupada, `l` libre, `r` reservada, `c` en limpieza—
 * para que ningún formateador pueda desalinear las filas.
 */
const PATRON = 'olorcol' + 'oolcorl' + 'rooolco' + 'ocloolo'

const mapa: Record<string, Estado> = {
  o: 'ocupada',
  l: 'libre',
  r: 'reservada',
  c: 'limpieza',
}

/** Las mesas alternan redonda y cuadrada, como en un comedor de verdad. */
const mesas = computed(() =>
  Array.from({ length: FILAS * COLUMNAS }, (_, i) => {
    const fila = Math.floor(i / COLUMNAS)
    const columna = i % COLUMNAS
    return {
      id: `${fila}-${columna}`,
      estado: mapa[PATRON[i] ?? 'l'] ?? 'libre',
      redonda: (fila + columna) % 2 === 0,
      // Las mesas se van ocupando por diagonales: el salón se llena, no parpadea.
      retardo: `${(fila + columna) * 70}ms`,
    }
  }),
)

const leyenda: { estado: Estado; etiqueta: string }[] = [
  { estado: 'ocupada', etiqueta: 'Ocupada' },
  { estado: 'libre', etiqueta: 'Libre' },
  { estado: 'reservada', etiqueta: 'Reservada' },
  { estado: 'limpieza', etiqueta: 'En limpieza' },
]
</script>

<template>
  <div class="grid h-full lg:grid-cols-[1.1fr_1fr]">
    <!-- Escena -->
    <div class="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
      <div class="absolute inset-0 bg-[#0d1014]" />
      <div
        class="absolute inset-x-0 top-0 h-2/3 opacity-55"
        style="background: radial-gradient(58rem 30rem at 50% -18%, #9f3218 0%, transparent 70%)"
      />

      <header class="relative flex items-center gap-3.5">
        <MarcaMesa :tamano="44" />
        <div>
          <p class="rs-display text-xl leading-none font-semibold text-[#f8f9fb]">
            {{ marca.nombre }}
          </p>
          <p class="rs-etiqueta mt-1.5 text-[#ff9145]">{{ marca.descriptor }}</p>
        </div>
      </header>

      <!-- El plano: una pieza por mesa. -->
      <div class="relative my-6 flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div class="acceso-salon w-full max-w-[26rem] rounded-card border border-white/10 p-5">
          <div
            class="grid gap-3"
            :style="{ gridTemplateColumns: `repeat(${COLUMNAS}, minmax(0, 1fr))` }"
            role="img"
            :aria-label="`Plano del comedor con ${FILAS * COLUMNAS} mesas en distintos estados`"
          >
            <span
              v-for="m in mesas"
              :key="m.id"
              class="acceso-mesa"
              :class="[`es-${m.estado}`, m.redonda ? 'es-redonda' : '']"
              :style="{ animationDelay: m.retardo }"
            />
          </div>

          <!-- Pase de cocina: la barra por donde salen los platos. -->
          <div class="mt-5 flex items-center gap-2 border-t border-white/10 pt-4">
            <span class="acceso-pase" aria-hidden="true" />
            <span class="rs-etiqueta text-white/35">Pase</span>
          </div>
        </div>
      </div>

      <!-- El filete de la marca cierra la escena por abajo. -->
      <div class="rs-filete relative" role="presentation" />

      <div class="relative">
        <h1
          class="rs-display mt-8 max-w-sm text-[2.4rem] leading-[1.12] font-semibold text-[#f8f9fb]"
        >
          {{ marca.lema }}
        </h1>

        <ul class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <li
            v-for="l in leyenda"
            :key="l.estado"
            class="flex items-center gap-2 text-xs text-[#a6adb7]"
          >
            <span class="acceso-punto" :class="`es-${l.estado}`" aria-hidden="true" />
            {{ l.etiqueta }}
          </li>
        </ul>

        <div class="mt-8 flex items-center gap-2.5">
          <KarmaLogo :tamano="18" />
          <p class="text-xs text-[#929aa6]">{{ marca.plataforma }}</p>
        </div>
      </div>
    </div>

    <!-- Acceso -->
    <div class="flex items-center justify-center bg-panel p-6">
      <div class="w-full max-w-sm">
        <div class="mb-9 flex items-center gap-3 lg:hidden">
          <MarcaMesa :tamano="40" />
          <p class="rs-display text-lg leading-none font-semibold text-tinta">{{ marca.nombre }}</p>
        </div>

        <p class="rs-etiqueta text-laton-texto">Sala</p>
        <h2 class="rs-titulo-pagina mt-2 text-tinta">Abre el servicio</h2>
        <p class="mt-2 text-sm text-tenue">El comedor está listo. Entra y reparte la sala.</p>

        <div class="mt-8">
          <FormularioAcceso accion="Abrir el servicio" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* El salón, visto desde arriba: madera oscura y luz cenital. */
.acceso-salon {
  background: linear-gradient(180deg, rgb(30 37 45 / 0.75) 0%, rgb(13 16 20 / 0.9) 100%);
  backdrop-filter: blur(2px);
}

.acceso-mesa {
  display: block;
  aspect-ratio: 1;
  border-radius: 5px;
  opacity: 0;
  animation: acceso-sentar 0.6s ease-out forwards;
}

.acceso-mesa.es-redonda {
  border-radius: 999px;
}

/* Ocupada: la mesa con servicio, en el fuego de la vertical. */
.acceso-mesa.es-ocupada {
  background: linear-gradient(180deg, #ff9145 0%, #b8401b 100%);
  box-shadow: 0 0 12px -2px rgb(243 107 37 / 0.55);
}

/* Libre: la mesa puesta, a la espera. */
.acceso-mesa.es-libre {
  background: rgb(174 181 192 / 0.12);
  border: 1px solid rgb(174 181 192 / 0.22);
}

/* Reservada: comprometida, con el latón de la casa. */
.acceso-mesa.es-reservada {
  background: rgb(174 181 192 / 0.3);
  box-shadow: inset 0 0 0 1.5px rgb(215 196 150 / 0.55);
}

/* En limpieza: se está montando de nuevo. */
.acceso-mesa.es-limpieza {
  background: rgb(63 98 120 / 0.55);
  animation:
    acceso-sentar 0.6s ease-out forwards,
    acceso-montar 3s ease-in-out infinite 1.1s;
}

/* El pase de cocina, iluminado. */
.acceso-pase {
  height: 8px;
  flex: 1;
  border-radius: 999px;
  background: linear-gradient(90deg, rgb(243 107 37 / 0.65), rgb(243 107 37 / 0.08));
  box-shadow: 0 0 18px -4px rgb(243 107 37 / 0.6);
}

.acceso-punto {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

.acceso-punto.es-ocupada {
  background: linear-gradient(180deg, #ff9145 0%, #b8401b 100%);
}

.acceso-punto.es-libre {
  background: rgb(174 181 192 / 0.25);
  border: 1px solid rgb(174 181 192 / 0.45);
}

.acceso-punto.es-reservada {
  background: rgb(215 196 150 / 0.7);
}

.acceso-punto.es-limpieza {
  background: rgb(158 189 206 / 0.7);
}

@keyframes acceso-sentar {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes acceso-montar {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Quien pide menos movimiento ve el salón ya montado. */
@media (prefers-reduced-motion: reduce) {
  .acceso-mesa,
  .acceso-mesa.es-limpieza {
    opacity: 1;
    animation: none;
  }
}
</style>
