import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Local } from '@/types'
import { localesService } from '@/services/locales.service'
import { useAuthStore } from './auth.store'

const CLAVE = 'km.restaurante.local'

/**
 * Local sobre el que trabaja el back office.
 * Las pantallas que dependan del local leerán `localId` y recargarán al cambiar.
 */
export const useLocalStore = defineStore('local', () => {
  const locales = ref<Local[]>([])
  const localId = ref<string | null>(localStorage.getItem(CLAVE))

  const local = computed(() => locales.value.find((l) => l.id === localId.value) ?? null)

  watch(localId, (id) => {
    if (id) localStorage.setItem(CLAVE, id)
    else localStorage.removeItem(CLAVE)
  })

  async function cargar() {
    // Solo los locales a los que el usuario tiene acceso según el ERP.
    const acceso = useAuthStore().usuario?.localIds
    const activos = await localesService.listarActivos()
    locales.value = acceso ? activos.filter((l) => acceso.includes(l.id)) : activos
    // Si el local guardado ya no existe o se desactivó, se toma el primero.
    if (!local.value) localId.value = locales.value[0]?.id ?? null
  }

  function seleccionar(id: string) {
    localId.value = id
  }

  return { locales, localId, local, cargar, seleccionar }
})
