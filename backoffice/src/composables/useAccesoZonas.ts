import { computed, type Ref } from 'vue'
import { nivelZona } from '@/services/accesos.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import type { NivelAcceso, Zona } from '@/types'

/**
 * Zonas que el usuario puede ver en el local activo.
 *
 * La zona tiene que ser del local elegido en la cabecera y el usuario debe
 * tener acceso: el ERP lo da sobre el almacén y la vertical puede recortarlo
 * por zona (D-009).
 */
export function useAccesoZonas(zonas: Ref<Zona[]>) {
  const auth = useAuthStore()
  const localStore = useLocalStore()

  const nivel = (zonaId: string): NivelAcceso | null => nivelZona(auth.usuario?.id, zonaId)

  const delLocal = computed(() =>
    zonas.value.filter(
      (a) => a.activo && (!localStore.localId || a.localId === localStore.localId),
    ),
  )

  /** Del local activo y con acceso al menos de consulta. */
  const permitidos = computed(() => delLocal.value.filter((a) => nivel(a.id) !== null))

  /** Zonas del local que existen pero el usuario no puede ver. */
  const ocultos = computed(() => delLocal.value.length - permitidos.value.length)

  const puedeVer = (zonaId: string) => permitidos.value.some((a) => a.id === zonaId)
  const puedeGestionar = (zonaId: string) => puedeVer(zonaId) && nivel(zonaId) === 'gestionar'

  return { permitidos, ocultos, nivel, puedeVer, puedeGestionar }
}
