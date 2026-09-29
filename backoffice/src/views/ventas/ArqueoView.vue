<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { cajaService } from '@/services/caja.service'
import { mediosPagoService } from '@/services/comercial.service'
import { tienePermiso } from '@/services/parametros.service'
import { ventasService } from '@/services/ventas.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, MedioPago, ResumenCaja, SesionCaja, Venta } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { formatearHora, formatearSoles } from '@/utils/formato'

/**
 * Arqueo de caja (F7, D-012). Se abre con fondo y se cierra contando. El cierre
 * es ciego: quien cuenta no ve lo esperado hasta haber contado, porque si lo ve
 * el arqueo deja de medir nada.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()

const sesion = shallowRef<SesionCaja | null>(null)
const resumen = shallowRef<ResumenCaja | null>(null)
const historial = shallowRef<SesionCaja[]>([])
const medios = shallowRef<MedioPago[]>([])
const ventas = shallowRef<Venta[]>([])
const cargando = ref(false)

const puedeGestionar = computed(() => tienePermiso(auth.usuario?.id, 'caja.gestionar'))
const cierreCiego = computed(() =>
  localStore.localId ? cajaService.cierreCiego(localStore.localId) : true,
)

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  try {
    const [s, h, ms] = await Promise.all([
      cajaService.sesionDe(localStore.localId),
      cajaService.historial(localStore.localId),
      mediosPagoService.todos(),
    ])
    sesion.value = s
    historial.value = h.filter((x) => x.estado === 'cerrada')
    medios.value = ms
    resumen.value = s ? await cajaService.resumen(s.id) : null
    ventas.value = s ? await ventasService.ventas({ sesionCajaId: s.id }) : []
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cargar la caja.')
  } finally {
    cargando.value = false
  }
}
watch(() => localStore.localId, cargar, { immediate: true })

// ── Apertura ─────────────────────────────────────────────────────────────────

const abriendo = ref(false)
const fondo = ref(200)

async function abrir() {
  if (!localStore.localId || !auth.usuario) return
  try {
    await cajaService.abrir(localStore.localId, fondo.value, auth.usuario.id)
    ui.exito('Caja abierta.')
    abriendo.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo abrir la caja.')
  }
}

// ── Cierre ───────────────────────────────────────────────────────────────────

const cerrando = ref(false)
const contado = ref<Record<string, number>>({})
const notaCierre = ref('')
const verEsperado = ref(false)

function abrirCierre() {
  contado.value = Object.fromEntries(medios.value.filter((m) => m.activo).map((m) => [m.id, 0]))
  notaCierre.value = ''
  verEsperado.value = !cierreCiego.value
  cerrando.value = true
}

/** Lo que el sistema espera de cada medio; en cierre ciego no se enseña aún. */
function esperado(medioId: string) {
  if (!resumen.value) return 0
  const medio = medios.value.find((m) => m.id === medioId)
  if (medio?.tipo === 'efectivo') return resumen.value.efectivoEsperado
  return resumen.value.porMedio.find((p) => p.medioPagoId === medioId)?.monto ?? 0
}

const diferenciaTotal = computed(() =>
  Object.entries(contado.value).reduce((s, [id, monto]) => s + (monto - esperado(id)), 0),
)

async function cerrar() {
  if (!sesion.value || !auth.usuario) return
  try {
    const cerrada = await cajaService.cerrar(
      sesion.value.id,
      Object.entries(contado.value).map(([medioPagoId, monto]) => ({ medioPagoId, monto })),
      auth.usuario.id,
      notaCierre.value,
    )
    ui.exito(
      cerrada.diferencia
        ? `Caja cerrada con una diferencia de ${formatearSoles(cerrada.diferencia)}.`
        : 'Caja cerrada cuadrada.',
    )
    cerrando.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cerrar la caja.')
  }
}

