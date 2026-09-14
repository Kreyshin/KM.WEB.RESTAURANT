<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmOrigenErp from '@/components/ui/KmOrigenErp.vue'
import { parametrosService } from '@/services/parametros.service'
import type { PermisoVertical, Rol } from '@/types'

/** Permisos de la vertical para cada rol del ERP. Los roles no se crean aquí. */
const roles = ref<Awaited<ReturnType<typeof parametrosService.roles>>>([])
const permisos = ref<PermisoVertical[]>([])
const seleccionado = ref<Rol | null>(null)
const cargando = ref(true)

onMounted(async () => {
  ;[roles.value, permisos.value] = await Promise.all([
    parametrosService.roles(),
    parametrosService.permisos(),
  ])
  seleccionado.value = roles.value[0]?.rol ?? null
  cargando.value = false
})

const rol = computed(() => roles.value.find((r) => r.rol === seleccionado.value))
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCard v-if="cargando" titulo="Permisos por rol"><KmEstado tipo="cargando" compacto /></KmCard>

    <div v-else class="grid gap-6 md:grid-cols-[16rem_1fr]">
      <nav
        aria-label="Roles del ERP"
        class="flex flex-col gap-1 self-start rounded-card border border-linea bg-panel p-2"
      >
        <div class="flex items-center justify-between gap-2 px-2 py-1.5">
          <p class="rs-etiqueta text-tenue">Roles del ERP</p>
        </div>
        <button
          v-for="r in roles"
          :key="r.rol"
          type="button"
          class="flex items-center justify-between rounded-control px-3 py-2 text-left transition-colors"
          :class="
            seleccionado === r.rol ? 'bg-seleccion text-tinta' : 'text-tenue hover:bg-seleccion/60'
          "
          :aria-current="seleccionado === r.rol ? 'true' : undefined"
          @click="seleccionado = r.rol"
        >
          <span class="text-sm font-semibold">{{ r.etiqueta }}</span>
          <span class="text-xs tabular-nums">{{ r.usuarios }}</span>
        </button>
      </nav>

      <KmCard
        :titulo="rol ? `Permisos de ${rol.etiqueta}` : 'Permisos por rol'"
        subtitulo="Qué puede hacer este rol en la vertical. El mismo rol puede funcionar distinto en otra vertical."
      >
        <template #acciones><KmOrigenErp /></template>
        <div
          v-if="permisos.length === 0"
          class="flex flex-col items-center gap-2 rounded-card border border-dashed border-linea px-6 py-12 text-center"
        >
          <p class="font-semibold text-tinta">Aún no hay permisos de la vertical para asignar</p>
          <p class="max-w-md text-sm text-tenue">
            Cada módulo añadirá aquí sus acciones (por ejemplo, ajustar cantidades al consolidar un
            requerimiento). Se marcarán por rol y se podrán ajustar por usuario.
          </p>
        </div>
      </KmCard>
    </div>
  </div>
</template>
