<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { cajaService } from '@/services/caja.service'
import { consumoService, etiquetaMomento } from '@/services/consumo.service'
import { canalesService, mediosPagoService } from '@/services/comercial.service'
import { mesasService } from '@/services/mesas.service'
import { tienePermiso, valorConfig } from '@/services/parametros.service'
import { vendibles as listarVendibles } from '@/services/precios.service'
import { etiquetaAtencion, ventasService } from '@/services/ventas.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  CanalVenta,
  Comanda,
  LineaPedido,
  Mesa,
  MedioPago,
  Pago,
  Pedido,
  ProductoVendible,
  SesionCaja,
  TotalesPedido,
} from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { formatearSoles } from '@/utils/formato'

/**
 * Caja (F7, D-012). La cuenta se abre antes de cobrar y vive mientras se come:
 * se le añaden productos, se comanda a las áreas, se divide o se mueve de mesa,
 * y al final se cobra con uno o varios medios de pago.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()

const pedidos = shallowRef<Pedido[]>([])
const canales = shallowRef<CanalVenta[]>([])
const medios = shallowRef<MedioPago[]>([])
const mesas = shallowRef<Mesa[]>([])
const vendibles = shallowRef<ProductoVendible[]>([])
const comandas = shallowRef<Comanda[]>([])
const sesion = shallowRef<SesionCaja | null>(null)
const seleccionado = ref<string | null>(null)
const cuenta = shallowRef<TotalesPedido | null>(null)
const cargando = ref(false)

const puedeTomar = computed(() => tienePermiso(auth.usuario?.id, 'ventas.tomarPedido'))
const puedeCobrar = computed(() => tienePermiso(auth.usuario?.id, 'ventas.cobrar'))

const pedido = computed(() => pedidos.value.find((p) => p.id === seleccionado.value) ?? null)
const lineasVivas = computed(() => pedido.value?.lineas.filter((l) => l.estado !== 'anulada') ?? [])
const pendientes = computed(() => lineasVivas.value.filter((l) => l.estado === 'pendiente'))

async function cargar() {
  if (!localStore.localId) return
  cargando.value = true
  try {
    const [ps, cs, ms, mss, ses] = await Promise.all([
      ventasService.listar({ localId: localStore.localId, estado: 'abierto' }),
      canalesService.todos(),
      mediosPagoService.todos(),
      mesasService.listar(),
      cajaService.sesionDe(localStore.localId),
    ])
    pedidos.value = ps
    canales.value = cs
    medios.value = ms
    mesas.value = mss
    sesion.value = ses
    vendibles.value = listarVendibles()
    if (!ps.some((p) => p.id === seleccionado.value)) seleccionado.value = ps[0]?.id ?? null
    await refrescarCuenta()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar las cuentas.')
  } finally {
    cargando.value = false
  }
}
watch(() => localStore.localId, cargar, { immediate: true })

async function refrescarCuenta() {
  if (!seleccionado.value) {
    cuenta.value = null
    comandas.value = []
    return
  }
  const [totales, cms] = await Promise.all([
    ventasService.precuenta(seleccionado.value),
    ventasService.comandasDe(seleccionado.value),
  ])
  cuenta.value = totales
  comandas.value = cms
}
watch(seleccionado, refrescarCuenta)

const nombreCanal = (id: string) => canales.value.find((c) => c.id === id)?.nombre ?? id
const codigoMesa = (id: string) => mesas.value.find((m) => m.id === id)?.codigo ?? id
const mesasDe = (p: Pedido) => p.mesaIds.map(codigoMesa).join(', ')
const importe = (l: LineaPedido) => (l.precioUnitario + l.recargoModificadores) * l.cantidad

const opcionesVendible = computed<OpcionSelect[]>(() =>
  vendibles.value
    .filter((v) => v.activo)
    .map((v) => ({ valor: v.id, etiqueta: `${v.nombre} · ${formatearSoles(v.precioReferencia)}` })),
)
const opcionesCanal = computed<OpcionSelect[]>(() =>
  canales.value.filter((c) => c.activo).map((c) => ({ valor: c.id, etiqueta: c.nombre })),
)
const opcionesMesa = computed<OpcionSelect[]>(() =>
  mesas.value
    .filter(
      (m) =>
        m.estado !== 'inactiva' &&
        !pedidos.value.some((p) => p.id !== seleccionado.value && p.mesaIds.includes(m.id)),
    )
    .map((m) => ({ valor: m.id, etiqueta: `${m.codigo} · ${m.capacidad} personas` })),
)

// ── Abrir cuenta ─────────────────────────────────────────────────────────────

const abriendo = ref(false)
const nuevoCanal = ref('cv1')
const nuevaMesa = ref('')
const nuevoNombre = ref('')
const nuevoDistrito = ref('')
const nuevaDireccion = ref('')
const comensales = ref(2)
const guardando = ref(false)

const tipoNuevoCanal = computed(() => canales.value.find((c) => c.id === nuevoCanal.value)?.tipo)

async function abrirCuenta() {
  if (!localStore.localId) return
  guardando.value = true
  try {
    const creado = await ventasService.abrir(
      {
        localId: localStore.localId,
        canalId: nuevoCanal.value,
        mesaIds: nuevaMesa.value ? [nuevaMesa.value] : [],
        nombreCliente: nuevoNombre.value,
        direccion: nuevaDireccion.value,
        distrito: nuevoDistrito.value,
        comensales: comensales.value,
      },
      auth.usuario?.id,
    )
    ui.exito(`Cuenta ${creado.numero} abierta.`)
    abriendo.value = false
    nuevaMesa.value = ''
    nuevoNombre.value = ''
    await cargar()
    seleccionado.value = creado.id
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo abrir la cuenta.')
  } finally {
    guardando.value = false
  }
}

// ── Líneas ───────────────────────────────────────────────────────────────────

const nuevoVendible = ref('')
const nuevaCantidad = ref(1)
const nuevaNota = ref('')

async function agregar() {
  if (!pedido.value || !nuevoVendible.value) return
  try {
    await ventasService.agregarLinea(
      pedido.value.id,
      { vendibleId: nuevoVendible.value, cantidad: nuevaCantidad.value, nota: nuevaNota.value },
      auth.usuario?.id,
    )
    nuevoVendible.value = ''
    nuevaCantidad.value = 1
    nuevaNota.value = ''
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo añadir el producto.')
  }
}

/** Quitar lo comandado pide motivo: ya se gastó el insumo. */
const anulando = shallowRef<LineaPedido | null>(null)
const motivoAnulacion = ref('')

