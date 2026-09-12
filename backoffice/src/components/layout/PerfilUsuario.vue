<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { etiquetasRol } from './navegacion'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import { marca } from '@/config/marca'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const abierto = ref(false)
const contenedor = ref<HTMLElement | null>(null)

const iniciales = computed(() =>
  (auth.usuario?.nombre ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join(''),
)

function alClicFuera(evento: MouseEvent) {
  if (contenedor.value && !contenedor.value.contains(evento.target as Node)) abierto.value = false
}

onMounted(() => document.addEventListener('click', alClicFuera))
onBeforeUnmount(() => document.removeEventListener('click', alClicFuera))

async function cerrarSesion() {
  abierto.value = false
  await auth.logout()
  ui.notificar('Sesión cerrada.')
  router.push({ name: 'login' })
}
</script>

<template>
  <div ref="contenedor" class="relative mt-auto">
    <button
      type="button"
      class="grid size-11 place-items-center rounded-full border border-laton/60 bg-white/5 text-xs font-semibold text-rail-tinta transition-colors hover:bg-white/12"
      :aria-expanded="abierto"
      aria-label="Abrir opciones de usuario"
      @click="abierto = !abierto"
    >
      {{ iniciales }}
    </button>

    <!-- z-40: el panel de perfil se abre por encima del menú de secciones. -->
    <div
      v-if="abierto"
      class="rs-entrada absolute bottom-0 left-full z-40 ml-3 w-64 overflow-hidden rounded-overlay border border-linea bg-panel"
      style="box-shadow: var(--rs-sombra-flotante)"
    >
      <div class="border-b border-linea px-4 py-3.5">
        <p class="truncate text-sm font-semibold text-tinta">{{ auth.usuario?.nombre }}</p>
        <p class="truncate text-xs text-tenue">{{ auth.usuario?.email }}</p>
        <p v-if="auth.rol" class="rs-etiqueta mt-2 text-laton-texto">
          {{ etiquetasRol[auth.rol] }}
        </p>
      </div>

      <button
        type="button"
        class="flex w-full items-center justify-between px-4 py-3 text-sm text-tinta transition-colors hover:bg-seleccion"
        @click="ui.alternarTema()"
      >
        <span>Sala {{ ui.tema === 'oscuro' ? 'de noche' : 'de día' }}</span>
        <span
          class="relative h-5 w-9 rounded-full transition-colors duration-200"
          :class="ui.tema === 'oscuro' ? 'bg-verde' : 'bg-linea'"
        >
          <span
            class="absolute top-0.5 size-4 rounded-full bg-white transition-all duration-200"
            :class="ui.tema === 'oscuro' ? 'left-4.5' : 'left-0.5'"
          />
        </span>
      </button>

      <button
        type="button"
        class="w-full border-t border-linea px-4 py-3 text-left text-sm font-medium text-vino transition-colors hover:bg-vino/10 dark:text-[var(--rs-vino-claro)]"
        @click="cerrarSesion"
      >
        Cerrar sesión
      </button>

      <!-- Atribución de plataforma: la marca Karma se conserva y se muestra. -->
      <div class="flex items-center gap-2 border-t border-linea bg-panel-2 px-4 py-2.5">
        <KarmaLogo :tamano="18" />
        <span class="text-[11px] text-tenue">{{ marca.plataforma }}</span>
      </div>
    </div>
  </div>
</template>
