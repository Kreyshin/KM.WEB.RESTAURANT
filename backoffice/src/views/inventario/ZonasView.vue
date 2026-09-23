<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModoIntegracion from '@/components/ui/KmModoIntegracion.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { accesosService, nivelAlmacen } from '@/services/accesos.service'
import { vinculoDe } from '@/services/integracion.service'
import { almacenesService, zonasService } from '@/services/inventario.service'
import { parametrosService } from '@/services/parametros.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { AccesoZona, ApiError, Usuario, Zona } from '@/types'
import type { OpcionSelect, Pestana } from '@/types/ui'

/**
 * Almacén y zonas del local (D-009). El almacén es uno por local y es lo que
 * ve Inventarios del ERP; dentro, el restaurante organiza la mercadería en
 * zonas y decide quién gestiona cada una.
 */

const ui = useUiStore()
const localStore = useLocalStore()
const catalogos = useCatalogos(['zonas', 'insumos'])
const { zonas, insumos } = catalogos

const usuarios = shallowRef<Usuario[]>([])
const restricciones = shallowRef<AccesoZona[]>([])

async function cargar() {
  const [us, rs] = await Promise.all([
    parametrosService.usuarios(),
    accesosService.restriccionesZona(),
    catalogos.recargar(),
  ])
  usuarios.value = us.filter((u) => u.activo)
  restricciones.value = rs
}
watch(() => localStore.localId, cargar, { immediate: true })

const almacen = computed(() =>
  localStore.localId ? almacenesService.delLocal(localStore.localId) : undefined,
)
const vinculo = computed(() => (almacen.value ? vinculoDe('almacen', almacen.value.id) : undefined))
const delLocal = computed(() => zonas.value.filter((z) => z.localId === localStore.localId))

const stockDe = (zonaId: string) =>
  insumos.value.filter((i) => i.existencias.some((e) => e.zonaId === zonaId && e.cantidad > 0))
    .length

const pestana = ref<'zonas' | 'accesos'>('zonas')
const pestanas = computed<Pestana[]>(() => [
  { valor: 'zonas', etiqueta: 'Zonas', contador: delLocal.value.length },
  { valor: 'accesos', etiqueta: 'Quién gestiona cada zona' },
])

// ── Editor ──

const abierto = ref(false)
const editando = shallowRef<Zona | null>(null)
const nombre = ref('')
const descripcion = ref('')
const activo = ref(true)
const guardando = ref(false)

function abrir(z?: Zona) {
  editando.value = z ?? null
  nombre.value = z?.nombre ?? ''
  descripcion.value = z?.descripcion ?? ''
  activo.value = z?.activo ?? true
  abierto.value = true
}

async function guardar() {
  if (!localStore.localId || !almacen.value) return
  guardando.value = true
  const datos = {
    nombre: nombre.value,
    descripcion: descripcion.value.trim() || undefined,
    localId: localStore.localId,
    almacenId: almacen.value.id,
    activo: activo.value,
  }
  try {
    if (editando.value) await zonasService.actualizar(editando.value.id, datos)
    else await zonasService.crear(datos)
    ui.exito(`Zona «${datos.nombre.trim()}» guardada.`)
    abierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar la zona.')
  } finally {
    guardando.value = false
  }
}

