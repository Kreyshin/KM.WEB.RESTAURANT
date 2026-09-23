<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PerfilUsuario from './PerfilUsuario.vue'
import { modulos, moduloDeRuta } from './navegacion'
import MarcaMesa from '@/components/marca/MarcaMesa.vue'
import { marca } from '@/config/marca'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()

/** Un módulo se oculta si el rol no puede ver ninguna de sus secciones. */
const modulosVisibles = computed(() =>
  modulos.filter((m) => m.secciones.some((s) => auth.puede(s.roles))),
)

const moduloActivo = computed(() => moduloDeRuta(route.name))

/**
 * Pulsar un módulo abre su menú de secciones para elegir adónde ir; no navega
 * por sí solo. Volver a pulsar el mismo módulo con el menú abierto lo cierra.
 */
function abrirModulo(id: string) {
  const modulo = modulos.find((m) => m.id === id)
  if (!modulo?.secciones.some((s) => auth.puede(s.roles))) return

  if (ui.menuAbierto && ui.moduloMenu?.id === id) {
    ui.menuAbierto = false
    return
  }
  ui.moduloMenu = modulo
  ui.menuAbierto = true
}
</script>

<template>
  <!--
    Carbón profundo en los dos temas: es el ancla de la identidad y no debe
    depender de la preferencia de tema del usuario.
  -->
  <nav
    class="flex w-[var(--rs-rail-ancho)] shrink-0 flex-col items-center bg-rail py-5"
    aria-label="Módulos del sistema"
  >
    <RouterLink
      :to="{ name: 'dashboard' }"
      class="flex flex-col items-center gap-2 rounded-card p-1"
      :title="marca.nombre"
    >
      <MarcaMesa :tamano="40" />
      <span class="rs-display text-[15px] leading-none font-semibold text-rail-tinta">
        {{ marca.nombre }}
      </span>
    </RouterLink>

    <div class="rs-filete mt-4 w-12 shrink-0" role="presentation" />

    <ul class="mt-5 flex w-full flex-1 flex-col items-center gap-1.5 px-2">
      <li v-for="modulo in modulosVisibles" :key="modulo.id" class="w-full">
        <button
          type="button"
          class="relative flex w-full flex-col items-center gap-1.5 rounded-control px-1 py-3 transition-colors duration-200"
          :class="
            moduloActivo?.id === modulo.id
              ? 'bg-white/10 text-rail-tinta'
              : 'text-rail-tenue hover:bg-white/5 hover:text-rail-tinta'
          "
          :aria-current="moduloActivo?.id === modulo.id ? 'true' : undefined"
          @click="abrirModulo(modulo.id)"
        >
          <!-- Marca del módulo activo: filete naranja, forma además de color. -->
          <span
            v-if="moduloActivo?.id === modulo.id"
            class="absolute top-1/2 left-0 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-laton"
            aria-hidden="true"
          />
          <svg
            class="size-[22px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="modulo.icono" />
          </svg>
          <span class="text-[11px] leading-none font-medium">{{ modulo.etiqueta }}</span>
        </button>
      </li>
    </ul>

    <PerfilUsuario />
  </nav>
</template>
