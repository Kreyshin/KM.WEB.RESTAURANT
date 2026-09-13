<script setup lang="ts">
import { copiar } from '@/utils/copiar'
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { inventarioService } from '@/services/inventario.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, LineaToma, TomaInventario } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { etiquetaEstadoToma, tonoEstadoToma } from '@/utils/configuracion'
import { etiquetaUnidad, formatearCantidad, formatearFecha, formatearSoles } from '@/utils/formato'

const ui = useUiStore()
const auth = useAuthStore()
const catalogos = useCatalogos(['almacenes', 'insumos', 'locales'])
const { insumo, nombreAlmacen } = catalogos

const tomas = shallowRef<TomaInventario[]>([])
const cargando = ref(true)

async function cargar() {
  cargando.value = true
  try {
    tomas.value = await inventarioService.listarTomas()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar las tomas.')
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const columnas: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Toma', clase: 'w-32' },
  { clave: 'almacenId', etiqueta: 'Almacén' },
  { clave: 'fecha', etiqueta: 'Fecha', clase: 'w-40' },
  { clave: 'avance', etiqueta: 'Contados', clase: 'w-32 text-right' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-32' },
  { clave: 'acciones', etiqueta: '', clase: 'w-16 text-right' },
]

const contados = (t: TomaInventario) => t.lineas.filter((l) => l.contado !== null).length

// ── Nueva toma ──
const nuevaAbierta = ref(false)
const almacenNueva = ref('')
const errorNueva = ref('')
const abriendo = ref(false)

function pedirNueva() {
  almacenNueva.value = (catalogos.opcionesAlmacen.value[0]?.valor as string) ?? ''
  errorNueva.value = ''
  nuevaAbierta.value = true
}

async function abrirToma() {
  abriendo.value = true
  errorNueva.value = ''
  try {
    const toma = await inventarioService.abrirToma(almacenNueva.value, auth.usuario?.id ?? 'u1')
    nuevaAbierta.value = false
    await Promise.all([cargar(), catalogos.recargar()])
    abrirDetalle(toma)
  } catch (e) {
    errorNueva.value = (e as ApiError).mensaje ?? 'No se pudo abrir la toma.'
  } finally {
    abriendo.value = false
  }
}

// ── Detalle y conteo ──
const detalleAbierto = ref(false)
const actual = shallowRef<TomaInventario | null>(null)
const lineas = ref<LineaToma[]>([])
const notas = ref('')
const soloDiferencias = ref(false)
const guardando = ref(false)
const confirmarAplicar = ref(false)

function abrirDetalle(t: TomaInventario) {
  actual.value = t
  lineas.value = copiar(t.lineas)
  notas.value = t.notas ?? ''
  soloDiferencias.value = false
  detalleAbierto.value = true
}

const editable = computed(() => actual.value?.estado === 'abierta')
const diferencia = (l: LineaToma) =>
  l.contado === null ? null : Math.round((l.contado - l.teorico) * 1000) / 1000
const valorDiferencia = (l: LineaToma) =>
  (diferencia(l) ?? 0) * (insumo(l.insumoId)?.costoUnitario ?? 0)

const lineasVisibles = computed(() =>
  soloDiferencias.value ? lineas.value.filter((l) => (diferencia(l) ?? 0) !== 0) : lineas.value,
)

const resumen = computed(() => {
  const contadas = lineas.value.filter((l) => l.contado !== null)
  return {
    contadas: contadas.length,
    total: lineas.value.length,
    faltante: contadas.reduce((t, l) => t + Math.min(0, valorDiferencia(l)), 0),
    sobrante: contadas.reduce((t, l) => t + Math.max(0, valorDiferencia(l)), 0),
  }
})

async function guardarConteo(cerrar = true) {
  if (!actual.value) return
  guardando.value = true
  try {
    actual.value = await inventarioService.guardarConteo(actual.value.id, lineas.value, notas.value)
    ui.exito('Conteo guardado.')
    await cargar()
    if (cerrar) detalleAbierto.value = false
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo guardar el conteo.')
  } finally {
    guardando.value = false
  }
}

async function aplicar() {
  if (!actual.value) return
  guardando.value = true
  try {
    await inventarioService.guardarConteo(actual.value.id, lineas.value, notas.value)
    await inventarioService.aplicarToma(actual.value.id, auth.usuario?.id ?? 'u1')
    ui.exito(`${actual.value.numero} aplicada: el stock quedó ajustado al conteo.`)
    confirmarAplicar.value = false
    detalleAbierto.value = false
    await Promise.all([cargar(), catalogos.recargar()])
  } catch (e) {
    confirmarAplicar.value = false
    ui.error((e as ApiError).mensaje ?? 'No se pudo aplicar la toma.')
  } finally {
    guardando.value = false
  }
}

async function anular() {
  if (!actual.value) return
  try {
    await inventarioService.anularToma(actual.value.id)
    ui.exito('Toma anulada.')
    detalleAbierto.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo anular.')
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCard
      titulo="Toma de inventario"
      subtitulo="Conteo físico por almacén. Al aplicarla, el stock se ajusta y las diferencias quedan en el kardex."
      sin-padding
    >
      <template #acciones>
        <KmButton tamano="sm" @click="pedirNueva">Nueva toma</KmButton>
      </template>

      <KmTable
        :columnas="columnas"
        :filas="tomas"
        :cargando="cargando"
        mensaje-vacio="Aún no se ha hecho ninguna toma."
      >
        <template #col-numero="{ fila }">
          <span class="font-mono font-semibold text-tinta">{{ fila.numero }}</span>
        </template>
        <template #col-almacenId="{ fila }">{{ nombreAlmacen(fila.almacenId) }}</template>
        <template #col-fecha="{ fila }">
          <span class="text-tenue tabular-nums">{{ formatearFecha(fila.fecha) }}</span>
        </template>
        <template #col-avance="{ fila }">
          <span class="tabular-nums">{{ contados(fila) }} / {{ fila.lineas.length }}</span>
        </template>
        <template #col-estado="{ fila }">
          <KmBadge :tono="tonoEstadoToma[fila.estado]" punto>{{
            etiquetaEstadoToma[fila.estado]
          }}</KmBadge>
        </template>
        <template #col-acciones="{ fila }">
          <div class="flex justify-end">
            <KmBotonIcono
              :icono="fila.estado === 'abierta' ? 'editar' : 'ver'"
              :etiqueta="fila.estado === 'abierta' ? 'Contar' : 'Ver'"
              :contexto="fila.numero"
              @click="abrirDetalle(fila)"
            />
          </div>
        </template>
      </KmTable>
    </KmCard>

    <KmModal v-model="nuevaAbierta" titulo="Nueva toma de inventario" ancho="sm">
      <div class="flex flex-col gap-3">
        <KmField v-slot="{ id, invalido }" label="Almacén a contar" :error="errorNueva">
          <KmSelect
            :id="id"
            v-model="almacenNueva"
            :opciones="catalogos.opcionesAlmacen.value"
            :invalido="invalido"
          />
        </KmField>
        <p class="text-xs text-tenue">
          Se congela el stock actual de cada insumo. Lo ideal es contar con la cocina cerrada, sin
          movimientos en curso.
        </p>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="nuevaAbierta = false">Cancelar</KmButton>
        <KmButton :cargando="abriendo" @click="abrirToma">Abrir toma</KmButton>
      </template>
    </KmModal>

    <KmDrawer
      v-model="detalleAbierto"
      :titulo="actual ? `${actual.numero} · ${nombreAlmacen(actual.almacenId)}` : 'Toma'"
      :subtitulo="
        actual ? `${etiquetaEstadoToma[actual.estado]} · ${formatearFecha(actual.fecha)}` : ''
      "
      ancho="lg"
    >
      <div v-if="actual" class="flex flex-col gap-4">
        <div class="grid grid-cols-3 gap-3 text-sm">
          <div class="rounded-card border border-linea px-3 py-2">
            <p class="rs-etiqueta text-tenue">Contados</p>
            <p class="font-semibold tabular-nums">{{ resumen.contadas }} / {{ resumen.total }}</p>
          </div>
          <div class="rounded-card border border-linea px-3 py-2">
            <p class="rs-etiqueta text-tenue">Faltante</p>
            <p class="font-semibold text-vino tabular-nums">
              {{ formatearSoles(Math.abs(resumen.faltante)) }}
            </p>
          </div>
          <div class="rounded-card border border-linea px-3 py-2">
            <p class="rs-etiqueta text-tenue">Sobrante</p>
            <p class="font-semibold text-verde tabular-nums">
              {{ formatearSoles(resumen.sobrante) }}
            </p>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-tenue">
          <input v-model="soloDiferencias" type="checkbox" class="accent-[var(--rs-accion)]" />
          Ver solo diferencias
        </label>

        <div class="overflow-x-auto rounded-card border border-linea">
          <table class="w-full min-w-[34rem] text-sm">
            <thead>
              <tr class="border-b border-linea bg-panel-2">
                <th class="rs-etiqueta px-3 py-2 text-left text-tenue">Insumo</th>
                <th class="rs-etiqueta px-3 py-2 text-right text-tenue">Sistema</th>
                <th class="rs-etiqueta w-40 px-3 py-2 text-left text-tenue">Contado</th>
                <th class="rs-etiqueta px-3 py-2 text-right text-tenue">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="l in lineasVisibles"
                :key="l.insumoId"
                class="border-b border-linea last:border-0"
              >
                <td class="px-3 py-2 text-tinta">{{ insumo(l.insumoId)?.nombre ?? '—' }}</td>
                <td class="px-3 py-2 text-right text-tenue tabular-nums">
                  {{ formatearCantidad(l.teorico, insumo(l.insumoId)?.unidad ?? 'unidad') }}
                </td>
                <td class="px-3 py-1.5">
                  <KmNumero
                    v-if="editable"
                    v-model="l.contado"
                    :min="0"
                    :decimales="3"
                    :controles="false"
                    :sufijo="etiquetaUnidad[insumo(l.insumoId)?.unidad ?? 'unidad']"
                    placeholder="Sin contar"
                  />
                  <span v-else class="tabular-nums">
                    {{
                      l.contado === null
                        ? 'Sin contar'
                        : formatearCantidad(l.contado, insumo(l.insumoId)?.unidad ?? 'unidad')
                    }}
                  </span>
                </td>
                <td
                  class="px-3 py-2 text-right font-medium tabular-nums"
                  :class="
                    (diferencia(l) ?? 0) < 0
                      ? 'text-vino'
                      : (diferencia(l) ?? 0) > 0
                        ? 'text-verde'
                        : 'text-tenue'
                  "
                >
                  <template v-if="diferencia(l) !== null">
                    {{ diferencia(l)! > 0 ? '+' : '' }}{{ diferencia(l) }}
                    <span class="block text-[11px] font-normal">{{
                      formatearSoles(valorDiferencia(l))
                    }}</span>
                  </template>
                  <template v-else>—</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <KmField v-slot="{ id }" label="Notas">
          <KmInput
            :id="id"
            v-model="notas"
            :disabled="!editable"
            placeholder="Ej. Se encontró un lote vencido"
          />
        </KmField>
        <p v-if="editable" class="text-xs text-tenue">
          Solo se ajustan los insumos contados. El stock se compara con el actual al aplicar, por si
          hubo movimientos durante el conteo.
        </p>
      </div>

      <template #footer>
        <template v-if="editable">
          <KmButton variante="fantasma" class="mr-auto" @click="anular"
            ><span class="text-vino">Anular toma</span></KmButton
          >
          <KmButton variante="secundario" :cargando="guardando" @click="guardarConteo()"
            >Guardar avance</KmButton
          >
          <KmButton :disabled="resumen.contadas === 0" @click="confirmarAplicar = true"
            >Aplicar ajustes</KmButton
          >
        </template>
        <KmButton v-else variante="secundario" @click="detalleAbierto = false">Cerrar</KmButton>
      </template>
    </KmDrawer>

    <KmConfirm
      v-model="confirmarAplicar"
      titulo="Aplicar toma de inventario"
      :mensaje="`Se ajustará el stock de ${resumen.contadas} insumos: faltante ${formatearSoles(Math.abs(resumen.faltante))}, sobrante ${formatearSoles(resumen.sobrante)}. Esta acción no se puede deshacer.`"
      texto-confirmar="Aplicar ajustes"
      :cargando="guardando"
      @confirmar="aplicar"
    />
  </div>
</template>
