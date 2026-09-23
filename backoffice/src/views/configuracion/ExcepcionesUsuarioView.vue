<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import {
  etiquetaRol,
  origenPermiso,
  parametrosService,
  tienePermiso,
} from '@/services/parametros.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, ExcepcionPermiso, PermisoVertical, Usuario } from '@/types'
import type { OpcionSelect } from '@/types/ui'

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
const ui = useUiStore()
const auth = useAuthStore()
const excepciones = ref<ExcepcionPermiso[]>([])
const puedeEditar = computed(() => tienePermiso(auth.usuario?.id, 'personal.permisos'))

const opcionesEstado: OpcionSelect[] = [
  { valor: '', etiqueta: 'Como su rol' },
  { valor: 'si', etiqueta: 'Conceder' },
  { valor: 'no', etiqueta: 'Quitar' },
]
const etiquetaOrigen: Record<string, string> = {
  admin: 'Puede todo por ser administrador',
  rol: 'Lo da su rol',
  concedido: 'Concedido a esta persona',
  quitado: 'Quitado a esta persona',
  sinAcceso: 'Su rol no lo da',
}

/** Recalcula al cambiar excepciones. */
function estadoDe(clave: string) {
  void excepciones.value
  const u = usuario.value
  if (!u) return { valor: '', origen: 'sinAcceso' as const, permitido: false }
  const e = excepciones.value.find((x) => x.usuarioId === u.id && x.clave === clave)
  return {
    valor: e ? (e.concedido ? 'si' : 'no') : '',
    origen: origenPermiso(u.id, clave),
    permitido: tienePermiso(u.id, clave),
  }
}

async function fijar(clave: string, valor: string) {
  const u = usuario.value
  if (!u || !auth.usuario) return
  try {
    excepciones.value = await parametrosService.fijarExcepcion(
      u.id,
      clave,
      valor === '' ? undefined : valor === 'si',
      auth.usuario.id,
    )
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar el permiso.')
  }
}

const porModulo = computed(() => {
  const grupos = new Map<string, PermisoVertical[]>()
  for (const p of permisos.value) grupos.set(p.modulo, [...(grupos.get(p.modulo) ?? []), p])
  return [...grupos.entries()]
})

onMounted(async () => {
  ;[usuarios.value, permisos.value, excepciones.value] = await Promise.all([
    parametrosService.usuarios(),
    parametrosService.permisos(),
    parametrosService.excepciones(),
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
  <div class="flex w-full flex-col gap-6">
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
            v-if="usuario.rol === 'admin'"
            class="flex flex-col items-center gap-2 rounded-card border border-dashed border-linea px-6 py-10 text-center"
          >
            <p class="font-semibold text-tinta">El administrador puede todo</p>
            <p class="max-w-md text-sm text-tenue">
              No necesita excepciones. Para limitar a alguien, dale otro rol en el ERP.
            </p>
          </div>

          <div v-else class="flex flex-col gap-5">
            <section v-for="[modulo, lista] in porModulo" :key="modulo">
              <p class="rs-etiqueta mb-2 text-laton-texto">{{ modulo }}</p>
              <ul class="divide-y divide-linea rounded-card border border-linea">
                <li
                  v-for="p in lista"
                  :key="p.clave"
                  class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div class="min-w-48 flex-1">
                    <p class="text-sm font-medium text-tinta">{{ p.etiqueta }}</p>
                    <p class="text-xs text-tenue">
                      {{ etiquetaOrigen[estadoDe(p.clave).origen] }}
                    </p>
                  </div>
                  <KmBadge :tono="estadoDe(p.clave).permitido ? 'verde' : 'neutro'" punto>
                    {{ estadoDe(p.clave).permitido ? 'Puede' : 'No puede' }}
                  </KmBadge>
                  <div class="w-40">
                    <KmSelect
                      :model-value="estadoDe(p.clave).valor"
                      :opciones="opcionesEstado"
                      :disabled="!puedeEditar"
                      :etiqueta="`«${p.etiqueta}» para ${usuario.nombre}`"
                      @update:model-value="fijar(p.clave, String($event ?? ''))"
                    />
                  </div>
                </li>
              </ul>
            </section>
            <p class="text-xs text-tenue">
              «Quitar» gana sobre lo que da el rol. Cada cambio queda en la bitácora.
            </p>
          </div>
        </div>
      </KmCard>
    </div>
  </div>
</template>
