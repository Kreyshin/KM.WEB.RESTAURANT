<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmOrigenErp from '@/components/ui/KmOrigenErp.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { parametrosService, tienePermiso } from '@/services/parametros.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, PermisoVertical, Rol } from '@/types'

/**
 * Permisos de la vertical para cada rol del ERP (F5). Los roles no se crean
 * aquí: llegan del ERP. El administrador siempre puede todo, para que nadie se
 * quede fuera de su propia configuración.
 */
const ui = useUiStore()
const auth = useAuthStore()
const roles = ref<Awaited<ReturnType<typeof parametrosService.roles>>>([])
const permisos = ref<PermisoVertical[]>([])
const delRol = ref<string[]>([])
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

watch(seleccionado, async (rol) => {
  delRol.value = rol ? await parametrosService.permisosDeRol(rol) : []
  original.value = [...delRol.value]
})

const original = ref<string[]>([])
const guardando = ref(false)
const puedeEditar = computed(() => tienePermiso(auth.usuario?.id, 'personal.permisos'))
const esAdmin = computed(() => seleccionado.value === 'admin')
const hayCambios = computed(
  () =>
    delRol.value.length !== original.value.length ||
    delRol.value.some((c) => !original.value.includes(c)),
)

function alternar(clave: string, permitido: boolean) {
  delRol.value = permitido ? [...delRol.value, clave] : delRol.value.filter((c) => c !== clave)
}

async function guardar() {
  if (!seleccionado.value || !auth.usuario) return
  guardando.value = true
  try {
    original.value = await parametrosService.guardarPermisosDeRol(
      seleccionado.value,
      delRol.value,
      auth.usuario.id,
    )
    delRol.value = [...original.value]
    ui.exito('Permisos del rol guardados.')
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron guardar los permisos.')
  } finally {
    guardando.value = false
  }
}

const rol = computed(() => roles.value.find((r) => r.rol === seleccionado.value))

const porModulo = computed(() => {
  const grupos = new Map<string, PermisoVertical[]>()
  for (const p of permisos.value) grupos.set(p.modulo, [...(grupos.get(p.modulo) ?? []), p])
  return [...grupos.entries()]
})
</script>

<template>
  <div class="flex w-full flex-col gap-6">
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
        <template #acciones>
          <KmOrigenErp />
          <KmButton
            v-if="!esAdmin"
            :disabled="!hayCambios || !puedeEditar"
            :cargando="guardando"
            @click="guardar"
          >
            Guardar permisos
          </KmButton>
        </template>
        <div
          v-if="permisos.length === 0"
          class="flex flex-col items-center gap-2 rounded-card border border-dashed border-linea px-6 py-12 text-center"
        >
          <p class="font-semibold text-tinta">Aún no hay permisos de la vertical para asignar</p>
        </div>

        <div v-else class="flex flex-col gap-5">
          <section v-for="[modulo, lista] in porModulo" :key="modulo">
            <p class="rs-etiqueta mb-2 text-laton-texto">{{ modulo }}</p>
            <ul class="divide-y divide-linea rounded-card border border-linea">
              <li
                v-for="p in lista"
                :key="p.clave"
                class="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div v-if="esAdmin">
                  <p class="text-sm font-medium text-tinta">{{ p.etiqueta }}</p>
                  <p v-if="p.descripcion" class="text-xs text-tenue">{{ p.descripcion }}</p>
                </div>
                <KmBadge v-if="esAdmin" tono="verde" punto>Permitido</KmBadge>
                <KmSwitch
                  v-else
                  :model-value="delRol.includes(p.clave)"
                  :disabled="!puedeEditar"
                  :etiqueta="p.etiqueta"
                  :descripcion="p.descripcion"
                  class="w-full"
                  @update:model-value="alternar(p.clave, $event)"
                />
              </li>
            </ul>
          </section>
          <p v-if="esAdmin" class="text-xs text-tenue">
            El administrador tiene todos los permisos y no se edita.
          </p>
          <p v-else-if="!puedeEditar" class="text-xs text-tenue">
            Necesitas el permiso «Asignar permisos» para cambiar esto.
          </p>
          <p v-else class="text-xs text-tenue">
            Cada cambio queda en la bitácora con quién lo hizo. Una persona puede tener excepciones
            sobre lo de su rol.
          </p>
        </div>
      </KmCard>
    </div>
  </div>
</template>
