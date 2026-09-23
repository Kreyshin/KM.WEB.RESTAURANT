<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Campo de hora en formato 24 h (`HH:mm`). Se escribe a mano («1830» o
 * «18:30») o se elige en un panel con columnas de horas y minutos.
 */
const props = withDefaults(
  defineProps<{
    id?: string
    etiqueta?: string
    invalido?: boolean
    disabled?: boolean
    /** Salto de los minutos del panel. Escribiendo se acepta cualquier minuto. */
    pasoMinutos?: number
  }>(),
  { invalido: false, disabled: false, pasoMinutos: 5 },
)

const hora = defineModel<string>({ default: '' })

const texto = ref(hora.value)
watch(hora, (v) => (texto.value = v))
// Una hora completa escrita se aplica al instante, sin esperar a salir del campo.
watch(texto, (v) => {
  if (/^\d{2}:\d{2}$/.test(v) && normalizar(v) === v) hora.value = v
})

const abierto = ref(false)
const raiz = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const posicion = ref({ top: 0, left: 0 })

const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minutos = computed(() =>
  Array.from({ length: Math.ceil(60 / props.pasoMinutos) }, (_, i) =>
    String(i * props.pasoMinutos).padStart(2, '0'),
  ),
)

const hh = computed(() => hora.value.split(':')[0] ?? '')
const mm = computed(() => hora.value.split(':')[1] ?? '')

function normalizar(valor: string): string | null {
  const digitos = valor.replace(/\D/g, '')
  if (!digitos) return ''
  let h: number
  let m: number
  if (valor.includes(':')) {
    const [a, b = '0'] = valor.split(':')
    h = Number(a)
    m = Number(b)
  } else if (digitos.length <= 2) {
    h = Number(digitos)
    m = 0
  } else {
    h = Number(digitos.slice(0, digitos.length - 2))
    m = Number(digitos.slice(-2))
  }
  if (!(h >= 0 && h <= 23 && m >= 0 && m <= 59)) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function confirmarTexto() {
  const n = normalizar(texto.value)
  if (n === null) texto.value = hora.value
  else hora.value = n
}

function elegir(parte: 'h' | 'm', valor: string) {
  const h = parte === 'h' ? valor : hh.value || '00'
  const m = parte === 'm' ? valor : mm.value || '00'
  hora.value = `${h}:${m}`
  if (parte === 'm') cerrar()
}

async function abrir() {
  if (props.disabled) return
  const r = raiz.value!.getBoundingClientRect()
  const alto = 260
  const top = r.bottom + alto + 8 > window.innerHeight ? r.top - alto - 4 : r.bottom + 4
  posicion.value = { top, left: r.left }
  abierto.value = true
  await nextTick()
  // Centra la hora elegida en cada columna.
  panel.value?.querySelectorAll<HTMLElement>('[aria-selected="true"]').forEach((el) => {
    const lista = el.closest('ul')!
    const desfase = el.getBoundingClientRect().top - lista.getBoundingClientRect().top
    lista.scrollTop += desfase - lista.clientHeight / 2 + el.offsetHeight / 2
  })
  document.addEventListener('pointerdown', fuera, true)
}

function cerrar() {
  abierto.value = false
  document.removeEventListener('pointerdown', fuera, true)
}

function fuera(e: Event) {
  const t = e.target as Node
  if (!raiz.value?.contains(t) && !panel.value?.contains(t)) cerrar()
}

onBeforeUnmount(cerrar)
</script>

<template>
  <div
    ref="raiz"
    class="rs-hora"
    :class="{ 'rs-hora-invalida': invalido, 'rs-hora-abierta': abierto, 'opacity-50': disabled }"
  >
    <input
      :id="id"
      v-model="texto"
      type="text"
      inputmode="numeric"
      maxlength="5"
      placeholder="--:--"
      :aria-label="etiqueta"
      :aria-invalid="invalido || undefined"
      :disabled="disabled"
      class="w-full min-w-0 bg-transparent tabular-nums outline-none"
      @focus="($event.target as HTMLInputElement).select()"
      @blur="confirmarTexto"
      @keydown.enter.prevent="(confirmarTexto(), cerrar())"
      @keydown.esc="cerrar"
      @keydown.down.prevent="abrir"
    />
    <button
      type="button"
      class="grid size-7 shrink-0 place-items-center rounded-[5px] text-tenue hover:bg-seleccion hover:text-tinta"
      :aria-label="`Elegir ${etiqueta ?? 'hora'}`"
      :aria-expanded="abierto"
      :disabled="disabled"
      @click="abierto ? cerrar() : abrir()"
    >
      <svg
        viewBox="0 0 24 24"
        class="size-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="abierto"
        ref="panel"
        class="rs-hora-panel"
        :style="{ top: `${posicion.top}px`, left: `${posicion.left}px` }"
        @keydown.esc="cerrar"
      >
        <div class="rs-hora-cabecera"><span>Hora</span><span>Min</span></div>
        <div class="flex gap-1">
          <ul role="listbox" aria-label="Horas" class="rs-hora-columna">
            <li v-for="h in horas" :key="h">
              <button
                type="button"
                role="option"
                :aria-selected="h === hh"
                class="rs-hora-opcion"
                @click="elegir('h', h)"
              >
                {{ h }}
              </button>
            </li>
          </ul>
          <ul role="listbox" aria-label="Minutos" class="rs-hora-columna">
            <li v-for="m in minutos" :key="m">
              <button
                type="button"
                role="option"
                :aria-selected="m === mm"
                class="rs-hora-opcion"
                @click="elegir('m', m)"
              >
                {{ m }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.rs-hora {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 36px;
  width: 7.5rem;
  padding: 0 4px 0 10px;
  border: 1px solid var(--color-linea);
  border-radius: var(--radius-control);
  background: var(--color-panel);
  color: var(--color-tinta);
  font-size: 0.875rem;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.rs-hora:focus-within,
.rs-hora-abierta {
  border-color: var(--color-accion);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accion) 20%, transparent);
}
.rs-hora-invalida {
  border-color: var(--color-vino);
}
.rs-hora-panel {
  position: fixed;
  z-index: 80;
  padding: 6px;
  border: 1px solid var(--color-linea);
  border-radius: var(--radius-card);
  background: var(--color-panel);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.3);
}
.rs-hora-cabecera {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 2px 0 6px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-tenue);
}
.rs-hora-columna {
  height: 220px;
  width: 56px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.rs-hora-opcion {
  display: block;
  width: 100%;
  height: 32px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-tinta);
}
.rs-hora-opcion:hover {
  background: var(--color-seleccion);
}
.rs-hora-opcion[aria-selected='true'] {
  background: var(--color-accion);
  color: #fff;
  font-weight: 600;
}
</style>