const columnasVentas: ColumnaTabla[] = [
  { clave: 'comprobante', etiqueta: 'Comprobante' },
  { clave: 'hora', etiqueta: 'Hora' },
  { clave: 'pagos', etiqueta: 'Pagos' },
  { clave: 'total', etiqueta: 'Total', clase: 'text-right' },
]
const filasVentas = computed(() =>
  ventas.value.map((v) => ({
    id: v.id,
    comprobante: `${v.comprobante.serie}-${v.comprobante.numero}`,
    hora: formatearHora(v.fecha),
    pagos: v.pagos.map((p) => p.nombre).join(', '),
    total: v.totales.total + v.propina,
    estado: v.estado,
  })),
)
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 py-5">
        <div>
          <p class="rs-etiqueta text-laton-texto">Turno de caja</p>
          <h2 class="rs-titulo-seccion mt-1 text-tinta">
            {{ sesion ? 'Caja abierta' : 'Caja cerrada' }}
          </h2>
          <p v-if="sesion" class="mt-1 text-sm text-tenue">
            Desde las {{ formatearHora(sesion.abierta) }} · fondo
            {{ formatearSoles(sesion.fondoInicial) }}
          </p>
          <p v-else class="mt-1 max-w-2xl text-sm text-tenue">
            Sin caja abierta no se cobra, salvo que el local lo haya desactivado.
          </p>
          <KmBadge v-if="cierreCiego" tono="pizarra" class="mt-2">Cierre a ciegas</KmBadge>
        </div>
        <KmButton v-if="!sesion" :disabled="!puedeGestionar" @click="abriendo = true">
          Abrir caja
        </KmButton>
        <KmButton v-else :disabled="!puedeGestionar" @click="abrirCierre">Cerrar caja</KmButton>
      </div>
    </KmCard>

    <div v-if="sesion && resumen" class="grid gap-5 lg:grid-cols-2">
      <KmCard titulo="Lo cobrado en este turno">
        <dl class="flex flex-col gap-1.5 text-sm tabular-nums">
          <div class="flex justify-between">
            <dt class="text-tenue">Ventas</dt>
            <dd class="text-tinta">{{ resumen.ventas }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-tenue">Total vendido</dt>
            <dd class="text-tinta">{{ formatearSoles(resumen.totalVendido) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-tenue">Propinas</dt>
            <dd class="text-tinta">{{ formatearSoles(resumen.propinas) }}</dd>
          </div>
          <div
            v-for="m in resumen.porMedio"
            :key="m.medioPagoId"
            class="flex justify-between border-t border-linea pt-1.5"
          >
            <dt class="text-tenue">{{ m.nombre }}</dt>
            <dd class="text-tinta">{{ formatearSoles(m.monto) }}</dd>
          </div>
          <div class="mt-1 flex justify-between border-t border-linea pt-2">
            <dt class="font-semibold text-tinta">Efectivo que debería haber</dt>
            <dd class="font-semibold text-tinta">{{ formatearSoles(resumen.efectivoEsperado) }}</dd>
          </div>
          <p class="text-xs text-tenue">
            Fondo inicial más el efectivo cobrado, menos los vueltos.
          </p>
        </dl>
      </KmCard>

      <KmCard titulo="Ventas del turno" sin-padding>
        <KmTable
          :columnas="columnasVentas"
          :filas="filasVentas"
          :cargando="cargando"
          mensaje-vacio="Todavía no se ha cobrado nada en este turno."
        >
          <template #col-total="{ fila }">
            <span class="tabular-nums">{{ formatearSoles(fila.total) }}</span>
          </template>
        </KmTable>
      </KmCard>
    </div>

    <KmCard v-if="historial.length" titulo="Cierres anteriores">
      <ul class="flex flex-col divide-y divide-linea text-sm">
        <li v-for="s in historial" :key="s.id" class="flex flex-wrap justify-between gap-2 py-2.5">
          <span class="text-tenue">
            {{ s.abierta.slice(0, 10) }} · {{ formatearHora(s.abierta) }}–{{
              s.cerrada ? formatearHora(s.cerrada) : ''
            }}
            <template v-if="s.nota"> · {{ s.nota }}</template>
          </span>
          <span
            class="font-semibold tabular-nums"
            :class="s.diferencia ? 'text-vino-texto' : 'text-verde'"
          >
            {{ s.diferencia ? formatearSoles(s.diferencia) : 'Cuadró' }}
          </span>
        </li>
      </ul>
    </KmCard>

    <KmModal v-model="abriendo" titulo="Abrir caja">
      <KmField
        v-slot="{ id }"
        label="Fondo inicial"
        ayuda="El sencillo con el que arranca el turno."
      >
        <KmNumero :id="id" v-model="fondo" prefijo="S/" :decimales="2" :min="0" />
      </KmField>
      <template #footer>
        <KmButton variante="secundario" @click="abriendo = false">Cancelar</KmButton>
        <KmButton @click="abrir">Abrir</KmButton>
      </template>
    </KmModal>

    <KmModal v-model="cerrando" titulo="Cerrar caja" subtitulo="Cuenta lo que hay y anótalo">
      <div class="flex flex-col gap-4">
        <p v-if="cierreCiego && !verEsperado" class="text-sm text-tenue">
          Cuenta primero: lo que el sistema espera aparece cuando lo pidas, y la diferencia queda
          guardada igual.
        </p>
        <div v-for="m in medios.filter((x) => x.activo)" :key="m.id" class="flex items-end gap-3">
          <KmField v-slot="{ id }" :label="m.nombre" class="flex-1">
            <KmNumero
              :id="id"
              :model-value="contado[m.id] ?? 0"
              prefijo="S/"
              :decimales="2"
              :min="0"
              @update:model-value="contado[m.id] = Number($event)"
            />
          </KmField>
          <p v-if="verEsperado" class="pb-2 text-xs text-tenue tabular-nums">
            Esperado {{ formatearSoles(esperado(m.id)) }} ·
            <span :class="(contado[m.id] ?? 0) - esperado(m.id) ? 'text-vino-texto' : 'text-verde'">
              {{ formatearSoles((contado[m.id] ?? 0) - esperado(m.id)) }}
            </span>
          </p>
        </div>
        <KmSwitch
          v-if="cierreCiego"
          v-model="verEsperado"
          etiqueta="Ver lo esperado"
          descripcion="Hazlo después de contar; queda igual en la bitácora."
        />
        <p
          v-if="verEsperado"
          class="text-sm font-semibold tabular-nums"
          :class="diferenciaTotal ? 'text-vino-texto' : 'text-verde'"
        >
          Diferencia total: {{ formatearSoles(diferenciaTotal) }}
        </p>
        <KmField v-slot="{ id }" label="Nota del cierre">
          <KmInput :id="id" v-model="notaCierre" placeholder="Faltan 5 soles del cambio…" />
        </KmField>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="cerrando = false">Cancelar</KmButton>
        <KmButton @click="cerrar">Cerrar caja</KmButton>
      </template>
    </KmModal>
  </div>
</template>
