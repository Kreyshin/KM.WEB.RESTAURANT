<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SelectorVariante from '@/components/acceso/SelectorVariante.vue'
import AccesoComanda from './login/AccesoComanda.vue'
import AccesoPortada from './login/AccesoPortada.vue'
import AccesoSalon from './login/AccesoSalon.vue'
import { esVarianteAcceso, varianteAccesoPorDefecto, type VarianteAcceso } from '@/config/acceso'

/**
 * Pantalla de acceso. Elige qué variante se muestra y no hace nada más: la
 * autenticación vive en `useAcceso`, y cada variante solo pone la escena.
 *
 * El orden de preferencia es URL → elección previa → la del producto. Así un
 * enlace con `?acceso=comanda` enseña esa variante a quien lo abra, sin
 * arrastrar la preferencia de quien lo envió.
 */

const CLAVE = 'km.restaurante.acceso'

const route = useRoute()
const router = useRouter()

function inicial(): VarianteAcceso {
  const consulta = route.query.acceso
  if (esVarianteAcceso(consulta)) return consulta
  try {
    const guardada = localStorage.getItem(CLAVE)
    if (esVarianteAcceso(guardada)) return guardada
  } catch {
    // Sin almacenamiento disponible: se usa la del producto.
  }
  return varianteAccesoPorDefecto
}

const variante = ref<VarianteAcceso>(inicial())

watch(variante, (valor) => {
  try {
    localStorage.setItem(CLAVE, valor)
  } catch {
    // La elección dura lo que la pestaña.
  }
  router.replace({ query: { ...route.query, acceso: valor } })
})

const componentes = {
  portada: AccesoPortada,
  salon: AccesoSalon,
  comanda: AccesoComanda,
} as const

const vista = computed(() => componentes[variante.value])
</script>

<template>
  <div class="h-full">
    <component :is="vista" />
    <SelectorVariante v-model="variante" />
  </div>
</template>
