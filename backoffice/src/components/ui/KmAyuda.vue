<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

/**
 * Ayuda contextual junto a un título.
 *
 * Existe para sacar de la pantalla los párrafos que explican cómo funciona
 * algo. Esa explicación hace falta la primera vez y estorba las cien
 * siguientes: dejarla fija empuja hacia abajo el contenido de verdad, y
 * quitarla deja al usuario sin contexto. El punto medio es esto —está ahí,
 * pero solo cuando se pide.
 *
 * Se abre al pasar el ratón y **se fija al pulsar**, porque un panel que se
 * cierra al mover el ratón no se puede leer con calma, ni existe en una
 * tablet. Mientras está fijado se cierra con `Escape` o pulsando fuera.
 */

withDefaults(
  defineProps<{
    /** Encabezado del panel. Sin él, solo va el contenido. */
    titulo?: string
    /** Nombre accesible del botón. */
    etiqueta?: string
    /** Ancho máximo del panel. */
    ancho?: 'sm' | 'md'
  }>(),
  { etiqueta: 'Más información', ancho: 'md' },
)

const idPanel = useId()
const boton = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const encima = ref(false)
const fijado = ref(false)
const posicion = ref({ top: 0, left: 0 })

const visible = computed(() => encima.value || fijado.value)

/** El ancho lo pone una sola clase: mezclar `w-` y `max-w-` se pisa. */
const anchos = { sm: 'w-[min(92vw,20rem)]', md: 'w-[min(92vw,26rem)]' } as const

/**
 * El panel cuelga bajo el icono, alineado a su izquierda, y se corrige para
 * no salirse de la ventana. Vive en `<body>` para que no lo recorte ningún
 * contenedor con `overflow`.
 */
async function colocar() {
  await nextTick()
  if (!boton.value || !panel.value) return
  const r = boton.value.getBoundingClientRect()
  const ancho = panel.value.offsetWidth
  const margen = 12
  posicion.value = {
    top: r.bottom + 10,
    left: Math.min(Math.max(r.left - 8, margen), window.innerWidth - ancho - margen),
  }
}

watch(visible, (v) => {
  if (v) {
    colocar()
    window.addEventListener('scroll', colocar, true)
    window.addEventListener('resize', colocar)
  } else {
    window.removeEventListener('scroll', colocar, true)
    window.removeEventListener('resize', colocar)
  }
})

function alternarFijado() {
  fijado.value = !fijado.value
}

function alPulsarTecla(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    fijado.value = false
    encima.value = false
    boton.value?.focus()
  }
}

function alPulsarFuera(e: MouseEvent) {
  if (!fijado.value) return
  const destino = e.target as Node
  if (boton.value?.contains(destino) || panel.value?.contains(destino)) return
  fijado.value = false
}

watch(fijado, (v) => {
  if (v) {
    document.addEventListener('keydown', alPulsarTecla)
    document.addEventListener('mousedown', alPulsarFuera)
  } else {
    document.removeEventListener('keydown', alPulsarTecla)
    document.removeEventListener('mousedown', alPulsarFuera)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', alPulsarTecla)
  document.removeEventListener('mousedown', alPulsarFuera)
  window.removeEventListener('scroll', colocar, true)
  window.removeEventListener('resize', colocar)
})
</script>

<template>
  <button
    ref="boton"
    type="button"
    class="km-ayuda-boton grid size-6 shrink-0 place-items-center rounded-full border transition-colors"
    :class="visible ? 'km-ayuda-activo' : 'border-linea text-tenue'"
    :aria-label="etiqueta"
    :aria-expanded="visible"
    :aria-controls="idPanel"
    @mouseenter="encima = true"
    @mouseleave="encima = false"
    @focus="encima = true"
    @blur="encima = false"
    @click="alternarFijado"
  >
    <svg
      class="size-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M12 16v-5M12 7.6v.2" />
    </svg>
  </button>

  <Teleport to="body">
    <Transition name="km-ayuda">
      <div
        v-if="visible"
        :id="idPanel"
        ref="panel"
        role="note"
        class="km-ayuda-panel fixed z-[70] rounded-card border p-4"
        :class="anchos[ancho]"
        :style="{ top: `${posicion.top}px`, left: `${posicion.left}px` }"
        @mouseenter="encima = true"
        @mouseleave="encima = false"
      >
        <span class="km-ayuda-pico" aria-hidden="true" />
        <p v-if="titulo" class="mb-2 text-sm font-semibold text-tinta">{{ titulo }}</p>
        <div class="km-ayuda-cuerpo flex flex-col gap-2 text-sm text-tenue">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.km-ayuda-boton:hover,
.km-ayuda-activo {
  border-color: var(--color-accion);
  color: var(--color-accion);
}

.km-ayuda-boton:focus-visible {
  outline: none;
  box-shadow: var(--rs-foco);
}

.km-ayuda-panel {
  background-color: var(--color-panel);
  border-color: var(--color-linea);
  box-shadow: 0 16px 40px -12px rgb(0 0 0 / 0.35);
}

/* El pico ancla el panel al icono: sin él parece una tarjeta suelta. */
.km-ayuda-pico {
  position: absolute;
  top: -5px;
  left: 14px;
  width: 10px;
  height: 10px;
  transform: rotate(45deg);
  background-color: var(--color-panel);
  border-top: 1px solid var(--color-linea);
  border-left: 1px solid var(--color-linea);
}

.km-ayuda-cuerpo :deep(strong) {
  color: var(--color-tinta);
}

.km-ayuda-enter-active,
.km-ayuda-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.km-ayuda-enter-from,
.km-ayuda-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .km-ayuda-enter-active,
  .km-ayuda-leave-active {
    transition: none;
  }
}
</style>
