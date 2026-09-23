import { reactive, ref, shallowRef, watch } from 'vue'
import type { ApiError, Consulta, Orden, Paginado } from '@/types'

export interface OpcionesListado {
  porPagina?: number
  orden?: Orden
  filtros?: Consulta['filtros']
  /** Espera tras teclear antes de buscar, en ms. */
  esperaBusqueda?: number
}

/**
 * Estado completo de una tabla paginada: consulta, datos, carga y error.
 *
 * La vista solo enlaza `consulta` con sus controles y pinta `items`; cualquier
 * cambio de búsqueda, filtro u orden vuelve a la página 1 y recarga.
 */
export function useListado<T>(
  cargador: (consulta: Consulta) => Promise<Paginado<T>>,
  opciones: OpcionesListado = {},
) {
  const consulta = reactive<Required<Pick<Consulta, 'pagina' | 'porPagina'>> & Consulta>({
    buscar: '',
    pagina: 1,
    porPagina: opciones.porPagina ?? 10,
    orden: opciones.orden,
    filtros: { ...opciones.filtros },
  })

  const items = shallowRef<T[]>([])
  const total = ref(0)
  const cargando = ref(true)
  const error = ref<string | null>(null)

  // Evita que una respuesta lenta pise a una más reciente.
  let peticion = 0

  async function cargar() {
    const actual = ++peticion
    cargando.value = true
    error.value = null
    try {
      // Copia plana: structuredClone no admite los proxies reactivos.
      const r = await cargador(JSON.parse(JSON.stringify(consulta)) as Consulta)
      if (actual !== peticion) return
      items.value = r.items
      total.value = r.total
      consulta.pagina = r.pagina
    } catch (e) {
      if (actual !== peticion) return
      error.value = (e as ApiError).mensaje ?? 'No se pudieron cargar los datos.'
    } finally {
      if (actual === peticion) cargando.value = false
    }
  }

  let temporizador: ReturnType<typeof setTimeout> | undefined
  watch(
    () => consulta.buscar,
    () => {
      clearTimeout(temporizador)
      temporizador = setTimeout(() => {
        consulta.pagina = 1
        cargar()
      }, opciones.esperaBusqueda ?? 250)
    },
  )

  watch(
    () => [consulta.orden?.campo, consulta.orden?.direccion, JSON.stringify(consulta.filtros)],
    () => {
      consulta.pagina = 1
      cargar()
    },
  )

  watch(() => [consulta.pagina, consulta.porPagina], cargar)

  cargar()

  return { consulta, items, total, cargando, error, recargar: cargar }
}
