<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { cadenasService } from '@/services/cadenas.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Cadena } from '@/types'
import PanelParametros from './PanelParametros.vue'

/**
 * Cadenas (D-008): agrupan locales por concepto de negocio para configurarlos
 * juntos. Son opcionales: sin cadenas, cada local hereda directo de la empresa.
 */

const ui = useUiStore()
const { locales, recargar } = useCatalogos(['locales'])
const cadenas = shallowRef<Cadena[]>([])
const seleccionada = ref<string | null>(null)

async function cargar() {
  const [lista] = await Promise.all([cadenasService.todos(), recargar()])
  cadenas.value = lista
  if (!lista.some((c) => c.id === seleccionada.value)) seleccionada.value = lista[0]?.id ?? null
}
onMounted(cargar)

const cadena = computed(() => cadenas.value.find((c) => c.id === seleccionada.value))
const nombreLocal = (id: string) => locales.value.find((l) => l.id === id)?.nombre ?? id
const sinCadena = computed(() =>
  locales.value.filter((l) => !cadenas.value.some((c) => c.localIds.includes(l.id))),
)

// Editor
const abierto = ref(false)
const editando = shallowRef<Cadena | null>(null)
const nombre = ref('')
const localIds = ref<string[]>([])
const guardando = ref(false)

function abrir(c?: Cadena) {
  editando.value = c ?? null
  nombre.value = c?.nombre ?? ''
  localIds.value = [...(c?.localIds ?? [])]
  abierto.value = true
}

const enOtra = (localId: string) =>
  cadenas.value.find((c) => c.id !== editando.value?.id && c.localIds.includes(localId))

function alternar(localId: string, marcado: boolean) {
  localIds.value = marcado
    ? [...localIds.value, localId]
    : localIds.value.filter((x) => x !== localId)
}

async function guardar() {
  guardando.value = true
  try {
    const datos = { nombre: nombre.value, localIds: localIds.value, activo: true }
    const c = editando.value
      ? await cadenasService.actualizar(editando.value.id, datos)
      : await cadenasService.crear(datos)
    ui.exito(`Cadena «${c.nombre}» guardada.`)
    abierto.value = false
    seleccionada.value = c.id
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar la cadena.')
  } finally {
    guardando.value = false
  }
}

const confirmar = ref(false)
async function eliminar() {
  if (!cadena.value) return
  try {
    await cadenasService.eliminar(cadena.value.id)
    ui.exito(`Cadena «${cadena.value.nombre}» eliminada: sus locales heredan de la empresa.`)
    confirmar.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <div class="grid gap-6 md:grid-cols-[16rem_1fr]">
      <nav
        aria-label="Cadenas"
        class="flex flex-col gap-1 self-start rounded-card border border-linea bg-panel p-2"
      >
        <div class="flex items-center justify-between gap-2 px-2 py-1.5">
          <p class="rs-etiqueta text-tenue">Cadenas · {{ cadenas.length }}</p>
          <KmButton tamano="sm" variante="fantasma" @click="abrir()">Nueva</KmButton>
        </div>
        <button
          v-for="c in cadenas"
          :key="c.id"
          type="button"
          class="flex flex-col rounded-control px-3 py-2 text-left transition-colors"
          :class="
            seleccionada === c.id ? 'bg-seleccion text-tinta' : 'text-tenue hover:bg-seleccion/60'
          "
          :aria-current="seleccionada === c.id ? 'true' : undefined"
          @click="seleccionada = c.id"
        >
          <span class="text-sm font-semibold">{{ c.nombre }}</span>
          <span class="text-xs">{{ c.localIds.map(nombreLocal).join(', ') || 'Sin locales' }}</span>
        </button>
        <p v-if="sinCadena.length" class="px-3 py-2 text-xs text-tenue">
          Sin cadena (heredan de la empresa): {{ sinCadena.map((l) => l.nombre).join(', ') }}
        </p>
      </nav>

      <KmCard
        v-if="cadena"
        :titulo="`Configuración de ${cadena.nombre}`"
        subtitulo="Vale para todos sus locales. Cada local puede cambiar lo que haga distinto."
      >
        <template #acciones>
          <KmButton tamano="sm" variante="secundario" @click="abrir(cadena)">Editar</KmButton>
          <KmButton tamano="sm" variante="fantasma" class="text-vino" @click="confirmar = true">
            Eliminar
          </KmButton>
        </template>
        <PanelParametros alcance="local" :cadena-id="cadena.id" />
      </KmCard>
      <KmCard v-else titulo="Sin cadenas">
        <p class="max-w-2xl text-sm text-tenue">
          Las cadenas son opcionales. Sirven cuando tienes varios locales de conceptos distintos
          —cevicherías y hamburgueserías— y quieres configurar cada concepto una sola vez. Con uno o
          pocos locales, configura la empresa y cada local.
        </p>
        <KmButton class="mt-4" @click="abrir()">Crear la primera cadena</KmButton>
      </KmCard>
    </div>

    <KmDrawer v-model="abierto" :titulo="editando ? `Editar ${editando.nombre}` : 'Nueva cadena'">
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Nombre" requerido>
          <KmInput :id="id" v-model="nombre" placeholder="Cevicherías, Hamburgueserías" />
        </KmField>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Locales</p>
          <KmCheckbox
            v-for="l in locales"
            :key="l.id"
            :model-value="localIds.includes(l.id)"
            :disabled="!!enOtra(l.id)"
            :ayuda="enOtra(l.id) ? `Ya está en «${enOtra(l.id)!.nombre}»` : undefined"
            @update:model-value="alternar(l.id, $event)"
          >
            {{ l.nombre }}
          </KmCheckbox>
        </div>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar</KmButton>
      </template>
    </KmDrawer>

    <KmConfirm
      v-model="confirmar"
      titulo="¿Eliminar la cadena?"
      :mensaje="`Sus locales pasarán a heredar de la empresa y se perderán los valores propios de «${cadena?.nombre ?? ''}».`"
      texto-confirmar="Eliminar"
      peligroso
      @confirmar="eliminar"
    />
  </div>
</template>
