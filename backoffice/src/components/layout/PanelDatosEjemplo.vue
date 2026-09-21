<script setup lang="ts">
import { ref } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import { reiniciarMock } from '@/services/mock/db'
import { configRed, configRedDefecto, guardarConfigRed } from '@/services/mock/red'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()

const latencia = ref(configRed.latenciaMs)
const tasaError = ref(Math.round(configRed.tasaError * 100))
const confirmarReinicio = ref(false)

const perfiles = [
  { etiqueta: 'Normal', latenciaMs: configRedDefecto.latenciaMs, tasaError: 0 },
  { etiqueta: 'Red lenta', latenciaMs: 1800, tasaError: 0 },
  { etiqueta: 'Inestable', latenciaMs: 700, tasaError: 25 },
]

function aplicar() {
  guardarConfigRed({ latenciaMs: latencia.value, tasaError: tasaError.value / 100 })
}

function usarPerfil(p: (typeof perfiles)[number]) {
  latencia.value = p.latenciaMs
  tasaError.value = p.tasaError
  aplicar()
}

function reiniciar() {
  reiniciarMock()
  confirmarReinicio.value = false
  ui.panelDatosAbierto = false
  // Recarga completa: vistas y stores vuelven a leer la semilla.
  window.location.reload()
}
</script>

<template>
  <KmDrawer
    v-model="ui.panelDatosAbierto"
    titulo="Datos de ejemplo"
    subtitulo="Todo el back office funciona sobre datos simulados en este navegador."
  >
    <div class="flex flex-col gap-8">
      <section class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-semibold text-tinta">Condiciones de red</h3>
          <p class="text-xs text-tenue">
            Prueba cada pantalla con respuestas lentas o fallidas antes de tener servidor.
          </p>
        </div>

        <div class="flex gap-1.5" role="group" aria-label="Perfiles de red">
          <button
            v-for="p in perfiles"
            :key="p.etiqueta"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            :class="
              latencia === p.latenciaMs && tasaError === p.tasaError
                ? 'border-rail bg-rail text-rail-tinta'
                : 'border-linea text-tenue hover:border-verde hover:text-tinta'
            "
            @click="usarPerfil(p)"
          >
            {{ p.etiqueta }}
          </button>
        </div>

        <label class="flex flex-col gap-2">
          <span class="flex justify-between text-sm">
            <span class="font-medium text-tinta">Latencia</span>
            <span class="text-tenue tabular-nums">{{ latencia }} ms</span>
          </span>
          <input
            v-model.number="latencia"
            type="range"
            min="0"
            max="3000"
            step="50"
            class="accent-[var(--rs-laton-500)]"
            @change="aplicar"
          />
        </label>

        <label class="flex flex-col gap-2">
          <span class="flex justify-between text-sm">
            <span class="font-medium text-tinta">Llamadas que fallan</span>
            <span class="text-tenue tabular-nums">{{ tasaError }} %</span>
          </span>
          <input
            v-model.number="tasaError"
            type="range"
            min="0"
            max="100"
            step="5"
            class="accent-[var(--rs-laton-500)]"
            @change="aplicar"
          />
        </label>
      </section>

      <section class="flex flex-col gap-3 rounded-card border border-linea bg-panel-2 p-4">
        <div>
          <h3 class="text-sm font-semibold text-tinta">Consola de Karma</h3>
          <p class="text-xs text-tenue">
            Modo de integración con el ERP por capacidad y local. En producción la usa solo el
            equipo de Karma.
          </p>
        </div>
        <div>
          <RouterLink
            :to="{ name: 'karma-integracion' }"
            class="text-sm font-medium text-verde underline"
            @click="ui.panelDatosAbierto = false"
          >
            Abrir consola de integración
          </RouterLink>
        </div>
      </section>

      <section class="flex flex-col gap-3 rounded-card border border-linea bg-panel-2 p-4">
        <div>
          <h3 class="text-sm font-semibold text-tinta">Volver a la semilla</h3>
          <p class="text-xs text-tenue">
            Borra los cambios hechos en este navegador y restaura locales, salones, mesas, carta,
            inventario y usuarios de ejemplo.
          </p>
        </div>
        <div>
          <KmButton variante="secundario" tamano="sm" @click="confirmarReinicio = true">
            Reiniciar datos
          </KmButton>
        </div>
      </section>
    </div>

    <KmConfirm
      v-model="confirmarReinicio"
      titulo="Reiniciar datos de ejemplo"
      mensaje="Se perderán todos los cambios hechos en este navegador y la página se recargará."
      texto-confirmar="Reiniciar"
      peligroso
      @confirmar="reiniciar"
    />
  </KmDrawer>
</template>
