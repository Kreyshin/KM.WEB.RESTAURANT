<script setup lang="ts">
import { ref } from 'vue'

/**
 * Bloque de la guía: título, explicación, demo viva y, plegado, el código de
 * uso y la tabla de props. Mantiene todas las fichas con la misma forma.
 */
defineProps<{
  titulo: string
  descripcion: string
  codigo?: string
  props?: { nombre: string; tipo: string; descripcion: string }[]
}>()

const verCodigo = ref(false)
const copiado = ref(false)

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = true
    setTimeout(() => (copiado.value = false), 1500)
  } catch {
    // Portapapeles no disponible: el código sigue visible para copiar a mano.
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-col gap-1">
      <h3 class="rs-titulo-seccion text-tinta">{{ titulo }}</h3>
      <p class="max-w-3xl text-sm text-tenue">{{ descripcion }}</p>
    </header>

    <div class="rounded-card border border-linea bg-lienzo p-5">
      <slot />
    </div>

    <div v-if="codigo || props?.length" class="flex flex-col gap-3">
      <button
        type="button"
        class="self-start text-xs font-semibold text-verde hover:underline"
        :aria-expanded="verCodigo"
        @click="verCodigo = !verCodigo"
      >
        {{ verCodigo ? 'Ocultar código y props' : 'Ver código y props' }}
      </button>

      <template v-if="verCodigo">
        <div v-if="codigo" class="relative">
          <button
            type="button"
            class="absolute top-2 right-2 rounded border border-white/15 px-2 py-0.5 text-[11px] text-white/80 hover:bg-white/10"
            @click="copiar(codigo)"
          >
            {{ copiado ? 'Copiado' : 'Copiar' }}
          </button>
          <pre
            class="overflow-x-auto rounded-card bg-rail p-4 text-xs leading-relaxed text-rail-tinta"
          ><code>{{ codigo }}</code></pre>
        </div>

        <div v-if="props?.length" class="overflow-x-auto rounded-card border border-linea">
          <table class="w-full min-w-[36rem] text-sm">
            <thead>
              <tr class="border-b border-linea bg-panel-2">
                <th class="rs-etiqueta px-3 py-2 text-left text-tenue">Prop / evento</th>
                <th class="rs-etiqueta px-3 py-2 text-left text-tenue">Tipo</th>
                <th class="rs-etiqueta px-3 py-2 text-left text-tenue">Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in props" :key="p.nombre" class="border-b border-linea last:border-0">
                <td class="px-3 py-2 font-mono text-xs text-tinta">{{ p.nombre }}</td>
                <td class="px-3 py-2 font-mono text-xs text-laton-texto">{{ p.tipo }}</td>
                <td class="px-3 py-2 text-tenue">{{ p.descripcion }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </section>
</template>
