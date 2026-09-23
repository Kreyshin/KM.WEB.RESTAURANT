<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { EstadoMesa, Mesa } from '@/types'
import {
  clasePlanoEstado,
  estadosMesa,
  etiquetaEstado,
  formaPlano,
  glifoEstado,
} from '@/utils/mesas'

const props = defineProps<{
  mesas: Mesa[]
  /** Solo el administrador mueve, edita, une o elimina mesas. */
  editable: boolean
  /** Modo juntar: el clic marca mesas y no se arrastra. */
  seleccionando?: boolean
  seleccionadas?: string[]
}>()

const emit = defineEmits<{
  mover: [id: string, posX: number, posY: number]
  abrir: [mesa: Mesa]
  marcar: [mesa: Mesa]
  estado: [mesa: Mesa, estado: EstadoMesa]
  juntar: [mesa: Mesa]
  separar: [grupoId: string]
  eliminar: [mesa: Mesa]
}>()

const lienzo = ref<HTMLElement | null>(null)

/** Tamaño de la retícula del mantel: al soltar, la mesa se alinea a ella. */
const CELDA = 36
/** Píxeles que hay que mover el puntero para que un clic pase a ser arrastre. */
const UMBRAL = 5

// ── Arrastre ──
interface Arrastre {
  mesa: Mesa
  pointerId: number
  inicioX: number
  inicioY: number
  /** Distancia entre el puntero y la esquina de la mesa, para que no «salte». */
  offsetX: number
  offsetY: number
  ancho: number
  alto: number
  moviendo: boolean
  left: number
  top: number
}

const arrastre = ref<Arrastre | null>(null)

function posicionDe(mesa: Mesa) {
  const a = arrastre.value
  if (a?.moviendo && a.mesa.id === mesa.id) return { left: `${a.left}px`, top: `${a.top}px` }
  return { left: `${mesa.posX}%`, top: `${mesa.posY}%` }
}

function alPresionar(mesa: Mesa, evento: PointerEvent) {
  // Solo botón principal: el derecho abre el menú y no debe arrastrar.
  if (evento.button !== 0 || !lienzo.value) return
  cerrarMenu()
  if (props.seleccionando || !props.editable) return

  const boton = evento.currentTarget as HTMLElement
  const caja = boton.getBoundingClientRect()
  const plano = lienzo.value.getBoundingClientRect()
  boton.setPointerCapture(evento.pointerId)
  arrastre.value = {
    mesa,
    pointerId: evento.pointerId,
    inicioX: evento.clientX,
    inicioY: evento.clientY,
    offsetX: evento.clientX - caja.left,
    offsetY: evento.clientY - caja.top,
    ancho: caja.width,
    alto: caja.height,
    moviendo: false,
    left: caja.left - plano.left,
    top: caja.top - plano.top,
  }
}

function alMover(evento: PointerEvent) {
  const a = arrastre.value
  if (!a || a.pointerId !== evento.pointerId || !lienzo.value) return
  if (!a.moviendo && Math.hypot(evento.clientX - a.inicioX, evento.clientY - a.inicioY) < UMBRAL) {
    return
  }
  a.moviendo = true
  const plano = lienzo.value.getBoundingClientRect()
  // La mesa entera queda siempre dentro del plano.
  a.left = Math.min(Math.max(0, evento.clientX - plano.left - a.offsetX), plano.width - a.ancho)
  a.top = Math.min(Math.max(0, evento.clientY - plano.top - a.offsetY), plano.height - a.alto)
}

function alSoltar(mesa: Mesa, evento: PointerEvent) {
  const a = arrastre.value
  if (!a || a.pointerId !== evento.pointerId) return
  arrastre.value = null
  if (!a.moviendo || !lienzo.value) return

  const plano = lienzo.value.getBoundingClientRect()
  const left = Math.min(Math.round(a.left / CELDA) * CELDA, plano.width - a.ancho)
  const top = Math.min(Math.round(a.top / CELDA) * CELDA, plano.height - a.alto)
  const x = Math.round((left / plano.width) * 1000) / 10
  const y = Math.round((top / plano.height) * 1000) / 10
  if (x !== mesa.posX || y !== mesa.posY) emit('mover', mesa.id, x, y)
}

/** El clic abre la mesa; en modo juntar, la marca. Un arrastre no cuenta como clic. */
function alHacerClic(mesa: Mesa) {
  if (props.seleccionando) emit('marcar', mesa)
  else emit('abrir', mesa)
}

// Tras un arrastre el navegador dispara también «click»: se descarta.
let ignorarClic = false
function alSoltarCaptura(mesa: Mesa, evento: PointerEvent) {
  ignorarClic = !!arrastre.value?.moviendo
  alSoltar(mesa, evento)
}
function clic(mesa: Mesa) {
  if (ignorarClic) {
    ignorarClic = false
    return
  }
  alHacerClic(mesa)
}

