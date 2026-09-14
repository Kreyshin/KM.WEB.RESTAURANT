<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import { etiquetaRol, parametrosService } from '@/services/parametros.service'
import { useLocalStore } from '@/stores/local.store'
import type { PermisoVertical, Usuario } from '@/types'

/**
 * Ajustes a los permisos de una persona sobre los de su rol. Los usuarios y
 * su acceso a locales vienen del ERP.
 */
const usuarios = ref<Usuario[]>([])
const permisos = ref<PermisoVertical[]>([])
const seleccionado = ref<string | null>(null)
const busqueda = ref('')
const cargando = ref(true)
const localStore = useLocalStore()

onMounted(async () => {
  ;[usuarios.value, permisos.value] = await Promise.all([
    parametrosService.usuarios(),
    parametrosService.permisos(),
    localStore.locales.length ? Promise.resolve() : localStore.cargar(),
  ])
  seleccionado.value = usuarios.value[0]?.id ?? null
  cargando.value = false
})

const filtrados = computed(() => {
  const t = busqueda.value.trim().toLowerCase()
  return usuarios.value.filter((u) => !t || u.nombre.toLowerCase().includes(t))
})
const usuario = computed(() => usuarios.value.find((u) => u.id === seleccionado.value))

function textoLocales(u: Usuario) {
  if (!u.localIds) return 'Todos los locales'
  return u.localIds
    .map((id) => localStore.locales.find((l) => l.id === id)?.nombre ?? id)
    .join(', ')
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCard v-if="cargando" titulo="Excepciones por usuario">
      <KmEstado tipo="cargando" compacto />
    </KmCard>

    <div v-else class="grid gap-6 md:grid-cols-[18rem_1fr]">
      <nav
        aria-label="Usuarios"
        class="flex flex-col gap-2 self-start rounded-card border border-linea bg-panel p-2"
      >
        <KmBusqueda v-model="busqueda" placeholder="Buscar usuario" />
        <div class="flex flex-col gap-1">
          <button
            v-for="u in filtrados"
            :key="u.id"
            type="button"
            class="flex flex-col rounded-control px-3 py-2 text-left transition-colors"
            :class="
              seleccionado === u.id ? 'bg-seleccion text-tinta' : 'text-tenue hover:bg-seleccion/60'
            "
            :aria-current="seleccionado === u.id ? 'true' : undefined"
            @click="seleccionado = u.id"
          >
            <span class="text-sm font-semibold">{{ u.nombre }}</span>
            <span class="text-xs text-tenue">{{ etiquetaRol[u.rol] }}</span>
          </button>
          <p v-if="filtrados.length === 0" class="px-3 py-4 text-sm text-tenue">
            Ningún usuario coincide.
          </p>
        </div>
      </nav>

      <KmCard
        v-if="usuario"
        :titulo="usuario.nombre"
        subtitulo="Permisos que se conceden o quitan a esta persona sobre los de su rol."
      >
        <template #acciones>
          <KmBadge :tono="usuario.activo ? 'verde' : 'neutro'" punto>
            {{ usuario.activo ? 'Activo' : 'Inactivo' }}
          </KmBadge>
        </template>

        <div class="flex flex-col gap-5">
          <dl class="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="rs-etiqueta text-tenue">Rol del ERP</dt>
              <dd class="mt-1 text-tinta">{{ etiquetaRol[usuario.rol] }}</dd>
            </div>
            <div>
              <dt class="rs-etiqueta text-tenue">Correo</dt>
              <dd class="mt-1 break-all text-tinta">{{ usuario.email }}</dd>
            </div>
            <div>
              <dt class="rs-etiqueta text-tenue">Locales con acceso</dt>
              <dd class="mt-1 text-tinta">{{ textoLocales(usuario) }}</dd>
            </div>
          </dl>

          <div
            v-if="permisos.length === 0"
            class="flex flex-col items-center gap-2 rounded-card border border-dashed border-linea px-6 py-10 text-center"
          >
            <p class="font-semibold text-tinta">Sin excepciones</p>
            <p class="max-w-md text-sm text-tenue">
              Usa los permisos de su rol. Cuando existan permisos de la vertical, aquí podrás
              concederle o quitarle alguno solo a esta persona.
            </p>
          </div>
        </div>
      </KmCard>
    </div>
  </div>
</template>
