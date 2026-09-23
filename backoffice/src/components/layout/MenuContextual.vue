<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { moduloDeRuta } from './navegacion'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()

/**
 * El módulo que se muestra es el que el usuario abrió en la barra principal;
 * si no abrió ninguno, el de la ruta actual.
 */
const modulo = computed(() => ui.moduloMenu ?? moduloDeRuta(route.name))
const secciones = computed(() => modulo.value?.secciones.filter((s) => auth.puede(s.roles)) ?? [])

/**
 * El menú de secciones es un panel flotante en todas las resoluciones: sirve
 * para elegir adónde ir y se retira al llegar, dejando todo el ancho al trabajo.
 */
function cerrar() {
  ui.menuAbierto = false
}

watch(() => route.fullPath, cerrar)

function alTeclear(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && ui.menuAbierto) cerrar()
}
onMounted(() => window.addEventListener('keydown', alTeclear))
onBeforeUnmount(() => window.removeEventListener('keydown', alTeclear))
</script>

<template>
  <!-- Velo sobre el área de trabajo; la barra principal sigue visible y accesible. -->
  <div
    v-if="ui.menuAbierto"
    class="absolute inset-y-0 right-0 left-[var(--rs-rail-ancho)] z-20 bg-verde-900/35"
    @click="cerrar"
  />

  <aside
    class="absolute inset-y-0 left-[var(--rs-rail-ancho)] z-30 flex shrink-0 flex-col overflow-hidden border-linea bg-panel transition-[width] duration-200"
    :class="
      ui.menuAbierto
        ? 'w-[var(--rs-menu-ancho)] max-w-[calc(100vw-var(--rs-rail-ancho))] border-r'
        : 'w-0'
    "
    style="box-shadow: var(--rs-sombra-flotante)"
    aria-label="Secciones del módulo"
  >
    <div class="w-[var(--rs-menu-ancho)] max-w-[calc(100vw-var(--rs-rail-ancho))] px-5 py-7">
      <p class="rs-etiqueta text-laton-texto">{{ modulo?.etiqueta }}</p>
      <div class="rs-filete mt-3 mb-5" role="presentation" />

      <ul class="flex flex-col gap-0.5">
        <li v-for="seccion in secciones" :key="seccion.nombreRuta">
          <RouterLink
            :to="{ name: seccion.nombreRuta }"
            class="block rounded-control px-3.5 py-3 text-tenue transition-colors duration-200 hover:bg-seleccion hover:text-tinta"
            active-class="rs-seccion-activa"
            @click="cerrar"
          >
            <span class="block text-sm font-semibold">{{ seccion.etiqueta }}</span>
            <span v-if="seccion.descripcion" class="mt-0.5 block text-xs opacity-75">
              {{ seccion.descripcion }}
            </span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
/*
 * La sección activa se marca con fondo de selección y filete de latón a la
 * izquierda: el estado no se comunica solo por color.
 */
.rs-seccion-activa {
  background-color: var(--rs-selection);
  color: var(--rs-text);
  box-shadow: inset 3px 0 0 0 var(--rs-laton-500);
}
</style>
