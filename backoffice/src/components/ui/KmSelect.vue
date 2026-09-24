<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import type { OpcionSelect } from '@/types/ui'

/**
 * Lista desplegable con buscador.
 *
 * Sustituye al `<select>` nativo: con catálogos largos (insumos, artículos)
 * el nativo se vuelve una lista inmensa sin filtro. El panel muestra como
 * mucho ~8 opciones con scroll propio, se abre hacia arriba si no hay sitio
 * abajo y se alinea a la derecha si no cabe hacia la derecha. Va teletransportado
 * a `body` para que no lo recorten modales, drawers ni tablas con scroll.
 */

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    id?: string
    opciones: OpcionSelect[]
    placeholder?: string
    /** Nombre accesible cuando el select no tiene label visible. */
    etiqueta?: string
    invalido?: boolean
    disabled?: boolean
  }>(),
  { invalido: false, disabled: false },
)

const modelo = defineModel<string | number | undefined>()

const base = useId()
const idLista = `${base}-lista`
const abierto = ref(false)
const texto = ref('')
const activo = ref(0)
const disparador = ref<HTMLButtonElement>()
const panel = ref<HTMLDivElement>()
const buscador = ref<HTMLInputElement>()
const lista = ref<HTMLUListElement>()
const estiloPanel = ref<Record<string, string>>({})

const ALTO_OPCION = 36
const MAX_VISIBLES = 8
const ALTO_BUSCADOR = 52
const MARGEN = 8

const seleccionada = computed(() => props.opciones.find((o) => o.valor === modelo.value))

/** Búsqueda sin tildes ni mayúsculas: «cafe» encuentra «Café». */
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtradas = computed(() => {
  const q = normalizar(texto.value.trim())
  return q ? props.opciones.filter((o) => normalizar(o.etiqueta).includes(q)) : props.opciones
})

function posicionar() {
  const boton = disparador.value
  if (!boton) return
  const r = boton.getBoundingClientRect()
  const filas = Math.min(Math.max(filtradas.value.length, 1), MAX_VISIBLES)
  const alto = ALTO_BUSCADOR + filas * ALTO_OPCION + 8
  const ancho = Math.max(r.width, 220)

  const abajo = window.innerHeight - r.bottom - MARGEN
  const arriba = r.top - MARGEN
  const haciaArriba = abajo < alto && arriba > abajo

  // Horizontal: se alinea al borde izquierdo; si se sale, al derecho.
  let izquierda = r.left
  if (izquierda + ancho > window.innerWidth - MARGEN) izquierda = r.right - ancho
  izquierda = Math.max(MARGEN, izquierda)

  estiloPanel.value = {
    left: `${izquierda}px`,
    width: `${ancho}px`,
    ...(haciaArriba
      ? { bottom: `${window.innerHeight - r.top + 4}px` }
      : { top: `${r.bottom + 4}px` }),
    maxHeight: `${Math.max(haciaArriba ? arriba : abajo, 160)}px`,
  }
}

async function abrir() {
  if (props.disabled || abierto.value) return
  texto.value = ''
  const indice = props.opciones.findIndex((o) => o.valor === modelo.value)
  activo.value = Math.max(indice, 0)
  abierto.value = true
  posicionar()
  window.addEventListener('scroll', posicionar, true)
  window.addEventListener('resize', posicionar)
  document.addEventListener('pointerdown', alPulsarFuera, true)
  await nextTick()
  buscador.value?.focus()
  asegurarVisible()
}

function cerrar(devolverFoco = true) {
  if (!abierto.value) return
  abierto.value = false
  window.removeEventListener('scroll', posicionar, true)
  window.removeEventListener('resize', posicionar)
  document.removeEventListener('pointerdown', alPulsarFuera, true)
  if (devolverFoco) disparador.value?.focus()
}

function elegir(opcion: OpcionSelect) {
  modelo.value = opcion.valor
  cerrar()
}

function alPulsarFuera(evento: PointerEvent) {
  const destino = evento.target as Node
  if (panel.value?.contains(destino) || disparador.value?.contains(destino)) return
  cerrar(false)
}

