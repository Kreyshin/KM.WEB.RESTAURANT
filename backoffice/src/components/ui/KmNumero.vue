<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    id?: string
    min?: number
    max?: number
    step?: number
    /** Decimales permitidos y mostrados: 0 para cantidades enteras, 2 para soles. */
    decimales?: number
    /** Texto fijo delante del valor: «S/». */
    prefijo?: string
    /** Texto fijo detrás del valor: «%», «min». */
    sufijo?: string
    placeholder?: string
    invalido?: boolean
    disabled?: boolean
    /** Muestra los botones − y +. */
    controles?: boolean
  }>(),
  { step: 1, decimales: 0, invalido: false, disabled: false, controles: true },
)

const valor = defineModel<number | null | undefined>()

const enfocado = ref(false)
const texto = ref('')

function redondear(n: number) {
  const f = 10 ** props.decimales
  return Math.round((n + Number.EPSILON) * f) / f
}

function limitar(n: number) {
  let r = n
  if (props.min !== undefined) r = Math.max(props.min, r)
  if (props.max !== undefined) r = Math.min(props.max, r)
  return redondear(r)
}

/** Acepta coma o punto decimal, como se escribe en Perú. */
function interpretar(t: string): number | null {
  const limpio = t.trim().replace(',', '.')
  if (limpio === '' || limpio === '-' || limpio === '.') return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

/** Fuera de foco se ve con sus decimales fijos (38.00); al editar, tal cual se escribe. */
function formatear(n: number | null | undefined) {
  return n === null || n === undefined || Number.isNaN(n) ? '' : n.toFixed(props.decimales)
}

watch(
  valor,
  (v) => {
    if (!enfocado.value) texto.value = formatear(v)
  },
  { immediate: true },
)

const patronPermitido = computed(() => {
  const signo = props.min === undefined || props.min < 0 ? '-?' : ''
  const decimales = props.decimales > 0 ? `([.,]\\d{0,${props.decimales}})?` : ''
  return new RegExp(`^${signo}\\d*${decimales}$`)
})

function alEscribir(evento: Event) {
  const campo = evento.target as HTMLInputElement
  // Descarta lo que no encaja (letras, un segundo separador, decimales de más).
  if (!patronPermitido.value.test(campo.value)) {
    campo.value = texto.value
    return
  }
  texto.value = campo.value
  valor.value = interpretar(campo.value)
}

/**
 * Al salir solo se redondea a los decimales permitidos. Un valor fuera de
 * rango se conserva a propósito: cambiarlo en silencio ocultaría el error que
 * la validación del formulario debe mostrar («Máximo 13 %»).
 */
function alSalir() {
  enfocado.value = false
  const n = interpretar(texto.value)
  valor.value = n === null ? null : redondear(n)
  texto.value = formatear(valor.value)
}

function sumar(pasos: number) {
  if (props.disabled) return
  const base = interpretar(texto.value) ?? props.min ?? 0
  valor.value = limitar(base + pasos * props.step)
  texto.value = enfocado.value ? String(valor.value) : formatear(valor.value)
}

function alTeclear(evento: KeyboardEvent) {
  const multiplo = evento.shiftKey ? 10 : 1
  if (evento.key === 'ArrowUp') {
    evento.preventDefault()
    sumar(multiplo)
  } else if (evento.key === 'ArrowDown') {
    evento.preventDefault()
    sumar(-multiplo)
  }
}

const actual = computed(() => interpretar(texto.value))
const enMinimo = computed(
  () => props.min !== undefined && actual.value !== null && actual.value <= props.min,
)
const enMaximo = computed(
  () => props.max !== undefined && actual.value !== null && actual.value >= props.max,
)

const botonControl =
  'grid w-8 shrink-0 place-items-center text-tenue transition-colors hover:bg-seleccion hover:text-tinta disabled:pointer-events-none disabled:opacity-30'
</script>

<template>
  <div
    class="rs-campo flex h-10 w-full items-stretch overflow-hidden rounded-control border bg-panel text-sm transition-colors duration-200"
    :class="[
      invalido ? 'border-vino' : 'border-linea focus-within:border-verde',
      disabled ? 'bg-panel-2 opacity-70' : '',
    ]"
  >
    <span v-if="prefijo" class="flex items-center pl-3 text-tenue select-none" aria-hidden="true">
      {{ prefijo }}
    </span>

    <input
      :id="id"
      :value="texto"
      type="text"
      :inputmode="decimales > 0 ? 'decimal' : 'numeric'"
      autocomplete="off"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="invalido || undefined"
      role="spinbutton"
      :aria-valuenow="valor ?? undefined"
      :aria-valuemin="min"
      :aria-valuemax="max"
      class="rs-sin-anillo min-w-0 flex-1 bg-transparent px-3 text-tinta tabular-nums outline-none placeholder:text-tenue/70"
      :class="prefijo ? 'pl-1.5' : ''"
      @focus="enfocado = true"
      @input="alEscribir"
      @blur="alSalir"
      @keydown="alTeclear"
    />

    <span v-if="sufijo" class="flex items-center pr-3 text-tenue select-none" aria-hidden="true">
      {{ sufijo }}
    </span>

    <template v-if="controles">
      <button
        type="button"
        tabindex="-1"
        :class="[botonControl, 'border-l border-linea']"
        :disabled="disabled || enMinimo"
        aria-label="Disminuir"
        @mousedown.prevent
        @click="sumar(-1)"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" d="M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        tabindex="-1"
        :class="[botonControl, 'border-l border-linea']"
        :disabled="disabled || enMaximo"
        aria-label="Aumentar"
        @mousedown.prevent
        @click="sumar(1)"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </template>
  </div>
</template>