async function quitar(linea: LineaPedido) {
  if (linea.estado === 'comandada') {
    anulando.value = linea
    motivoAnulacion.value = ''
    return
  }
  try {
    await ventasService.quitarLinea(pedido.value!.id, linea.id, auth.usuario?.id)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo quitar el producto.')
  }
}

async function confirmarAnulacion() {
  if (!anulando.value) return
  try {
    await ventasService.quitarLinea(
      pedido.value!.id,
      anulando.value.id,
      auth.usuario?.id,
      motivoAnulacion.value,
    )
    ui.exito('Producto anulado y anotado en la bitácora.')
    anulando.value = null
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo anular.')
  }
}

async function comandar() {
  try {
    const nuevas = await ventasService.comandar(pedido.value!.id, auth.usuario?.id)
    ui.exito(
      `${nuevas.length} comanda(s) enviada(s): ${nuevas.map((c) => c.areaNombre).join(', ')}.`,
    )
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo comandar.')
  }
}

// ── Mover y dividir ──────────────────────────────────────────────────────────

const moviendo = ref(false)
const mesaDestino = ref('')

async function mover() {
  try {
    await ventasService.transferirMesa(pedido.value!.id, [mesaDestino.value], auth.usuario?.id)
    ui.exito('Cuenta movida de mesa.')
    moviendo.value = false
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo mover la cuenta.')
  }
}

const dividiendo = ref(false)
const paraDividir = ref<string[]>([])

function alternarDivision(id: string) {
  paraDividir.value = paraDividir.value.includes(id)
    ? paraDividir.value.filter((x) => x !== id)
    : [...paraDividir.value, id]
}