// ── Mover con teclado (accesibilidad) ──
function alTeclear(mesa: Mesa, evento: KeyboardEvent) {
  if (evento.key === 'ContextMenu' || (evento.shiftKey && evento.key === 'F10')) {
    evento.preventDefault()
    const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect()
    abrirMenu(mesa, caja.right, caja.top)
    return
  }
  if (!props.editable || props.seleccionando || !lienzo.value) return
  const paso: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }
  const d = paso[evento.key]
  if (!d) return
  evento.preventDefault()
  const plano = lienzo.value.getBoundingClientRect()
  const dx = (CELDA / plano.width) * 100
  const dy = (CELDA / plano.height) * 100
  const x = Math.round(Math.min(95, Math.max(0, mesa.posX + d[0] * dx)) * 10) / 10
  const y = Math.round(Math.min(90, Math.max(0, mesa.posY + d[1] * dy)) * 10) / 10
  emit('mover', mesa.id, x, y)
}

// ── Menú contextual ──
const menu = ref<{ mesa: Mesa; x: number; y: number } | null>(null)
const menuEl = ref<HTMLElement | null>(null)
/** El scroll que provoca abrir el menú (enfocar, llevar a la vista) no debe cerrarlo. */
let abiertoEn = 0

async function abrirMenu(mesa: Mesa, x: number, y: number) {
  if (props.seleccionando) return
  abiertoEn = performance.now()
  menu.value = { mesa, x, y }
  await nextTick()
  // Se recoloca si se sale de la ventana y se enfoca la primera opción.
  const el = menuEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  menu.value = {
    mesa,
    x: Math.min(x, window.innerWidth - r.width - 8),
    y: Math.min(y, window.innerHeight - r.height - 8),
  }
  el.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({ preventScroll: true })
}

function alMenuContextual(mesa: Mesa, evento: MouseEvent) {
  // Dentro del plano se sustituye el menú del navegador por el de la mesa.
  evento.preventDefault()
  abrirMenu(mesa, evento.clientX, evento.clientY)
}

function cerrarMenu() {
  menu.value = null
}

function elegir(accion: () => void) {
  accion()
  cerrarMenu()
}

function alTeclearMenu(evento: KeyboardEvent) {
  const botones = [
    ...(menuEl.value?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []),
  ]
  const i = botones.indexOf(document.activeElement as HTMLButtonElement)
  if (evento.key === 'Escape') {
    evento.preventDefault()
    cerrarMenu()
  } else if (evento.key === 'ArrowDown') {
    evento.preventDefault()
    botones[(i + 1) % botones.length]?.focus()
  } else if (evento.key === 'ArrowUp') {
    evento.preventDefault()
    botones[(i - 1 + botones.length) % botones.length]?.focus()
  }
}

/** Solo un desplazamiento real del contenido cierra el menú (no el del propio menú). */
function alDesplazar(evento: Event) {
  if (performance.now() - abiertoEn < 300) return
  if (menu.value && !menuEl.value?.contains(evento.target as Node)) cerrarMenu()
}

function alClicFuera(evento: MouseEvent) {
  if (menu.value && !menuEl.value?.contains(evento.target as Node)) cerrarMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', alClicFuera)
  window.addEventListener('scroll', alDesplazar, true)
  window.addEventListener('resize', cerrarMenu)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', alClicFuera)
  window.removeEventListener('scroll', alDesplazar, true)
  window.removeEventListener('resize', cerrarMenu)
})

/** Color estable por unión, para reconocer qué mesas van juntas. */
const coloresGrupo = ['#c9a227', '#3a6076', '#8f2b2b', '#46a583']
function colorGrupo(grupoId?: string) {
  if (!grupoId) return undefined
  const grupos = [...new Set(props.mesas.map((m) => m.grupoId).filter(Boolean))]
  return coloresGrupo[grupos.indexOf(grupoId) % coloresGrupo.length]
}

const itemMenu =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tinta hover:bg-seleccion focus-visible:bg-seleccion focus-visible:shadow-none disabled:opacity-40'
</script>

