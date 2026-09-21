<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmExportar from '@/components/ui/KmExportar.vue'
import KmField from '@/components/ui/KmField.vue'
import KmRangoFechas from '@/components/ui/KmRangoFechas.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { auditoriaService } from '@/services/auditoria.service'
import { parametrosService, tienePermiso } from '@/services/parametros.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import type { ModuloAuditoria, RegistroAuditoria, Usuario } from '@/types'
import type { OpcionSelect, RangoFechas, TonoMesa } from '@/types/ui'
import { exportarCsv, exportarExcel } from '@/utils/exportar'
import { formatearFecha } from '@/utils/formato'

/**
 * Bitácora (F5): las acciones sensibles que ya se registran —permisos, turnos,
 * modo de integración, recetas, precios y compras sin OC—. Solo se consulta.
 */

const auth = useAuthStore()
const localStore = useLocalStore()

const registros = shallowRef<RegistroAuditoria[]>([])
const usuarios = shallowRef<Usuario[]>([])
const cargando = ref(true)
const puedeVer = computed(() => tienePermiso(auth.usuario?.id, 'personal.auditoria'))

const modulos: ModuloAuditoria[] = [
  'Permisos',
  'Turnos',
  'Integración',
  'Recetas',
  'Precios',
  'Compras',
  'Inventario',
  'Reservas',
]
const tono: Record<ModuloAuditoria, TonoMesa> = {
  Permisos: 'vino',
  Turnos: 'pizarra',
  Integración: 'laton',
  Recetas: 'verde',
  Precios: 'laton',
  Compras: 'pizarra',
  Inventario: 'neutro',
  Reservas: 'verde',
}

const modulo = ref('')
const usuarioId = ref('')
const localId = ref('')
const buscar = ref('')
const rango = ref<RangoFechas>({ desde: '', hasta: '' })

const opcionesModulo: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los módulos' },
  ...modulos.map((m) => ({ valor: m, etiqueta: m })),
]
const opcionesUsuario = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Cualquier persona' },
  ...usuarios.value.map((u) => ({ valor: u.id, etiqueta: u.nombre })),
])
const opcionesLocal = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los locales' },
  ...localStore.locales.map((l) => ({ valor: l.id, etiqueta: l.nombre })),
])
const nombreLocal = (id?: string) =>
  id ? (localStore.locales.find((l) => l.id === id)?.nombre ?? id) : '—'

async function cargar() {
  cargando.value = true
  registros.value = await auditoriaService.listar({
    modulo: (modulo.value || undefined) as ModuloAuditoria | undefined,
    usuarioId: usuarioId.value || undefined,
    localId: localId.value || undefined,
    desde: rango.value.desde || undefined,
    hasta: rango.value.hasta || undefined,
    buscar: buscar.value,
  })
  cargando.value = false
}

onMounted(async () => {
  usuarios.value = await parametrosService.usuarios()
  if (!localStore.locales.length) await localStore.cargar()
  await cargar()
})
watch([modulo, usuarioId, localId, rango, buscar], cargar)

const fechaHora = (iso: string) =>
  `${formatearFecha(iso)} ${new Date(iso).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`

function exportar(formato: 'csv' | 'excel') {
  const columnas = [
    { etiqueta: 'Fecha', valor: (r: RegistroAuditoria) => fechaHora(r.fecha) },
    { etiqueta: 'Módulo', valor: (r: RegistroAuditoria) => r.modulo },
    { etiqueta: 'Acción', valor: (r: RegistroAuditoria) => r.accion },
    { etiqueta: 'Quién', valor: (r: RegistroAuditoria) => r.autor },
    { etiqueta: 'Local', valor: (r: RegistroAuditoria) => nombreLocal(r.localId) },
    { etiqueta: 'Detalle', valor: (r: RegistroAuditoria) => r.detalle },
  ]
  if (formato === 'csv') exportarCsv('bitacora', registros.value, columnas)
  else exportarExcel('bitacora', registros.value, columnas)
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard
      v-if="!puedeVer"
      titulo="Bitácora"
      subtitulo="Necesitas el permiso «Ver la bitácora» para entrar aquí."
    >
      <p class="text-sm text-tenue">Pídeselo a un administrador en Permisos por rol.</p>
    </KmCard>

    <KmCard
      v-else
      titulo="Bitácora"
      subtitulo="Quién hizo cada acción sensible y cuándo. No se edita ni se borra."
      sin-padding
    >
      <template #acciones>
        <KmExportar :disabled="!registros.length" @exportar="exportar" />
      </template>

      <div class="grid gap-3 px-6 pt-5 pb-4 md:grid-cols-2 xl:grid-cols-5">
        <KmField v-slot="{ id }" label="Módulo">
          <KmSelect :id="id" v-model="modulo" :opciones="opcionesModulo" />
        </KmField>
        <KmField v-slot="{ id }" label="Quién">
          <KmSelect :id="id" v-model="usuarioId" :opciones="opcionesUsuario" />
        </KmField>
        <KmField v-slot="{ id }" label="Local">
          <KmSelect :id="id" v-model="localId" :opciones="opcionesLocal" />
        </KmField>
        <KmField label="Fechas">
          <KmRangoFechas v-model="rango" />
        </KmField>
        <KmField label="Buscar">
          <KmBusqueda v-model="buscar" placeholder="Acción o detalle" />
        </KmField>
      </div>

      <div class="overflow-x-auto border-t border-linea">
        <table class="w-full min-w-[860px] text-sm">
          <thead>
            <tr class="border-b border-linea text-left text-xs text-tenue">
              <th class="px-6 py-2.5 font-medium">Cuándo</th>
              <th class="px-3 py-2.5 font-medium">Módulo</th>
              <th class="px-3 py-2.5 font-medium">Acción</th>
              <th class="px-3 py-2.5 font-medium">Quién</th>
              <th class="px-6 py-2.5 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando">
              <td colspan="5" class="px-6 py-8 text-center text-tenue">Cargando…</td>
            </tr>
            <tr
              v-for="r in registros"
              v-else
              :key="r.id"
              class="border-b border-linea last:border-0"
            >
              <td class="px-6 py-2.5 whitespace-nowrap text-tenue tabular-nums">
                {{ fechaHora(r.fecha) }}
              </td>
              <td class="px-3 py-2.5">
                <KmBadge :tono="tono[r.modulo]">{{ r.modulo }}</KmBadge>
              </td>
              <td class="px-3 py-2.5 text-tinta">{{ r.accion }}</td>
              <td class="px-3 py-2.5">
                <p class="text-tinta">{{ r.autor }}</p>
                <p v-if="r.localId" class="text-xs text-tenue">{{ nombreLocal(r.localId) }}</p>
              </td>
              <td class="px-6 py-2.5 text-tenue">{{ r.detalle }}</td>
            </tr>
            <tr v-if="!cargando && !registros.length">
              <td colspan="5" class="px-6 py-8 text-center text-tenue">
                No hay registros con estos filtros.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </KmCard>
  </div>
</template>
