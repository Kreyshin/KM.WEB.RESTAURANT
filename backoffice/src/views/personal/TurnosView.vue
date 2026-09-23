<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmHora from '@/components/ui/KmHora.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModoIntegracion from '@/components/ui/KmModoIntegracion.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { duracionMin, turnosDelErp, turnosService } from '@/services/personal.service'
import { parametrosService, tienePermiso } from '@/services/parametros.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, DiaSemana, NuevoTurno, Turno, Usuario } from '@/types'
import { etiquetaDia } from '@/utils/configuracion'

/**
 * Turnos del local (F5): quién debería estar en cada franja. Las marcaciones
 * son de la capacidad «asistencia»: con el ERP delegado, aquí solo se consulta.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()

const turnos = shallowRef<Turno[]>([])
const usuarios = shallowRef<Usuario[]>([])
const enTurno = shallowRef<{ turno: Turno; personas: Usuario[] }[]>([])

const localId = computed(() => localStore.localId ?? localStore.locales[0]?.id ?? '')
const soloLectura = computed(
  () => turnosDelErp(localId.value) || !tienePermiso(auth.usuario?.id, 'personal.turnos'),
)

async function cargar() {
  const [ts, us] = await Promise.all([turnosService.todos(), parametrosService.usuarios()])
  turnos.value = ts
  usuarios.value = us.filter((u) => u.activo)
  enTurno.value = localId.value ? await turnosService.enTurno(localId.value) : []
}
watch(localId, cargar, { immediate: true })

const delLocal = computed(() => turnos.value.filter((t) => t.localId === localId.value))
const delLocalUsuarios = computed(() =>
  usuarios.value.filter((u) => !u.localIds?.length || u.localIds.includes(localId.value)),
)
const nombreUsuario = (id: string) => usuarios.value.find((u) => u.id === id)?.nombre ?? id
const dias: DiaSemana[] = [0, 1, 2, 3, 4, 5, 6]
const horas = (t: Turno) => `${t.desde}–${t.hasta}`
const duracion = (t: Turno) => {
  const min = duracionMin(t)
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`
}

// ── Editor ──

const abierto = ref(false)
const editando = shallowRef<Turno | null>(null)
const form = ref<NuevoTurno>(vacio())
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

function vacio(): NuevoTurno {
  return {
    nombre: '',
    localId: localId.value,
    desde: '11:00',
    hasta: '18:00',
    dias: [0, 1, 2, 3, 4],
    usuarioIds: [],
    activo: true,
  }
}

function abrir(t?: Turno) {
  editando.value = t ?? null
  errores.value = {}
  form.value = t ? JSON.parse(JSON.stringify({ ...t, id: undefined })) : vacio()
  form.value.localId = t?.localId ?? localId.value
  abierto.value = true
}

function alternarDia(d: DiaSemana) {
  form.value.dias = form.value.dias.includes(d)
    ? form.value.dias.filter((x) => x !== d)
    : [...form.value.dias, d].sort()
}

function alternarPersona(id: string, marcado: boolean) {
  form.value.usuarioIds = marcado
    ? [...form.value.usuarioIds, id]
    : form.value.usuarioIds.filter((x) => x !== id)
}

async function guardar() {
  if (!auth.usuario) return
  guardando.value = true
  errores.value = {}
  try {
    const t = editando.value
      ? await turnosService.actualizar(editando.value.id, form.value, auth.usuario.id)
      : await turnosService.crear(form.value, auth.usuario.id)
    ui.exito(`Turno «${t.nombre}» guardado.`)
    abierto.value = false
    await cargar()
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar el turno.')
  } finally {
    guardando.value = false
  }
}

const confirmar = ref(false)
const aEliminar = shallowRef<Turno | null>(null)

function pedirEliminar(t: Turno) {
  aEliminar.value = t
  confirmar.value = true
}

async function eliminar() {
  if (!aEliminar.value || !auth.usuario) return
  try {
    await turnosService.eliminar(aEliminar.value.id, auth.usuario.id)
    ui.exito(`Turno «${aEliminar.value.nombre}» eliminado.`)
    confirmar.value = false
    await cargar()
  } catch (e) {
    confirmar.value = false
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard titulo="Ahora mismo" subtitulo="Quién debería estar en el local según sus turnos.">
      <template #acciones>
        <KmModoIntegracion
          capacidad="asistencia"
          :local-id="localId || undefined"
          mostrar-autonomo
        />
      </template>
      <ul v-if="enTurno.length" class="flex flex-col gap-2">
        <li v-for="e in enTurno" :key="e.turno.id" class="text-sm">
          <span class="font-semibold text-tinta">{{ e.turno.nombre }}</span>
          <span class="text-tenue"> · {{ horas(e.turno) }} · </span>
          <span class="text-tinta">
            {{ e.personas.map((p) => p.nombre).join(', ') || 'sin personal asignado' }}
          </span>
        </li>
      </ul>
      <p v-else class="text-sm text-tenue">Ningún turno cubre esta hora.</p>
    </KmCard>

    <KmCard
      titulo="Turnos del local"
      subtitulo="El turno dice qué días y a qué hora trabaja cada persona. Una persona no puede estar en dos turnos que se cruzan."
      sin-padding
    >
      <template #acciones>
        <KmButton :disabled="soloLectura" @click="abrir()">Nuevo turno</KmButton>
      </template>

      <p v-if="turnosDelErp(localId)" class="border-b border-linea px-6 py-3 text-sm text-tenue">
        La asistencia de este local la maneja el ERP: los turnos se consultan aquí y se editan allá.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead>
            <tr class="border-b border-linea text-left text-xs text-tenue">
              <th class="px-6 py-2.5 font-medium">Turno</th>
              <th class="px-3 py-2.5 font-medium">Días</th>
              <th class="px-3 py-2.5 font-medium">Horario</th>
              <th class="px-3 py-2.5 font-medium">Personal</th>
              <th class="w-24 px-6 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in delLocal"
              :key="t.id"
              class="border-b border-linea last:border-0"
              :class="t.activo ? '' : 'opacity-60'"
            >
              <td class="px-6 py-2.5">
                <p class="font-medium text-tinta">{{ t.nombre }}</p>
                <KmBadge v-if="!t.activo" tono="neutro">Inactivo</KmBadge>
              </td>
              <td class="px-3 py-2.5 text-tenue">
                {{
                  t.dias.length === 7
                    ? 'Todos los días'
                    : t.dias.map((d) => etiquetaDia[d].slice(0, 3)).join(', ')
                }}
              </td>
              <td class="px-3 py-2.5 tabular-nums">
                {{ horas(t) }}
                <span class="text-xs text-tenue">· {{ duracion(t) }}</span>
              </td>
              <td class="px-3 py-2.5">
                <p v-if="t.usuarioIds.length" class="text-tinta">
                  {{ t.usuarioIds.map(nombreUsuario).join(', ') }}
                </p>
                <p v-else class="text-tenue">Sin asignar</p>
              </td>
              <td class="px-6 py-2.5">
                <div class="flex justify-end gap-1">
                  <KmBotonIcono
                    icono="editar"
                    etiqueta="Editar turno"
                    :contexto="t.nombre"
                    :disabled="soloLectura"
                    @click="abrir(t)"
                  />
                  <KmBotonIcono
                    icono="eliminar"
                    tono="peligro"
                    etiqueta="Eliminar turno"
                    :contexto="t.nombre"
                    :disabled="soloLectura"
                    @click="pedirEliminar(t)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!delLocal.length">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-tenue">
                Este local no tiene turnos. Crea el primero, por ejemplo «Mañana».
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </KmCard>

    <KmDrawer v-model="abierto" :titulo="editando ? `Editar ${editando.nombre}` : 'Nuevo turno'">
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Nombre" requerido :error="errores.nombre">
          <KmInput :id="id" v-model="form.nombre" placeholder="Mañana, Noche, Fin de semana" />
        </KmField>
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2 text-sm">
            <KmHora v-model="form.desde" etiqueta="Desde" />
            <span class="text-tenue">a</span>
            <KmHora v-model="form.hasta" etiqueta="Hasta" />
          </div>
          <p v-if="errores.horario" class="text-xs font-medium text-vino">{{ errores.horario }}</p>
          <p class="text-xs text-tenue">
            Si termina después de medianoche, pon la hora del día siguiente.
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Días</p>
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Días del turno">
            <button
              v-for="d in dias"
              :key="d"
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
              :class="
                form.dias.includes(d)
                  ? 'border-rail bg-rail text-rail-tinta'
                  : 'border-linea text-tenue hover:border-verde hover:text-tinta'
              "
              :aria-pressed="form.dias.includes(d)"
              @click="alternarDia(d)"
            >
              {{ etiquetaDia[d].slice(0, 3) }}
            </button>
          </div>
          <p v-if="errores.dias" class="text-xs font-medium text-vino">{{ errores.dias }}</p>
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Personal</p>
          <p class="text-xs text-tenue">
            Solo aparece quien tiene acceso a este local (dato del ERP).
          </p>
          <KmCheckbox
            v-for="u in delLocalUsuarios"
            :key="u.id"
            :model-value="form.usuarioIds.includes(u.id)"
            @update:model-value="alternarPersona(u.id, $event)"
          >
            {{ u.nombre }}
          </KmCheckbox>
          <p v-if="errores.usuarioIds" class="text-xs font-medium text-vino">
            {{ errores.usuarioIds }}
          </p>
        </div>
        <KmSwitch v-model="form.activo" etiqueta="Turno activo" />
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar</KmButton>
      </template>
    </KmDrawer>

    <KmConfirm
      v-model="confirmar"
      titulo="¿Eliminar el turno?"
      :mensaje="`«${aEliminar?.nombre ?? ''}» dejará de aparecer y su personal quedará sin turno asignado.`"
      texto-confirmar="Eliminar"
      peligroso
      @confirmar="eliminar"
    />
  </div>
</template>
