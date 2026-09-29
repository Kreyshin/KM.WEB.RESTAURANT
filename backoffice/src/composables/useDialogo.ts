import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * Comportamiento compartido de modales y paneles (F10).
 *
 * Un diálogo no es solo una caja encima: mientras está abierto, el teclado le
 * pertenece. Aquí se cierra con Escape, el foco entra al abrirlo, no se escapa
 * al fondo con Tab y vuelve a donde estaba cuando se cierra. Sin esto, quien
 * navega con teclado se pierde detrás del velo y no sabe volver.
 */

const FOCUSABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * @param panel Elemento del diálogo, obtenido con `useTemplateRef` en el
 * componente: es el que atrapa el foco.
 */
export function useDialogo(
  abierto: Ref<boolean>,
  cerrar: () => void,
  panel: Readonly<Ref<HTMLElement | null>>,
) {
  let devolverFocoA: HTMLElement | null = null

  const enfocables = () =>
    [...(panel.value?.querySelectorAll<HTMLElement>(FOCUSABLES) ?? [])].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )

  function alPresionarTecla(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cerrar()
      return
    }
    if (e.key !== 'Tab' || !panel.value) return

    const lista = enfocables()
    if (!lista.length) {
      // Sin nada que enfocar, el foco se queda en el panel en vez de irse al fondo.
      e.preventDefault()
      panel.value.focus()
      return
    }
    const primero = lista[0]!
    const ultimo = lista[lista.length - 1]!
    const activo = document.activeElement as HTMLElement | null

    if (e.shiftKey && (activo === primero || activo === panel.value)) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault()
      primero.focus()
    } else if (activo && !panel.value.contains(activo)) {
      e.preventDefault()
      primero.focus()
    }
  }

  function soltar() {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', alPresionarTecla)
  }

  watch(abierto, async (esta) => {
    if (esta) {
      devolverFocoA = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', alPresionarTecla)
      // El panel no está en el DOM todavía, y con transición de entrada tarda
      // un poco más. Se espera con temporizadores, no con fotogramas: en una
      // pestaña de fondo `requestAnimationFrame` no corre y el foco no entraría.
      await nextTick()
      for (let intento = 0; intento < 10 && !enfocables().length; intento++)
        await new Promise((listo) => setTimeout(listo, 16))
      if (!abierto.value) return
      const lista = enfocables()
      ;(lista[0] ?? panel.value)?.focus()
    } else {
      soltar()
      // Volver al botón que lo abrió: seguir la conversación donde se dejó.
      devolverFocoA?.focus?.()
      devolverFocoA = null
    }
  })

  onBeforeUnmount(soltar)
}