<template>
  <div
    ref="lienzo"
    class="rs-mantel relative h-[30rem] w-full overflow-hidden rounded-card border border-linea bg-panel-2"
    @contextmenu.prevent
  >
    <p
      v-if="mesas.length === 0"
      class="absolute inset-0 grid place-items-center text-sm text-tenue"
    >
      Este salón todavía no tiene mesas.
    </p>

    <button
      v-for="mesa in mesas"
      :key="mesa.id"
      type="button"
      class="rs-tono absolute flex touch-none flex-col items-center justify-center border-2 select-none focus-visible:z-10"
      :class="[
        formaPlano[mesa.forma],
        clasePlanoEstado[mesa.estado],
        seleccionando
          ? 'cursor-pointer'
          : editable
            ? 'cursor-grab hover:shadow-md'
            : 'cursor-pointer hover:shadow-md',
        arrastre?.moviendo && arrastre.mesa.id === mesa.id
          ? 'z-20 cursor-grabbing shadow-xl'
          : 'transition-[left,top,box-shadow] duration-200',
        seleccionadas?.includes(mesa.id)
          ? 'ring-4 ring-laton ring-offset-2 ring-offset-panel-2'
          : '',
      ]"
      :style="{
        ...posicionDe(mesa),
        ...(mesa.grupoId
          ? { outline: `3px dashed ${colorGrupo(mesa.grupoId)}`, outlineOffset: '4px' }
          : {}),
      }"
      :aria-pressed="seleccionando ? seleccionadas?.includes(mesa.id) : undefined"
      :aria-label="`Mesa ${mesa.codigo}, ${mesa.capacidad} personas, ${etiquetaEstado[mesa.estado]}${mesa.grupoId ? ', unida' : ''}`"
      aria-haspopup="menu"
      @pointerdown="alPresionar(mesa, $event)"
      @pointermove="alMover"
      @pointerup="alSoltarCaptura(mesa, $event)"
      @pointercancel="arrastre = null"
      @click="clic(mesa)"
      @contextmenu.prevent.stop="alMenuContextual(mesa, $event)"
      @keydown="alTeclear(mesa, $event)"
    >
      <span class="text-[13px] leading-none font-bold" aria-hidden="true">
        {{ glifoEstado[mesa.estado] }}
      </span>
      <span class="mt-1 text-xs leading-none font-bold" aria-hidden="true">{{ mesa.codigo }}</span>
      <span class="mt-0.5 text-[10px] leading-none opacity-80" aria-hidden="true">
        {{ mesa.capacidad }}p
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="menu"
        ref="menuEl"
        role="menu"
        :aria-label="`Opciones de la mesa ${menu.mesa.codigo}`"
        class="rs-entrada fixed z-[60] w-56 overflow-hidden rounded-control border border-linea bg-panel py-1"
        style="box-shadow: var(--rs-sombra-flotante)"
        :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
        @keydown="alTeclearMenu"
        @contextmenu.prevent
      >
        <p class="rs-etiqueta px-3 pt-1.5 pb-1 text-tenue">
          Mesa {{ menu.mesa.codigo }} · {{ menu.mesa.capacidad }} personas
        </p>

        <button
          v-if="editable"
          type="button"
          role="menuitem"
          :class="itemMenu"
          @click="elegir(() => emit('abrir', menu!.mesa))"
        >
          Editar mesa
        </button>

        <div class="my-1 border-t border-linea" role="separator" />
        <p class="rs-etiqueta px-3 pt-1 pb-0.5 text-tenue">Cambiar estado</p>
        <button
          v-for="e in estadosMesa"
          :key="e"
          type="button"
          role="menuitemradio"
          :aria-checked="menu.mesa.estado === e"
          :class="itemMenu"
          @click="elegir(() => emit('estado', menu!.mesa, e))"
        >
          <span class="w-4 text-center" aria-hidden="true">{{ glifoEstado[e] }}</span>
          {{ etiquetaEstado[e] }}
          <span v-if="menu.mesa.estado === e" class="ml-auto text-xs text-laton-texto">Actual</span>
        </button>

        <template v-if="editable">
          <div class="my-1 border-t border-linea" role="separator" />
          <button
            v-if="!menu.mesa.grupoId"
            type="button"
            role="menuitem"
            :class="itemMenu"
            :disabled="menu.mesa.estado === 'inactiva'"
            @click="elegir(() => emit('juntar', menu!.mesa))"
          >
            Juntar con otras mesas…
          </button>
          <button
            v-else
            type="button"
            role="menuitem"
            :class="itemMenu"
            @click="elegir(() => emit('separar', menu!.mesa.grupoId!))"
          >
            Separar mesas juntadas
          </button>
          <button
            type="button"
            role="menuitem"
            :class="[itemMenu, 'text-vino']"
            @click="elegir(() => emit('eliminar', menu!.mesa))"
          >
            Eliminar mesa
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Mantel: retícula tenue ligada al borde del tema activo; mide lo mismo que CELDA. */
.rs-mantel {
  background-image:
    linear-gradient(to right, var(--rs-border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--rs-border) 1px, transparent 1px);
  background-size: 36px 36px;
}
</style>