async function eliminar(z: Zona) {
  try {
    await zonasService.eliminar(z.id)
    ui.exito(`Zona «${z.nombre}» eliminada.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  }
}

// ── Accesos por zona ──

const opcionesNivel: OpcionSelect[] = [
  { valor: '', etiqueta: 'Como el almacén' },
  { valor: 'ver', etiqueta: 'Solo ver' },
  { valor: 'ninguno', etiqueta: 'Sin acceso' },
]

function restriccion(usuarioId: string, zonaId: string) {
  return (
    restricciones.value.find((r) => r.usuarioId === usuarioId && r.zonaId === zonaId)?.nivel ?? ''
  )
}

async function restringir(usuarioId: string, zonaId: string, nivel: string) {
  try {
    await accesosService.restringirZona(
      usuarioId,
      zonaId,
      (nivel || undefined) as AccesoZona['nivel'] | undefined,
    )
    restricciones.value = await accesosService.restriccionesZona()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar el acceso.')
  }
}

const etiquetaErp = (u: Usuario) => {
  const n = almacen.value ? nivelAlmacen(u.id, almacen.value.id) : null
  return n === 'gestionar'
    ? 'Gestiona el almacén'
    : n === 'ver'
      ? 'Solo ve el almacén'
      : 'Sin acceso al almacén'
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <p class="rs-etiqueta text-laton-texto">Almacén del local</p>
          <h2 class="rs-titulo-seccion mt-1 text-tinta">
            {{ almacen?.nombre ?? 'Este local no tiene almacén' }}
          </h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            Es lo que conoce Inventarios del ERP: un almacén por local. Dentro, el restaurante
            separa la mercadería en zonas; moverla entre zonas no cambia el total del almacén.
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <KmModoIntegracion
              capacidad="inventario"
              :local-id="localStore.localId ?? undefined"
              mostrar-autonomo
            />
            <span v-if="vinculo" class="text-xs text-tenue tabular-nums">
              En el ERP: {{ vinculo.idExterno }}
            </span>
          </div>
        </div>
        <KmButton v-if="pestana === 'zonas'" :disabled="!almacen" @click="abrir()"
          >Nueva zona</KmButton
        >
      </div>

      <div class="px-6 pt-4 pb-6">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Zonas">
          <ul v-if="pestana === 'zonas'" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <li
              v-for="z in delLocal"
              :key="z.id"
              class="flex flex-col gap-2 rounded-card border border-linea p-4"
              :class="z.activo ? '' : 'opacity-60'"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-semibold text-tinta">{{ z.nombre }}</p>
                  <p v-if="z.descripcion" class="text-xs text-tenue">{{ z.descripcion }}</p>
                </div>
                <KmBadge v-if="!z.activo" tono="neutro">Inactiva</KmBadge>
              </div>
              <p class="text-sm text-tenue">
                <span class="font-semibold text-tinta tabular-nums">{{ stockDe(z.id) }}</span>
                insumos con stock
              </p>
              <div class="flex justify-end gap-1">
                <KmBotonIcono
                  icono="editar"
                  etiqueta="Editar"
                  :contexto="z.nombre"
                  @click="abrir(z)"
                />
                <KmBotonIcono
                  icono="eliminar"
                  tono="peligro"
                  etiqueta="Eliminar"
                  :contexto="z.nombre"
                  @click="eliminar(z)"
                />
              </div>
            </li>
            <li v-if="!delLocal.length" class="text-sm text-tenue">
              Aún no hay zonas: crea la primera, por ejemplo «Despensa».
            </li>
          </ul>

          <div v-else class="overflow-x-auto rounded-card border border-linea">
            <table class="w-full min-w-[640px] text-sm">
              <thead>
                <tr class="border-b border-linea text-left text-xs text-tenue">
                  <th class="px-4 py-2.5 font-medium">Usuario</th>
                  <th
                    v-for="z in delLocal.filter((x) => x.activo)"
                    :key="z.id"
                    class="px-3 py-2.5 font-medium"
                  >
                    {{ z.nombre }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in usuarios" :key="u.id" class="border-b border-linea last:border-0">
                  <td class="px-4 py-2.5">
                    <p class="font-medium text-tinta">{{ u.nombre }}</p>
                    <p class="text-xs text-tenue">{{ etiquetaErp(u) }} · ERP</p>
                  </td>
                  <td v-for="z in delLocal.filter((x) => x.activo)" :key="z.id" class="px-3 py-2">
                    <KmSelect
                      :model-value="restriccion(u.id, z.id)"
                      :opciones="opcionesNivel"
                      :etiqueta="`Acceso de ${u.nombre} a ${z.nombre}`"
                      @update:model-value="restringir(u.id, z.id, String($event ?? ''))"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="border-t border-linea px-4 py-2.5 text-xs text-tenue">
              El ERP da el acceso al almacén; aquí solo se puede recortar por zona, nunca ampliar.
            </p>
          </div>
        </KmTabs>
      </div>
    </KmCard>

    <KmDrawer v-model="abierto" :titulo="editando ? `Editar ${editando.nombre}` : 'Nueva zona'">
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Nombre" requerido>
          <KmInput :id="id" v-model="nombre" placeholder="Cámara de frío, Barra, Despensa" />
        </KmField>
        <KmField v-slot="{ id }" label="Descripción">
          <KmInput :id="id" v-model="descripcion" placeholder="Qué se guarda aquí" />
        </KmField>
        <KmSwitch v-if="editando" v-model="activo" etiqueta="Zona activa" />
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar</KmButton>
      </template>
    </KmDrawer>
  </div>
</template>