function asegurarVisible() {
  void nextTick(() => {
    lista.value
      ?.querySelector<HTMLElement>(`[data-indice="${activo.value}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  })
}

function alTeclearBuscador(evento: KeyboardEvent) {
  const n = filtradas.value.length
  if (evento.key === 'ArrowDown') {
    evento.preventDefault()
    if (n) activo.value = (activo.value + 1) % n
    asegurarVisible()
  } else if (evento.key === 'ArrowUp') {
    evento.preventDefault()
    if (n) activo.value = (activo.value - 1 + n) % n
    asegurarVisible()
  } else if (evento.key === 'Home' || evento.key === 'End') {
    evento.preventDefault()
    activo.value = evento.key === 'Home' ? 0 : Math.max(n - 1, 0)
    asegurarVisible()
  } else if (evento.key === 'Enter') {
    evento.preventDefault()
    const opcion = filtradas.value[activo.value]
    if (opcion) elegir(opcion)
  } else if (evento.key === 'Escape') {
    evento.preventDefault()
    evento.stopPropagation()
    cerrar()
  } else if (evento.key === 'Tab') {
    cerrar(false)
  }
}

function alTeclearDisparador(evento: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(evento.key)) {
    evento.preventDefault()
    void abrir()
  } else if (evento.key.length === 1 && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
    // Escribir sobre el control cerrado abre el buscador con esa letra.
    evento.preventDefault()
    void abrir().then(() => (texto.value = evento.key))
  }
}

watch(texto, () => {
  activo.value = 0
  if (abierto.value) posicionar()
})

onBeforeUnmount(() => cerrar(false))
</script>

<template>
  <div class="relative" :class="$attrs.class as string">
    <button
      :id="id"
      ref="disparador"
      type="button"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="abierto"
      :aria-controls="abierto ? idLista : undefined"
      :aria-label="etiqueta ?? ($attrs['aria-label'] as string | undefined)"
      :aria-invalid="invalido || undefined"
      class="rs-campo flex min-h-[var(--km-toque,2.5rem)] w-full items-center rounded-control border bg-panel py-2 pr-9 pl-3 text-left text-[length:var(--km-texto,0.875rem)] transition-colors duration-200 disabled:bg-panel-2 disabled:text-tenue"
      :class="[
        invalido ? 'border-vino' : abierto ? 'border-verde' : 'border-linea focus:border-verde',
        seleccionada ? 'text-tinta' : 'text-tenue',
      ]"
      @click="abierto ? cerrar() : abrir()"
      @keydown="alTeclearDisparador"
    >
      <span class="truncate">{{ seleccionada?.etiqueta ?? placeholder ?? 'Elegir…' }}</span>
    </button>

    <!-- La flecha va como SVG y no como background-image para heredar el tema. -->
    <svg
      class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-tenue transition-transform"
      :class="abierto ? 'rotate-180' : ''"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
    </svg>

    <Teleport to="body">
      <div
        v-if="abierto"
        ref="panel"
        class="fixed z-[80] flex flex-col overflow-hidden rounded-control border border-linea bg-panel"
        :style="[estiloPanel, { boxShadow: 'var(--rs-sombra-flotante)' }]"
      >
        <div class="border-b border-linea p-2">
          <input
            ref="buscador"
            v-model="texto"
            type="text"
            role="combobox"
            autocomplete="off"
            spellcheck="false"
            aria-autocomplete="list"
            :aria-expanded="true"
            :aria-controls="idLista"
            :aria-activedescendant="filtradas.length ? `${base}-op-${activo}` : undefined"
            :aria-label="`Buscar en ${etiqueta ?? 'la lista'}`"
            placeholder="Buscar…"
            class="rs-sin-anillo h-9 w-full rounded-[6px] border border-linea bg-lienzo px-2.5 text-sm text-tinta outline-none focus:border-verde"
            @keydown="alTeclearBuscador"
          />
        </div>

        <ul
          :id="idLista"
          ref="lista"
          role="listbox"
          class="min-h-0 overflow-y-auto p-1"
          :style="{ maxHeight: `${MAX_VISIBLES * ALTO_OPCION + 8}px` }"
        >
          <li
            v-for="(o, i) in filtradas"
            :id="`${base}-op-${i}`"
            :key="o.valor"
            role="option"
            :data-indice="i"
            :aria-selected="o.valor === modelo"
            class="flex h-9 cursor-pointer items-center gap-2 rounded-[6px] px-2.5 text-sm"
            :class="[
              i === activo ? 'bg-seleccion text-tinta' : 'text-tinta',
              o.valor === modelo ? 'font-semibold' : '',
            ]"
            @pointermove="activo = i"
            @click="elegir(o)"
          >
            <span class="min-w-0 flex-1 truncate" :title="o.etiqueta">{{ o.etiqueta }}</span>
            <svg
              v-if="o.valor === modelo"
              class="size-4 shrink-0 text-verde"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m5 12 5 5 9-10" />
            </svg>
          </li>
          <li v-if="!filtradas.length" class="px-2.5 py-2 text-sm text-tenue">
            Sin resultados para «{{ texto }}»
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
