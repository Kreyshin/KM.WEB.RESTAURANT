import { computed, onMounted, shallowRef } from 'vue'
import { localesService } from '@/services/locales.service'
import type { Local } from '@/types'
import type { OpcionSelect } from '@/types/ui'

/** Todos los locales (activos e inactivos) para selects y para mostrar nombres en tablas. */
export function useLocales() {
  const locales = shallowRef<Local[]>([])

  onMounted(async () => {
    locales.value = (await localesService.todos()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  })

  const opciones = computed<OpcionSelect[]>(() =>
    locales.value.map((l) => ({
      valor: l.id,
      etiqueta: l.activo ? l.nombre : `${l.nombre} (inactivo)`,
    })),
  )

  const nombreLocal = (id: string) => locales.value.find((l) => l.id === id)?.nombre ?? '—'

  return { locales, opciones, nombreLocal }
}
