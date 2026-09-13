import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type TipoToast = 'exito' | 'error' | 'info'
export type Tema = 'claro' | 'oscuro'

export interface Toast {
  id: number
  tipo: TipoToast
  mensaje: string
}

const CLAVE_TEMA = 'km.restaurante.tema'

let contador = 0

function temaInicial(): Tema {
  const guardado = localStorage.getItem(CLAVE_TEMA)
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  // Sin preferencia guardada se respeta la del sistema operativo.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])
  /**
   * Menú contextual del módulo: 325px abierto, 0px cerrado.
   * Arranca plegado en pantallas estrechas, donde se superpone al contenido.
   */
  const menuAbierto = ref(window.innerWidth >= 1024)
  const tema = ref<Tema>(temaInicial())
  /** Paleta de búsqueda global (Ctrl+K). */
  const buscadorAbierto = ref(false)
  /** Panel para ajustar y reiniciar los datos de ejemplo. */
  const panelDatosAbierto = ref(false)

  // La guía exige persistir la preferencia de tema entre sesiones.
  watch(
    tema,
    (valor) => {
      document.documentElement.setAttribute('data-theme', valor === 'oscuro' ? 'dark' : 'light')
      localStorage.setItem(CLAVE_TEMA, valor)
    },
    { immediate: true },
  )

  function alternarTema() {
    tema.value = tema.value === 'oscuro' ? 'claro' : 'oscuro'
  }

  function notificar(mensaje: string, tipo: TipoToast = 'info', ms = 3500) {
    const id = ++contador
    toasts.value.push({ id, tipo, mensaje })
    setTimeout(() => cerrarToast(id), ms)
  }

  const exito = (mensaje: string) => notificar(mensaje, 'exito')
  const error = (mensaje: string) => notificar(mensaje, 'error', 5000)

  function cerrarToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function alternarMenu() {
    menuAbierto.value = !menuAbierto.value
  }

  return {
    toasts,
    menuAbierto,
    tema,
    buscadorAbierto,
    panelDatosAbierto,
    notificar,
    exito,
    error,
    cerrarToast,
    alternarMenu,
    alternarTema,
  }
})
