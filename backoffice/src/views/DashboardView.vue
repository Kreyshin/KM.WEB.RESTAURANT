<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import { mesasService } from '@/services/mesas.service'
import { salonesService } from '@/services/salones.service'
import { useAuthStore } from '@/stores/auth.store'
import type { Mesa, Salon } from '@/types'
import { estadosMesa, etiquetaEstado, tonoEstado } from '@/utils/mesas'

const auth = useAuthStore()
const mesas = ref<Mesa[]>([])
const salones = ref<Salon[]>([])
const cargando = ref(true)

onMounted(async () => {
  ;[mesas.value, salones.value] = await Promise.all([
    mesasService.listar(),
    salonesService.listar(),
  ])
  cargando.value = false
})

const activas = computed(() => mesas.value.filter((m) => m.estado !== 'inactiva'))

const porEstado = computed(() =>
  estadosMesa.map((estado) => ({
    estado,
    cantidad: mesas.value.filter((m) => m.estado === estado).length,
  })),
)

const ocupacion = computed(() => {
  if (activas.value.length === 0) return 0
  const ocupadas = activas.value.filter((m) => m.estado === 'ocupada').length
  return Math.round((ocupadas / activas.value.length) * 100)
})

const comensalesSentados = computed(() =>
  activas.value.filter((m) => m.estado === 'ocupada').reduce((total, m) => total + m.capacidad, 0),
)

const kpis = computed(() => [
  {
    etiqueta: 'Ocupación',
    valor: `${ocupacion.value}%`,
    nota: `${activas.value.filter((m) => m.estado === 'ocupada').length} de ${activas.value.length} mesas`,
  },
  {
    etiqueta: 'En sala',
    valor: String(comensalesSentados.value),
    nota: 'Comensales según capacidad',
  },
  {
    etiqueta: 'Disponibles',
    valor: String(activas.value.filter((m) => m.estado === 'libre').length),
    nota: 'Mesas listas para asignar',
  },
  {
    etiqueta: 'Salones',
    valor: String(salones.value.filter((s) => s.activo).length),
    nota: `${salones.value.length} configurados en total`,
  },
])

const resumenSalones = computed(() =>
  salones.value.map((s) => {
    const propias = mesas.value.filter((m) => m.salonId === s.id && m.estado !== 'inactiva')
    const ocupadas = propias.filter((m) => m.estado === 'ocupada').length
    return {
      ...s,
      total: propias.length,
      ocupadas,
      porcentaje: propias.length ? Math.round((ocupadas / propias.length) * 100) : 0,
    }
  }),
)

/** Saludo según la hora: el turno marca el ritmo del servicio. */
const saludo = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-7">
    <div>
      <p class="rs-display text-lg text-tinta">
        {{ saludo }}, {{ auth.usuario?.nombre.split(' ')[0] }}.
      </p>
      <p class="mt-0.5 text-sm text-tenue">Así está el comedor en este momento.</p>
    </div>

    <!-- Indicadores: cifra en serif, etiqueta en versalita, filete de latón. -->
    <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="k in kpis"
        :key="k.etiqueta"
        class="rs-panel p-6 transition-colors duration-200 hover:border-verde"
      >
        <p class="rs-etiqueta text-laton-texto">{{ k.etiqueta }}</p>
        <div class="rs-filete my-3.5" role="presentation" />
        <p class="rs-cifra text-tinta">
          <span v-if="cargando" class="inline-block h-8 w-16 animate-pulse rounded bg-linea" />
          <template v-else>{{ k.valor }}</template>
        </p>
        <p class="mt-2 text-xs text-tenue">{{ k.nota }}</p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <KmCard titulo="Mesas por estado" class="lg:col-span-1">
        <ul class="flex flex-col gap-3.5">
          <li
            v-for="e in porEstado"
            :key="e.estado"
            class="flex items-center justify-between gap-3"
          >
            <KmBadge :tono="tonoEstado[e.estado]" punto>{{ etiquetaEstado[e.estado] }}</KmBadge>
            <span class="rs-display text-base font-semibold text-tinta tabular-nums">
              {{ e.cantidad }}
            </span>
          </li>
        </ul>
      </KmCard>

      <KmCard
        titulo="Ocupación por salón"
        subtitulo="Mesas ocupadas sobre mesas activas"
        class="lg:col-span-2"
      >
        <p v-if="!cargando && resumenSalones.length === 0" class="text-sm text-tenue">
          Todavía no hay salones configurados.
        </p>

        <ul class="flex flex-col gap-5">
          <li v-for="s in resumenSalones" :key="s.id">
            <div class="mb-2 flex items-baseline justify-between gap-3">
              <span class="text-sm font-semibold text-tinta">
                {{ s.nombre }}
                <KmBadge v-if="!s.activo" tono="neutro" class="ml-1.5">Inactivo</KmBadge>
              </span>
              <span class="text-xs text-tenue tabular-nums">
                {{ s.ocupadas }}/{{ s.total }} · {{ s.porcentaje }}%
              </span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-linea">
              <div
                class="h-full rounded-full bg-verde transition-[width] duration-500"
                :style="{ width: `${s.porcentaje}%` }"
              />
            </div>
          </li>
        </ul>
      </KmCard>
    </div>
  </div>
</template>
