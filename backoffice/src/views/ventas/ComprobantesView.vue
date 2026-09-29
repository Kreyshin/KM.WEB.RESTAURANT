<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTable from '@/components/ui/KmTable.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import {
  comprobantesService,
  etiquetaEstadoComprobante,
  etiquetaMotivoNota,
  etiquetaTipoComprobante,
} from '@/services/comprobantes.service'
import { tienePermiso, valorConfig } from '@/services/parametros.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  Comprobante,
  EstadoComprobante,
  MotivoNotaCredito,
  ReceptorComprobante,
  TipoComprobante,
  TipoDocumento,
  Venta,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana, TonoMesa } from '@/types/ui'
import { formatearHora, formatearSoles } from '@/utils/formato'

/**
 * Facturación (F8, D-013). La caja cobra y deja su nota de venta; aquí se
 * convierte en boleta o factura, se envía —simulado, con los estados que
 * tendrá el envío real— y se corrige con notas de crédito.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()

const comprobantes = shallowRef<Comprobante[]>([])
const pendientes = shallowRef<Venta[]>([])
const cargando = ref(false)

const puedeEmitir = computed(() => tienePermiso(auth.usuario?.id, 'comprobantes.emitir'))
const puedeAnular = computed(() => tienePermiso(auth.usuario?.id, 'comprobantes.anular'))
const emisionAutomatica = computed(() =>
  localStore.localId
    ? valorConfig<boolean>('comprobantes.emisionAutomatica', localStore.localId)
    : false,
)

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  try {
    const [cs, vs] = await Promise.all([
      comprobantesService.listar({ localId: localStore.localId }),
      comprobantesService.ventasSinComprobante(localStore.localId),
    ])
    comprobantes.value = cs
    pendientes.value = vs
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar los comprobantes.')
  } finally {
    cargando.value = false
  }
}
watch(() => localStore.localId, cargar, { immediate: true })

const pestana = ref<'emitidos' | 'pendientes'>('emitidos')
const pestanas = computed<Pestana[]>(() => [
  { valor: 'emitidos', etiqueta: 'Emitidos', contador: comprobantes.value.length },
  { valor: 'pendientes', etiqueta: 'Sin comprobante', contador: pendientes.value.length },
])

const tono: Record<EstadoComprobante, TonoMesa> = {
  porEnviar: 'laton',
  enviado: 'pizarra',
  aceptado: 'verde',
  rechazado: 'vino',
  observado: 'laton',
}

const porEnviar = computed(() =>
  comprobantes.value.filter((c) => c.estado === 'porEnviar' || c.estado === 'rechazado'),
)

const columnas: ColumnaTabla[] = [
  { clave: 'documento', etiqueta: 'Comprobante' },
  { clave: 'receptor', etiqueta: 'Cliente' },
  { clave: 'estado', etiqueta: 'Estado' },
  { clave: 'total', etiqueta: 'Total', clase: 'text-right' },
  { clave: 'acciones', etiqueta: '', clase: 'w-64 text-right' },
]

const original = (c: Comprobante) => comprobantes.value.find((x) => x.id === c.referenciaId)

// ── Emitir ───────────────────────────────────────────────────────────────────

const emitiendo = shallowRef<Venta | null>(null)
const tipo = ref<TipoComprobante>('boleta')
const tipoDocumento = ref<TipoDocumento>('dni')
const documento = ref('')
const nombre = ref('')
const direccion = ref('')
const guardando = ref(false)
const errores = ref<Record<string, string>>({})

const opcionesTipo: OpcionSelect[] = [
  { valor: 'boleta', etiqueta: 'Boleta' },
  { valor: 'factura', etiqueta: 'Factura' },
]
const opcionesDocumento: OpcionSelect[] = [
  { valor: 'dni', etiqueta: 'DNI' },
  { valor: 'ruc', etiqueta: 'RUC' },
  { valor: 'ce', etiqueta: 'Carné de extranjería' },
  { valor: 'pasaporte', etiqueta: 'Pasaporte' },
]

function abrirEmision(venta: Venta) {
  emitiendo.value = venta
  errores.value = {}
  tipo.value = localStore.localId
    ? valorConfig<TipoComprobante>('comprobantes.tipoPorDefecto', localStore.localId)
    : 'boleta'
  tipoDocumento.value = tipo.value === 'factura' ? 'ruc' : 'dni'
  documento.value = ''
  nombre.value = ''
  direccion.value = ''
}

watch(tipo, (t) => {
  if (t === 'factura') tipoDocumento.value = 'ruc'
})

function receptorActual(): ReceptorComprobante | undefined {
  if (!documento.value.trim() && !nombre.value.trim()) return undefined
  return {
    tipoDocumento: tipoDocumento.value,
    documento: documento.value.trim(),
    nombre: nombre.value.trim(),
    direccion: direccion.value.trim() || undefined,
  }
}

async function emitir() {
  if (!emitiendo.value) return
  guardando.value = true
  errores.value = {}
  try {
    const comprobante = await comprobantesService.emitir(
      { ventaId: emitiendo.value.id, tipo: tipo.value, receptor: receptorActual() },
      auth.usuario?.id,
    )
    ui.exito(
      `${etiquetaTipoComprobante[tipo.value]} ${comprobante.serie}-${comprobante.numero} emitida.`,
    )
    emitiendo.value = null
    await cargar()
  } catch (e) {
    const error = e as ApiError
    errores.value = error.campos ?? {}
    ui.error(error.mensaje ?? 'No se pudo emitir.')
  } finally {
    guardando.value = false
  }
}

async function enviar(c: Comprobante) {
  try {
    const enviado = await comprobantesService.enviar(c.id, auth.usuario?.id)
    if (enviado.estado === 'aceptado') ui.exito(`${c.serie}-${c.numero} aceptada.`)
    else ui.error(`${c.serie}-${c.numero}: ${enviado.respuesta?.mensaje}`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo enviar.')
  }
}

async function enviarTodos() {
  for (const c of porEnviar.value) await enviar(c)
}

// ── Corregir ─────────────────────────────────────────────────────────────────

const corrigiendo = shallowRef<Comprobante | null>(null)

function abrirCorreccion(c: Comprobante) {
  corrigiendo.value = c
  errores.value = {}
  tipoDocumento.value = c.receptor.tipoDocumento ?? 'dni'
  documento.value = c.receptor.documento ?? ''
  nombre.value = c.receptor.nombre ?? ''
  direccion.value = c.receptor.direccion ?? ''
}

async function corregir() {
  if (!corrigiendo.value) return
  try {
    await comprobantesService.corregirReceptor(
      corrigiendo.value.id,
      {
        tipoDocumento: tipoDocumento.value,
        documento: documento.value.trim(),
        nombre: nombre.value.trim(),
        direccion: direccion.value.trim() || undefined,
      },
      auth.usuario?.id,
    )
    ui.exito('Datos corregidos: se puede reintentar el envío.')
    corrigiendo.value = null
    await cargar()
  } catch (e) {
    const error = e as ApiError
    errores.value = error.campos ?? {}
    ui.error(error.mensaje ?? 'No se pudo corregir.')
  }
}

// ── Nota de crédito ──────────────────────────────────────────────────────────

const anulando = shallowRef<Comprobante | null>(null)
const motivo = ref<MotivoNotaCredito>('anulacion')
const detalleMotivo = ref('')
const parcial = ref(false)
const montoParcial = ref(0)

const motivos: MotivoNotaCredito[] = [
  'anulacion',
  'devolucion',
  'descuento',
  'errorDescripcion',
  'errorRuc',
]
const opcionesMotivo = computed<OpcionSelect[]>(() =>
  motivos.map((m) => ({ valor: m, etiqueta: etiquetaMotivoNota[m] })),
)

function abrirNota(c: Comprobante) {
  anulando.value = c
  motivo.value = 'anulacion'
  detalleMotivo.value = ''
  parcial.value = false
  montoParcial.value = c.totales.total
  errores.value = {}
}

async function emitirNota() {
  if (!anulando.value) return
  try {
    const nota = await comprobantesService.emitirNotaCredito(
      anulando.value.id,
      {
        motivo: motivo.value,
        detalle: detalleMotivo.value,
        montoParcial: parcial.value ? montoParcial.value : undefined,
      },
      auth.usuario?.id,
    )
    ui.exito(`Nota de crédito ${nota.serie}-${nota.numero} emitida.`)
    anulando.value = null
    await cargar()
  } catch (e) {
    const error = e as ApiError
    errores.value = error.campos ?? {}
    ui.error(error.mensaje ?? 'No se pudo emitir la nota de crédito.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <p class="rs-etiqueta text-laton-texto">Documentos de la venta</p>
          <h2 class="rs-titulo-seccion mt-1 text-tinta">Comprobantes electrónicos</h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            La caja cobra y deja su nota de venta; aquí se convierte en boleta o factura. Anular no
            borra nada: se emite una nota de crédito con su motivo.
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <KmBadge tono="pizarra">Envío simulado, sin integración todavía</KmBadge>
            <KmBadge v-if="emisionAutomatica" tono="neutro"
              >La caja propone emitir al cobrar</KmBadge
            >
          </div>
        </div>
        <KmButton :disabled="!puedeEmitir || !porEnviar.length" @click="enviarTodos">
          Enviar pendientes {{ porEnviar.length ? `(${porEnviar.length})` : '' }}
        </KmButton>
      </div>

      <div class="px-6 pt-4 pb-6">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Comprobantes">
          <KmTable
            v-if="pestana === 'emitidos'"
            :columnas="columnas"
            :filas="comprobantes"
            :cargando="cargando"
            mensaje-vacio="Todavía no se ha emitido ningún comprobante en este local."
          >
            <template #col-documento="{ fila }">
              <div class="flex flex-col gap-0.5">
                <span class="font-semibold text-tinta tabular-nums">
                  {{ fila.serie }}-{{ fila.numero }}
                </span>
                <span class="text-xs text-tenue">
                  {{ etiquetaTipoComprobante[fila.tipo] }} · {{ formatearHora(fila.fecha) }}
                </span>
                <span v-if="fila.referenciaId" class="text-xs text-tenue">
                  Sobre {{ original(fila)?.serie }}-{{ original(fila)?.numero }} ·
                  {{ fila.motivoNota ? etiquetaMotivoNota[fila.motivoNota] : '' }}
                </span>
              </div>
            </template>
            <template #col-receptor="{ fila }">
              <div class="flex flex-col gap-0.5 text-sm">
                <span class="text-tinta">{{
                  fila.receptor.nombre ?? 'Cliente sin identificar'
                }}</span>
                <span v-if="fila.receptor.documento" class="text-xs text-tenue tabular-nums">
                  {{ fila.receptor.tipoDocumento?.toUpperCase() }} {{ fila.receptor.documento }}
                </span>
              </div>
            </template>
            <template #col-estado="{ fila }">
              <div class="flex flex-col gap-1">
                <KmBadge :tono="tono[fila.estado]" punto>
                  {{ etiquetaEstadoComprobante[fila.estado] }}
                </KmBadge>
                <span v-if="fila.respuesta" class="text-xs text-tenue">
                  {{ fila.respuesta.codigo }} · {{ fila.respuesta.mensaje }}
                </span>
                <span v-if="fila.intentos > 1" class="text-xs text-tenue">
                  {{ fila.intentos }} intentos
                </span>
              </div>
            </template>
            <template #col-total="{ fila }">
              <span class="tabular-nums">{{ formatearSoles(fila.totales.total) }}</span>
            </template>
            <template #col-acciones="{ fila }">
              <div class="flex flex-wrap justify-end gap-1.5">
                <KmButton
                  v-if="fila.estado !== 'aceptado'"
                  tamano="sm"
                  variante="secundario"
                  :disabled="!puedeEmitir"
                  @click="enviar(fila)"
                >
                  {{ fila.estado === 'rechazado' ? 'Reintentar' : 'Enviar' }}
                </KmButton>
                <KmButton
                  v-if="fila.estado === 'rechazado' || fila.estado === 'observado'"
                  tamano="sm"
                  variante="secundario"
                  :disabled="!puedeEmitir"
                  @click="abrirCorreccion(fila)"
                >
                  Corregir
                </KmButton>
                <KmButton
                  v-if="fila.estado === 'aceptado' && fila.tipo !== 'notaCredito'"
                  tamano="sm"
                  variante="secundario"
                  :disabled="!puedeAnular"
                  @click="abrirNota(fila)"
                >
                  Nota de crédito
                </KmButton>
              </div>
            </template>
          </KmTable>

          <div v-else class="flex flex-col gap-3">
            <p class="text-sm text-tenue">
              Ventas cobradas que todavía no tienen comprobante. Con una nota de venta no basta:
              quien pide factura la pide aquí.
            </p>
            <ul class="flex flex-col divide-y divide-linea">
              <li
                v-for="v in pendientes"
                :key="v.id"
                class="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div class="flex flex-col gap-0.5 text-sm">
                  <span class="font-semibold text-tinta tabular-nums">
                    {{ v.comprobante.serie }}-{{ v.comprobante.numero }}
                  </span>
                  <span class="text-xs text-tenue">
                    Nota de venta · {{ formatearHora(v.fecha) }} ·
                    {{ formatearSoles(v.totales.total) }}
                  </span>
                </div>
                <KmButton tamano="sm" :disabled="!puedeEmitir" @click="abrirEmision(v)">
                  Emitir
                </KmButton>
              </li>
              <li v-if="!pendientes.length" class="py-6 text-center text-sm text-tenue">
                Todas las ventas cobradas tienen su comprobante.
              </li>
            </ul>
          </div>
        </KmTabs>
      </div>
    </KmCard>

    <!-- ── Emitir ── -->
    <KmDrawer
      :model-value="Boolean(emitiendo)"
      titulo="Emitir comprobante"
      :subtitulo="emitiendo ? `Venta de ${formatearSoles(emitiendo.totales.total)}` : ''"
      @update:model-value="emitiendo = null"
    >
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Tipo" requerido>
          <KmSelect :id="id" v-model="tipo" :opciones="opcionesTipo" />
        </KmField>
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Documento">
            <KmSelect
              :id="id"
              v-model="tipoDocumento"
              :opciones="opcionesDocumento"
              :disabled="tipo === 'factura'"
            />
          </KmField>
          <KmField v-slot="{ id }" label="Número" :error="errores.documento">
            <KmInput :id="id" v-model="documento" placeholder="20100070970" />
          </KmField>
        </div>
        <KmField
          v-slot="{ id }"
          :label="tipo === 'factura' ? 'Razón social' : 'Nombre'"
          :error="errores.nombre"
        >
          <KmInput :id="id" v-model="nombre" placeholder="A nombre de quién" />
        </KmField>
        <KmField
          v-if="tipo === 'factura'"
          v-slot="{ id }"
          label="Dirección fiscal"
          requerido
          :error="errores.direccion"
        >
          <KmInput :id="id" v-model="direccion" placeholder="Av. Javier Prado 1234" />
        </KmField>
        <p class="text-xs text-tenue">
          La factura se emite a un RUC válido. La boleta pide el documento del cliente por encima
          del importe configurado.
        </p>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="emitiendo = null">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="emitir">Emitir</KmButton>
      </template>
    </KmDrawer>

    <!-- ── Corregir ── -->
    <KmModal
      :model-value="Boolean(corrigiendo)"
      titulo="Corregir los datos del comprobante"
      @update:model-value="corrigiendo = null"
    >
      <p class="text-sm text-tenue">
        {{ corrigiendo?.respuesta?.codigo }} · {{ corrigiendo?.respuesta?.mensaje }}
      </p>
      <div class="mt-4 flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Documento">
            <KmSelect :id="id" v-model="tipoDocumento" :opciones="opcionesDocumento" />
          </KmField>
          <KmField v-slot="{ id }" label="Número" :error="errores.documento">
            <KmInput :id="id" v-model="documento" />
          </KmField>
        </div>
        <KmField v-slot="{ id }" label="Nombre o razón social" :error="errores.nombre">
          <KmInput :id="id" v-model="nombre" />
        </KmField>
        <KmField v-slot="{ id }" label="Dirección" :error="errores.direccion">
          <KmInput :id="id" v-model="direccion" />
        </KmField>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="corrigiendo = null">Cancelar</KmButton>
        <KmButton @click="corregir">Guardar y reintentar después</KmButton>
      </template>
    </KmModal>

    <!-- ── Nota de crédito ── -->
    <KmModal
      :model-value="Boolean(anulando)"
      titulo="Emitir nota de crédito"
      :subtitulo="anulando ? `Sobre ${anulando.serie}-${anulando.numero}` : ''"
      @update:model-value="anulando = null"
    >
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Motivo" requerido>
          <KmSelect :id="id" v-model="motivo" :opciones="opcionesMotivo" />
        </KmField>
        <KmField v-slot="{ id }" label="Detalle">
          <KmInput :id="id" v-model="detalleMotivo" placeholder="Qué pasó, en una línea" />
        </KmField>
        <KmSwitch
          v-model="parcial"
          etiqueta="Solo una parte"
          descripcion="Rebaja el importe indicado y deja la venta en pie."
        />
        <KmField v-if="parcial" v-slot="{ id }" label="Monto" :error="errores.montoParcial">
          <KmNumero :id="id" v-model="montoParcial" prefijo="S/" :decimales="2" :min="0" />
        </KmField>
        <p v-else class="text-xs text-laton-texto">
          La nota total anula la venta y devuelve al almacén lo que se consumió.
        </p>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="anulando = null">Cancelar</KmButton>
        <KmButton variante="peligro" @click="emitirNota">Emitir nota</KmButton>
      </template>
    </KmModal>
  </div>
</template>
