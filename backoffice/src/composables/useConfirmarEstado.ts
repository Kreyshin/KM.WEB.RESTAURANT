import { ref } from 'vue'

interface Solicitud {
  nombre: string
  activar: boolean
  /** Frases que explican el efecto; normalmente de `dependenciasService`. */
  consecuencias: () => Promise<string[]>
  /** Lo que se ejecuta si la persona confirma. */
  continuar: () => Promise<void>
}

/**
 * Pausa un guardado que cambia el estado de un registro hasta que se confirme.
 * Se usa junto a `KmConfirmarEstado`:
 *
 *   const estado = useConfirmarEstado()
 *   if (cambiaEstado) return estado.pedir({ nombre, activar, consecuencias, continuar })
 *
 *   <KmConfirmarEstado v-model="estado.abierto.value" ... @confirmar="estado.confirmar" />
 */
export function useConfirmarEstado() {
  const abierto = ref(false)
  const nombre = ref('')
  const activar = ref(false)
  const consecuencias = ref<string[]>([])
  const cargando = ref(false)
  let continuar: (() => Promise<void>) | null = null

  async function pedir(solicitud: Solicitud) {
    nombre.value = solicitud.nombre
    activar.value = solicitud.activar
    continuar = solicitud.continuar
    try {
      consecuencias.value = await solicitud.consecuencias()
    } catch {
      consecuencias.value = []
    }
    abierto.value = true
  }

  async function confirmar() {
    if (!continuar) return
    cargando.value = true
    try {
      await continuar()
    } finally {
      cargando.value = false
      abierto.value = false
      continuar = null
    }
  }

  return { abierto, nombre, activar, consecuencias, cargando, pedir, confirmar }
}