async function dividir() {
  try {
    const hija = await ventasService.dividir(pedido.value!.id, paraDividir.value, auth.usuario?.id)
    ui.exito(`Cuenta ${hija.numero} separada: se cobra aparte.`)
    dividiendo.value = false
    paraDividir.value = []
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo dividir la cuenta.')
  }
}

// ── Cobro ────────────────────────────────────────────────────────────────────

const cobrando = ref(false)
const propina = ref(0)
const pagos = ref<{ medioPagoId: string; monto: number; referencia: string }[]>([])
const cobrandoAhora = ref(false)

/** Lo que saldrá del almacén por esta cuenta, y cuándo sale. */
const momento = computed(() =>
  localStore.localId ? consumoService.momentoDescuento(localStore.localId) : 'no',
)
const consumoPrevisto = computed(() =>
  pedido.value && momento.value !== 'no' ? consumoService.consumoPendiente(pedido.value) : [],
)
const productosSinReceta = computed(() =>
  pedido.value && momento.value !== 'no' ? consumoService.sinReceta(pedido.value) : [],
)

const propinaSugerida = computed(() =>
  localStore.localId ? valorConfig<number>('ventas.propinaSugerida', localStore.localId) : 0,
)
const aCobrar = computed(() => (cuenta.value?.total ?? 0) + propina.value)
const cubierto = computed(() => pagos.value.reduce((s, p) => s + p.monto, 0))
const falta = computed(() => Math.max(0, Math.round((aCobrar.value - cubierto.value) * 100) / 100))
const vuelto = computed(() => Math.max(0, Math.round((cubierto.value - aCobrar.value) * 100) / 100))
const opcionesMedio = computed<OpcionSelect[]>(() =>
  medios.value.filter((m) => m.activo).map((m) => ({ valor: m.id, etiqueta: m.nombre })),
)
const pideReferencia = (id: string) =>
  medios.value.find((m) => m.id === id)?.requiereReferencia ?? false

function abrirCobro() {
  propina.value =
    Math.round((((cuenta.value?.total ?? 0) * propinaSugerida.value) / 100) * 100) / 100
  pagos.value = [
    { medioPagoId: medios.value.find((m) => m.activo)?.id ?? '', monto: 0, referencia: '' },
  ]
  pagos.value[0]!.monto = Math.round(aCobrar.value * 100) / 100
  cobrando.value = true
}

const agregarPago = () =>
  (pagos.value = [...pagos.value, { medioPagoId: '', monto: falta.value, referencia: '' }])
const quitarPago = (i: number) => (pagos.value = pagos.value.filter((_, idx) => idx !== i))

async function cobrar() {
  cobrandoAhora.value = true
  try {
    const venta = await ventasService.cobrar(
      pedido.value!.id,
      {
        pagos: pagos.value.map((p) => ({
          medioPagoId: p.medioPagoId,
          nombre: '',
          monto: p.monto,
          referencia: p.referencia || undefined,
        })) as Pago[],
        propina: propina.value,
      },
      auth.usuario?.id,
    )
    ui.exito(
      `Cobrado ${formatearSoles(venta.totales.total + venta.propina)} · ${venta.comprobante.serie}-${venta.comprobante.numero}${venta.vuelto ? ` · vuelto ${formatearSoles(venta.vuelto)}` : ''}`,
    )
    cobrando.value = false
    seleccionado.value = null
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cobrar.')
  } finally {
    cobrandoAhora.value = false
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 py-5">
        <div>
          <p class="rs-etiqueta text-laton-texto">Servicio en marcha</p>
          <h2 class="rs-titulo-seccion mt-1 text-tinta">Cuentas abiertas</h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            La cuenta vive mientras se come: se le añade, se comanda a las áreas y se cobra al
            final. El comprobante nace al cobrar, no antes.
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <KmBadge :tono="sesion ? 'verde' : 'vino'" punto>
              {{
                sesion
                  ? `Caja abierta · fondo ${formatearSoles(sesion.fondoInicial)}`
                  : 'Caja cerrada'
              }}
            </KmBadge>
            <KmBadge tono="neutro">Stock: {{ etiquetaMomento[momento].toLowerCase() }}</KmBadge>
            <RouterLink
              :to="{ name: 'caja-arqueo' }"
              class="text-xs font-semibold text-verde hover:underline"
            >
              Ir al arqueo
            </RouterLink>
          </div>
        </div>
        <KmButton :disabled="!puedeTomar" @click="abriendo = true">Abrir cuenta</KmButton>
      </div>
    </KmCard>

    <div class="grid gap-5 xl:grid-cols-[22rem_1fr]">
      <!-- ── Lista de cuentas ── -->
      <KmCard sin-padding>
        <ul class="flex flex-col">
          <li v-for="p in pedidos" :key="p.id">
            <button
              type="button"
              class="flex w-full flex-col gap-1 border-b border-linea px-5 py-4 text-left transition-colors last:border-0 hover:bg-seleccion"
              :class="p.id === seleccionado ? 'bg-seleccion' : ''"
              @click="seleccionado = p.id"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-tinta tabular-nums">Cuenta {{ p.numero }}</span>
                <KmBadge tono="pizarra">{{ etiquetaAtencion[p.atencion] }}</KmBadge>
              </div>
              <span class="text-xs text-tenue">
                {{ p.mesaIds.length ? mesasDe(p) : (p.nombreCliente ?? nombreCanal(p.canalId)) }}
                · {{ p.lineas.filter((l) => l.estado !== 'anulada').length }} producto(s)
              </span>
              <span
                v-if="p.lineas.some((l) => l.estado === 'pendiente')"
                class="text-xs font-semibold text-laton-texto"
              >
                Sin comandar
              </span>
            </button>
          </li>
          <li v-if="!pedidos.length && !cargando" class="px-5 py-8 text-center text-sm text-tenue">
            No hay cuentas abiertas en este local.
          </li>
        </ul>
      </KmCard>

      <!-- ── Detalle de la cuenta ── -->
      <KmCard v-if="pedido" sin-padding>
        <div
          class="flex flex-wrap items-start justify-between gap-3 border-b border-linea px-6 py-4"
        >
          <div>
            <h3 class="rs-titulo-seccion text-tinta">Cuenta {{ pedido.numero }}</h3>
            <p class="text-sm text-tenue">
              {{ etiquetaAtencion[pedido.atencion] }} ·
              {{ pedido.mesaIds.length ? mesasDe(pedido) : nombreCanal(pedido.canalId) }}
              <template v-if="pedido.comensales"> · {{ pedido.comensales }} comensales</template>
              <template v-if="pedido.distrito"> · {{ pedido.distrito }}</template>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <KmButton
              v-if="pedido.atencion === 'mesa'"
              variante="secundario"
              :disabled="!puedeTomar"
              @click="((mesaDestino = ''), (moviendo = true))"
            >
              Mover de mesa
            </KmButton>
            <KmButton
              variante="secundario"
              :disabled="!puedeTomar || lineasVivas.length < 2"
              @click="((paraDividir = []), (dividiendo = true))"
            >
              Dividir
            </KmButton>
            <KmButton :disabled="!puedeTomar || !pendientes.length" @click="comandar">
              Comandar {{ pendientes.length ? `(${pendientes.length})` : '' }}
            </KmButton>
            <KmButton
              :disabled="!puedeCobrar || !lineasVivas.length || pendientes.length > 0"
              @click="abrirCobro"
            >
              Cobrar
            </KmButton>
          </div>
        </div>

        <div class="flex flex-col gap-4 px-6 py-5">
          <!-- Añadir producto -->
          <div class="flex flex-wrap items-end gap-2 rounded-card border border-linea p-4">
            <KmField v-slot="{ id }" label="Producto">
              <KmSelect
                :id="id"
                v-model="nuevoVendible"
                :opciones="opcionesVendible"
                placeholder="Elige de la carta"
              />
            </KmField>
            <KmField v-slot="{ id }" label="Cantidad">
              <KmNumero :id="id" v-model="nuevaCantidad" :min="1" :decimales="0" controles />
            </KmField>
            <KmField v-slot="{ id }" label="Nota">
              <KmInput :id="id" v-model="nuevaNota" placeholder="Sin cebolla, término medio…" />
            </KmField>
            <KmButton :disabled="!puedeTomar || !nuevoVendible" @click="agregar">Añadir</KmButton>
          </div>

          <!-- Líneas -->
          <ul class="flex flex-col divide-y divide-linea">
            <li
              v-for="l in pedido.lineas"
              :key="l.id"
              class="flex items-start justify-between gap-3 py-2.5"
              :class="l.estado === 'anulada' ? 'opacity-50' : ''"
            >
              <div class="flex flex-col gap-0.5">
                <span class="text-sm text-tinta">
                  <span class="font-semibold tabular-nums">{{ l.cantidad }}×</span> {{ l.nombre }}
                </span>
                <span v-if="l.nota" class="text-xs text-tenue">{{ l.nota }}</span>
                <span v-if="l.motivoAnulacion" class="text-xs text-vino-texto">
                  Anulada: {{ l.motivoAnulacion }}
                </span>
                <div class="flex flex-wrap gap-1.5">
                  <KmBadge
                    :tono="
                      l.estado === 'comandada' ? 'verde' : l.estado === 'anulada' ? 'vino' : 'laton'
                    "
                  >
                    {{
                      l.estado === 'comandada'
                        ? 'En cocina'
                        : l.estado === 'anulada'
                          ? 'Anulada'
                          : 'Sin comandar'
                    }}
                  </KmBadge>
                  <KmBadge v-if="l.recargoModificadores" tono="neutro">
                    + {{ formatearSoles(l.recargoModificadores) }} modificadores
                  </KmBadge>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-tinta tabular-nums">{{
                  formatearSoles(importe(l))
                }}</span>
                <KmBotonIcono
                  v-if="l.estado !== 'anulada'"
                  icono="eliminar"
                  tono="peligro"
                  :etiqueta="l.estado === 'comandada' ? 'Anular' : 'Quitar'"
                  :contexto="l.nombre"
                  :disabled="!puedeTomar"
                  @click="quitar(l)"
                />
              </div>
            </li>
          </ul>

          <!-- Totales -->
          <dl
            v-if="cuenta"
            class="flex flex-col gap-1.5 rounded-card border border-linea p-4 text-sm tabular-nums"
          >
            <div class="flex justify-between">
              <dt class="text-tenue">Consumo</dt>
              <dd class="text-tinta">{{ formatearSoles(cuenta.subtotal) }}</dd>
            </div>
            <div v-if="cuenta.descuentoPromociones" class="flex justify-between">
              <dt class="text-tenue">
                Promociones
                <span class="text-xs"
                  >({{ cuenta.promociones.map((p) => p.nombre).join(', ') }})</span
                >
              </dt>
              <dd class="text-verde">− {{ formatearSoles(cuenta.descuentoPromociones) }}</dd>
            </div>
            <div v-if="cuenta.costoEnvio" class="flex justify-between">
              <dt class="text-tenue">Envío</dt>
              <dd class="text-tinta">{{ formatearSoles(cuenta.costoEnvio) }}</dd>
            </div>
            <div v-if="cuenta.descuentoEnvio" class="flex justify-between">
              <dt class="text-tenue">Envío perdonado</dt>
              <dd class="text-verde">− {{ formatearSoles(cuenta.descuentoEnvio) }}</dd>
            </div>
            <div v-if="cuenta.recargoConsumo" class="flex justify-between">
              <dt class="text-tenue">Recargo al consumo ({{ cuenta.recargoPorcentaje }} %)</dt>
              <dd class="text-tinta">{{ formatearSoles(cuenta.recargoConsumo) }}</dd>
            </div>
            <div class="mt-1 flex justify-between border-t border-linea pt-2">
              <dt class="font-semibold text-tinta">Total</dt>
              <dd class="font-semibold text-tinta">{{ formatearSoles(cuenta.total) }}</dd>
            </div>
            <p class="text-xs text-tenue">
              Incluye IGV {{ formatearSoles(cuenta.igv) }} · valor de venta
              {{ formatearSoles(cuenta.valorVenta) }}
            </p>
          </dl>

          <div v-if="comandas.length" class="text-xs text-tenue">
            Comandas: {{ comandas.map((c) => `#${c.numero} ${c.areaNombre}`).join(' · ') }}
          </div>
        </div>
      </KmCard>
      <KmCard v-else>
        <p class="py-8 text-center text-sm text-tenue">Elige una cuenta para verla.</p>
      </KmCard>
    </div>

    <!-- ── Abrir cuenta ── -->
    <KmDrawer v-model="abriendo" titulo="Abrir cuenta" subtitulo="La modalidad sale del canal">
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Canal" requerido>
          <KmSelect :id="id" v-model="nuevoCanal" :opciones="opcionesCanal" />
        </KmField>
        <KmField v-if="tipoNuevoCanal === 'salon'" v-slot="{ id }" label="Mesa" requerido>
          <KmSelect
            :id="id"
            v-model="nuevaMesa"
            :opciones="opcionesMesa"
            placeholder="Elige la mesa"
          />
        </KmField>
        <KmField v-if="tipoNuevoCanal === 'salon'" v-slot="{ id }" label="Comensales">
          <KmNumero :id="id" v-model="comensales" :min="1" :decimales="0" controles />
        </KmField>
        <KmField v-slot="{ id }" label="A nombre de">
          <KmInput :id="id" v-model="nuevoNombre" placeholder="Quien recoge o recibe" />
        </KmField>
        <template v-if="tipoNuevoCanal === 'delivery' || tipoNuevoCanal === 'plataforma'">
          <KmField v-slot="{ id }" label="Dirección">
            <KmInput :id="id" v-model="nuevaDireccion" placeholder="Calle, número, referencia" />
          </KmField>
          <KmField v-slot="{ id }" label="Distrito" requerido>
            <KmInput :id="id" v-model="nuevoDistrito" placeholder="Miraflores" />
          </KmField>
        </template>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abriendo = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="abrirCuenta">Abrir</KmButton>
      </template>
    </KmDrawer>

    <!-- ── Anular línea ── -->
    <KmModal
      :model-value="Boolean(anulando)"
      titulo="Anular un producto en cocina"
      @update:model-value="anulando = null"
    >
      <p class="text-sm text-tenue">
        «{{ anulando?.nombre }}» ya salió a su área: el insumo se gastó. La anulación queda en la
        bitácora con tu nombre.
      </p>
      <KmField v-slot="{ id }" label="Motivo" requerido class="mt-4">
        <KmInput
          :id="id"
          v-model="motivoAnulacion"
          placeholder="Al cliente no le gustó, se cayó…"
        />
      </KmField>
      <template #footer>
        <KmButton variante="secundario" @click="anulando = null">Cancelar</KmButton>
        <KmButton variante="peligro" @click="confirmarAnulacion">Anular</KmButton>
      </template>
    </KmModal>

    <!-- ── Mover de mesa ── -->
    <KmModal v-model="moviendo" titulo="Mover la cuenta de mesa">
      <KmField v-slot="{ id }" label="Mesa destino" requerido>
        <KmSelect
          :id="id"
          v-model="mesaDestino"
          :opciones="opcionesMesa"
          placeholder="Elige la mesa"
        />
      </KmField>
      <template #footer>
        <KmButton variante="secundario" @click="moviendo = false">Cancelar</KmButton>
        <KmButton :disabled="!mesaDestino" @click="mover">Mover</KmButton>
      </template>
    </KmModal>

    <!-- ── Dividir ── -->
    <KmModal v-model="dividiendo" titulo="Dividir la cuenta">
      <p class="text-sm text-tenue">
        Lo que marques se va a una cuenta nueva que se cobra aparte. Se reparten líneas enteras.
      </p>
      <ul class="mt-4 flex flex-col divide-y divide-linea">
        <li v-for="l in lineasVivas" :key="l.id" class="py-2">
          <label class="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="paraDividir.includes(l.id)"
                @change="alternarDivision(l.id)"
              />
              <span class="text-tinta">{{ l.cantidad }}× {{ l.nombre }}</span>
            </span>
            <span class="text-tenue tabular-nums">{{ formatearSoles(importe(l)) }}</span>
          </label>
        </li>
      </ul>
      <template #footer>
        <KmButton variante="secundario" @click="dividiendo = false">Cancelar</KmButton>
        <KmButton :disabled="!paraDividir.length" @click="dividir">Separar</KmButton>
      </template>
    </KmModal>

    <!-- ── Cobro ── -->
    <KmDrawer
      v-model="cobrando"
      titulo="Cobrar"
      :subtitulo="`Cuenta ${pedido?.numero ?? ''}`"
      ancho="lg"
    >
      <div class="flex flex-col gap-4">
        <dl class="flex flex-col gap-1.5 rounded-card border border-linea p-4 text-sm tabular-nums">
          <div class="flex justify-between">
            <dt class="text-tenue">Cuenta</dt>
            <dd class="text-tinta">{{ formatearSoles(cuenta?.total ?? 0) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-tenue">Propina</dt>
            <dd class="text-tinta">{{ formatearSoles(propina) }}</dd>
          </div>
          <div class="mt-1 flex justify-between border-t border-linea pt-2">
            <dt class="font-semibold text-tinta">A cobrar</dt>
            <dd class="font-semibold text-tinta">{{ formatearSoles(aCobrar) }}</dd>
          </div>
        </dl>

        <KmField
          v-slot="{ id }"
          label="Propina"
          :ayuda="`Sugerida: ${propinaSugerida} %. El cliente manda.`"
        >
          <KmNumero :id="id" v-model="propina" prefijo="S/" :decimales="2" :min="0" />
        </KmField>

        <div class="flex flex-col gap-3 rounded-card border border-linea p-4">
          <p class="rs-etiqueta text-tenue">Medios de pago</p>
          <div v-for="(p, i) in pagos" :key="i" class="flex flex-wrap items-end gap-2">
            <KmField v-slot="{ id }" label="Medio">
              <KmSelect
                :id="id"
                v-model="p.medioPagoId"
                :opciones="opcionesMedio"
                placeholder="Elige"
              />
            </KmField>
            <KmField v-slot="{ id }" label="Monto">
              <KmNumero :id="id" v-model="p.monto" prefijo="S/" :decimales="2" :min="0" />
            </KmField>
            <KmField v-if="pideReferencia(p.medioPagoId)" v-slot="{ id }" label="Operación">
              <KmInput :id="id" v-model="p.referencia" placeholder="Nº de voucher" />
            </KmField>
            <KmBotonIcono
              v-if="pagos.length > 1"
              icono="eliminar"
              tono="peligro"
              etiqueta="Quitar pago"
              @click="quitarPago(i)"
            />
          </div>
          <div>
            <KmButton variante="secundario" @click="agregarPago">Añadir medio</KmButton>
          </div>
          <p class="text-sm tabular-nums" :class="falta ? 'text-vino-texto' : 'text-verde'">
            {{
              falta
                ? `Faltan ${formatearSoles(falta)}`
                : `Cubierto${vuelto ? ` · vuelto ${formatearSoles(vuelto)}` : ''}`
            }}
          </p>
        </div>
        <div
          v-if="consumoPrevisto.length || productosSinReceta.length"
          class="flex flex-col gap-2 rounded-card border border-linea p-4"
        >
          <p class="rs-etiqueta text-tenue">Sale del almacén al cobrar</p>
          <ul class="flex flex-col gap-1 text-sm tabular-nums">
            <li v-for="c in consumoPrevisto" :key="c.insumoId" class="flex justify-between gap-3">
              <span class="text-tenue">{{ c.nombre }}</span>
              <span class="text-tinta">{{ c.cantidad }}</span>
            </li>
          </ul>
          <p v-if="productosSinReceta.length" class="text-xs text-laton-texto">
            Sin receta, no descuentan nada: {{ productosSinReceta.join(', ') }}
          </p>
          <p class="text-xs text-tenue">
            Si falta stock la venta se cobra igual y el faltante queda anotado.
          </p>
        </div>
        <p class="text-xs text-tenue">
          Se emite nota de venta. La boleta o factura electrónica llega en Facturación.
        </p>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="cobrando = false">Cancelar</KmButton>
        <KmButton :cargando="cobrandoAhora" :disabled="falta > 0" @click="cobrar">
          Cobrar {{ formatearSoles(aCobrar) }}
        </KmButton>
      </template>
    </KmDrawer>
  </div>
</template>
