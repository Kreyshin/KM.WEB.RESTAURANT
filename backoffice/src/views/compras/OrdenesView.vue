<script setup lang="ts">
import { copiar } from '@/utils/copiar'
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmPaginacion from '@/components/ui/KmPaginacion.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { useListado } from '@/composables/useListado'
import { ordenesCompraService, totalesOrden } from '@/services/compras.service'
import { impuestosService } from '@/services/empresa.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  EstadoOrdenCompra,
  LineaOrdenCompra,
  NuevaOrdenCompra,
  OrdenCompra,
} from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { etiquetaEstadoOrden, tonoEstadoOrden } from '@/utils/configuracion'
import { aFechaIso } from '@/utils/fechas'
import { etiquetaUnidad, formatearCantidad, formatearSoles } from '@/utils/formato'

const ui = useUiStore()
const auth = useAuthStore()
const catalogos = useCatalogos(['almacenes', 'insumos', 'proveedores', 'locales'])
const { insumo, nombreAlmacen, nombreProveedor } = catalogos

const igv = ref(18)
onMounted(async () => (igv.value = (await impuestosService.obtener()).igvPorcentaje))

const { consulta, items, total, cargando, error, recargar } = useListado(
  (c) => ordenesCompraService.consultar(c),
  {
    orden: { campo: 'numero', direccion: 'desc' },
  },
)

const columnas: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Orden', clase: 'w-32', ordenable: true },
  { clave: 'proveedorId', etiqueta: 'Proveedor' },
  { clave: 'fechaEntrega', etiqueta: 'Entrega', clase: 'w-32', ordenable: true },
  { clave: 'total', etiqueta: 'Total', clase: 'w-32 text-right' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-40', ordenable: true },
  { clave: 'acciones', etiqueta: '', clase: 'w-40 text-right' },
]

const opcionesEstado: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los estados' },
  ...(Object.keys(etiquetaEstadoOrden) as EstadoOrdenCompra[]).map((e) => ({
    valor: e,
    etiqueta: etiquetaEstadoOrden[e],
  })),
]

function filtrar(campo: string, valor: string | number | undefined) {
  consulta.filtros = { ...consulta.filtros, [campo]: valor || undefined }
}

const fechaCorta = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—')
const atrasada = (o: OrdenCompra) =>
  (o.estado === 'emitida' || o.estado === 'parcial') &&
  !!o.fechaEntrega &&
  o.fechaEntrega < aFechaIso(new Date())

async function refrescar() {
  await Promise.all([recargar(), catalogos.recargar()])
}

// ── Editor ──
const editorAbierto = ref(false)
const editando = shallowRef<OrdenCompra | null>(null)
const form = ref<NuevaOrdenCompra>(vacia())
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

function vacia(): NuevaOrdenCompra {
  return {
    proveedorId: '',
    almacenId: (catalogos.opcionesAlmacen.value[0]?.valor as string) ?? '',
    fechaEmision: aFechaIso(new Date()),
    fechaEntrega: undefined,
    lineas: [{ insumoId: '', cantidad: 0, costoUnitario: 0, recibido: 0 }],
    notas: '',
  }
}

function nueva(base?: Partial<NuevaOrdenCompra>) {
  editando.value = null
  form.value = { ...vacia(), ...base }
  errores.value = {}
  editorAbierto.value = true
}

function abrir(o: OrdenCompra) {
  editando.value = o
  const { id: _i, numero: _n, estado: _e, ...resto } = copiar(o)
  form.value = resto
  errores.value = {}
  editorAbierto.value = true
}

const soloLectura = computed(() => !!editando.value && editando.value.estado !== 'borrador')
const totales = computed(() =>
  totalesOrden(
    form.value.lineas.filter((l) => l.insumoId),
    igv.value,
  ),
)

/** Al elegir un insumo se propone su costo promedio actual. */
function elegirInsumo(l: LineaOrdenCompra, id: string | number | undefined) {
  l.insumoId = String(id ?? '')
  const i = insumo(l.insumoId)
  if (i && !l.costoUnitario) l.costoUnitario = i.costoUnitario
}

async function guardar(emitir = false) {
  errores.value = {}
  guardando.value = true
  try {
    let orden = editando.value
      ? await ordenesCompraService.actualizar(editando.value.id, form.value)
      : await ordenesCompraService.crear(form.value)
    if (emitir) orden = await ordenesCompraService.emitir(orden.id)
    ui.exito(emitir ? `${orden.numero} emitida.` : `${orden.numero} guardada como borrador.`)
    editorAbierto.value = false
    await refrescar()
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar la orden.')
  } finally {
    guardando.value = false
  }
}

// ── Anular / eliminar ──
const confirmar = ref<{ tipo: 'anular' | 'eliminar'; orden: OrdenCompra } | null>(null)
const confirmarAbierto = computed({
  get: () => !!confirmar.value,
  set: (v) => !v && (confirmar.value = null),
})

async function ejecutarConfirmacion() {
  const c = confirmar.value
  if (!c) return
  try {
    if (c.tipo === 'anular') await ordenesCompraService.anular(c.orden.id)
    else await ordenesCompraService.eliminar(c.orden.id)
    ui.exito(c.tipo === 'anular' ? `${c.orden.numero} anulada.` : `${c.orden.numero} eliminada.`)
    await refrescar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo completar la acción.')
  } finally {
    confirmar.value = null
  }
}

// ── Recepción ──
const recepcionAbierta = ref(false)
const aRecibir = shallowRef<OrdenCompra | null>(null)
const recepcion = ref<
  { insumoId: string; pendiente: number; cantidad: number | null; costoUnitario: number | null }[]
>([])
const errorRecepcion = ref('')

function abrirRecepcion(o: OrdenCompra) {
  aRecibir.value = o
  errorRecepcion.value = ''
  recepcion.value = o.lineas
    .map((l) => ({
      insumoId: l.insumoId,
      pendiente: Math.round((l.cantidad - l.recibido) * 1000) / 1000,
      cantidad: Math.round((l.cantidad - l.recibido) * 1000) / 1000,
      costoUnitario: l.costoUnitario,
    }))
    .filter((l) => l.pendiente > 0)
  recepcionAbierta.value = true
}

async function recibir() {
  if (!aRecibir.value) return
  guardando.value = true
  errorRecepcion.value = ''
  try {
    const o = await ordenesCompraService.recibir(
      aRecibir.value.id,
      recepcion.value.map((r) => ({
        insumoId: r.insumoId,
        cantidad: Number(r.cantidad) || 0,
        costoUnitario: Number(r.costoUnitario) || 0,
      })),
      auth.usuario?.id ?? 'u1',
    )
    ui.exito(
      o.estado === 'recibida'
        ? `${o.numero} recibida completa. Stock actualizado.`
        : `Recepción parcial de ${o.numero} registrada.`,
    )
    recepcionAbierta.value = false
    await refrescar()
  } catch (e) {
    errorRecepcion.value = (e as ApiError).mensaje ?? 'No se pudo registrar la recepción.'
  } finally {
    guardando.value = false
  }
}

// ── Sugerencias ──
function desdeSugerencia(s: { proveedorId?: string; lineas: LineaOrdenCompra[] }) {
  nueva({ proveedorId: s.proveedorId, lineas: copiar(s.lineas) })
}

const sugerencias = shallowRef<Awaited<ReturnType<typeof ordenesCompraService.sugerencias>>>([])
onMounted(async () => (sugerencias.value = await ordenesCompraService.sugerencias()))
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5">
    <KmCard
      v-if="sugerencias.length"
      titulo="Sugerencia de compra"
      subtitulo="Insumos bajo su mínimo, agrupados por proveedor. La cantidad repone hasta el doble del mínimo."
    >
      <ul class="grid gap-3 md:grid-cols-2">
        <li
          v-for="s in sugerencias"
          :key="s.proveedorId ?? 'sin'"
          class="flex flex-col gap-2 rounded-card border border-linea p-4"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="font-medium text-tinta">
              {{ s.proveedorId ? nombreProveedor(s.proveedorId) : 'Sin proveedor asignado' }}
            </p>
            <KmButton
              variante="secundario"
              tamano="sm"
              :disabled="!s.proveedorId"
              @click="desdeSugerencia(s)"
            >
              Crear orden
            </KmButton>
          </div>
          <p class="text-xs text-tenue">
            {{
              s.lineas
                .map(
                  (l) =>
                    `${insumo(l.insumoId)?.nombre} (${l.cantidad} ${etiquetaUnidad[insumo(l.insumoId)?.unidad ?? 'unidad']})`,
                )
                .join(' · ')
            }}
          </p>
        </li>
      </ul>
    </KmCard>

    <KmCard
      titulo="Órdenes de compra"
      subtitulo="Pedidos a proveedores y recepción de la mercadería en almacén."
      sin-padding
    >
      <template #acciones>
        <KmButton tamano="sm" @click="nueva()">Nueva orden</KmButton>
      </template>

      <div class="flex flex-wrap items-center gap-3 border-b border-linea px-6 py-3">
        <KmBusqueda v-model="consulta.buscar" placeholder="Buscar número o nota" />
        <div class="w-full sm:w-48">
          <KmSelect
            :model-value="(consulta.filtros?.estado as string) ?? ''"
            :opciones="opcionesEstado"
            etiqueta="Filtrar por estado"
            @update:model-value="filtrar('estado', $event)"
          />
        </div>
        <div class="w-full sm:w-56">
          <KmSelect
            :model-value="(consulta.filtros?.proveedorId as string) ?? ''"
            :opciones="[
              { valor: '', etiqueta: 'Todos los proveedores' },
              ...catalogos.opcionesProveedor.value,
            ]"
            etiqueta="Filtrar por proveedor"
            @update:model-value="filtrar('proveedorId', $event)"
          />
        </div>
      </div>

      <KmTable
        v-model:orden="consulta.orden"
        :columnas="columnas"
        :filas="items"
        :cargando="cargando"
        :error="error"
        mensaje-vacio="No hay órdenes con estos filtros."
        @reintentar="recargar"
      >
        <template #col-numero="{ fila }">
          <span class="font-mono font-semibold text-tinta">{{ fila.numero }}</span>
        </template>
        <template #col-proveedorId="{ fila }">
          <p class="text-tinta">{{ nombreProveedor(fila.proveedorId) }}</p>
          <p class="text-xs text-tenue">
            {{ fila.lineas.length }} insumos · {{ nombreAlmacen(fila.almacenId) }}
          </p>
        </template>
        <template #col-fechaEntrega="{ fila }">
          <span
            class="tabular-nums"
            :class="atrasada(fila) ? 'font-semibold text-vino' : 'text-tenue'"
          >
            {{ fechaCorta(fila.fechaEntrega) }}
          </span>
          <p v-if="atrasada(fila)" class="text-[11px] text-vino">Atrasada</p>
        </template>
        <template #col-total="{ fila }">
          <span class="font-medium tabular-nums">{{
            formatearSoles(totalesOrden(fila.lineas, igv).total)
          }}</span>
        </template>
        <template #col-estado="{ fila }">
          <KmBadge :tono="tonoEstadoOrden[fila.estado]" punto>{{
            etiquetaEstadoOrden[fila.estado]
          }}</KmBadge>
        </template>
        <template #col-acciones="{ fila }">
          <div class="flex justify-end gap-0.5">
            <KmBotonIcono
              v-if="fila.estado === 'emitida' || fila.estado === 'parcial'"
              icono="recibir"
              etiqueta="Recibir mercadería"
              :contexto="fila.numero"
              @click="abrirRecepcion(fila)"
            />
            <KmBotonIcono
              :icono="fila.estado === 'borrador' ? 'editar' : 'ver'"
              :etiqueta="fila.estado === 'borrador' ? 'Editar' : 'Ver'"
              :contexto="fila.numero"
              @click="abrir(fila)"
            />
            <KmBotonIcono
              v-if="fila.estado === 'emitida'"
              icono="anular"
              tono="peligro"
              etiqueta="Anular"
              :contexto="fila.numero"
              @click="confirmar = { tipo: 'anular', orden: fila }"
            />
            <KmBotonIcono
              v-if="fila.estado === 'borrador'"
              icono="eliminar"
              tono="peligro"
              etiqueta="Eliminar"
              :contexto="fila.numero"
              @click="confirmar = { tipo: 'eliminar', orden: fila }"
            />
          </div>
        </template>
      </KmTable>

      <KmPaginacion
        v-if="!error"
        v-model:pagina="consulta.pagina"
        v-model:por-pagina="consulta.porPagina"
        :total="total"
      />
    </KmCard>

    <KmDrawer
      v-model="editorAbierto"
      :titulo="editando ? editando.numero : 'Nueva orden de compra'"
      :subtitulo="
        editando ? etiquetaEstadoOrden[editando.estado] : 'Se guarda como borrador hasta emitirla.'
      "
      ancho="lg"
    >
      <form id="form-orden" class="flex flex-col gap-4" novalidate @submit.prevent="guardar(false)">
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField
            v-slot="{ id, invalido }"
            label="Proveedor"
            requerido
            :error="errores.proveedorId"
          >
            <KmSelect
              :id="id"
              v-model="form.proveedorId"
              placeholder="Elige un proveedor"
              :opciones="catalogos.opcionesProveedor.value"
              :invalido="invalido"
              :disabled="soloLectura"
            />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Almacén de destino"
            requerido
            :error="errores.almacenId"
          >
            <KmSelect
              :id="id"
              v-model="form.almacenId"
              :opciones="catalogos.opcionesAlmacen.value"
              :invalido="invalido"
              :disabled="soloLectura"
            />
          </KmField>
          <KmField v-slot="{ id }" label="Emisión">
            <KmFecha
              :id="id"
              v-model="form.fechaEmision"
              :limpiable="false"
              :disabled="soloLectura"
            />
          </KmField>
          <KmField v-slot="{ id, invalido }" label="Entrega esperada" :error="errores.fechaEntrega">
            <KmFecha
              :id="id"
              :model-value="form.fechaEntrega ?? null"
              :min="form.fechaEmision"
              :invalido="invalido"
              :disabled="soloLectura"
              @update:model-value="form.fechaEntrega = $event || undefined"
            />
          </KmField>
        </div>

        <section class="flex flex-col gap-2">
          <p class="rs-etiqueta text-laton-texto">Insumos</p>
          <p v-if="errores.lineas" class="text-xs font-medium text-vino">{{ errores.lineas }}</p>
          <div class="hidden grid-cols-[1fr_8rem_8rem_6rem_2.25rem] gap-2 px-1 sm:grid">
            <span class="rs-etiqueta text-tenue">Insumo</span>
            <span class="rs-etiqueta text-tenue">Cantidad</span>
            <span class="rs-etiqueta text-tenue">Costo s/IGV</span>
            <span class="rs-etiqueta text-right text-tenue">Subtotal</span>
          </div>
          <div
            v-for="(l, i) in form.lineas"
            :key="i"
            class="grid grid-cols-[1fr_8rem_8rem_6rem_2.25rem] items-center gap-2"
          >
            <KmSelect
              :model-value="l.insumoId"
              placeholder="Elige un insumo"
              :opciones="
                catalogos.opcionesInsumo.value.filter(
                  (o) => o.valor === l.insumoId || !form.lineas.some((x) => x.insumoId === o.valor),
                )
              "
              etiqueta="Insumo"
              :disabled="soloLectura"
              @update:model-value="elegirInsumo(l, $event)"
            />
            <KmNumero
              v-model="l.cantidad"
              :min="0"
              :decimales="3"
              :controles="false"
              :sufijo="etiquetaUnidad[insumo(l.insumoId)?.unidad ?? 'unidad']"
              :disabled="soloLectura"
            />
            <KmNumero
              v-model="l.costoUnitario"
              :min="0"
              :decimales="2"
              :controles="false"
              prefijo="S/"
              :disabled="soloLectura"
            />
            <span class="text-right text-sm text-tenue tabular-nums">{{
              formatearSoles((Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0))
            }}</span>
            <KmBotonIcono
              v-if="!soloLectura"
              icono="eliminar"
              tono="peligro"
              etiqueta="Quitar"
              :contexto="insumo(l.insumoId)?.nombre"
              @click="form.lineas.splice(i, 1)"
            />
            <span
              v-else
              class="text-center text-xs text-tenue tabular-nums"
              :title="`Recibido ${l.recibido}`"
              >{{ l.recibido }}</span
            >
          </div>
          <KmButton
            v-if="!soloLectura"
            variante="secundario"
            tamano="sm"
            class="self-start"
            @click="form.lineas.push({ insumoId: '', cantidad: 0, costoUnitario: 0, recibido: 0 })"
          >
            Añadir insumo
          </KmButton>
        </section>

        <dl class="ml-auto grid w-64 grid-cols-2 gap-y-1 text-sm tabular-nums">
          <dt class="text-tenue">Subtotal</dt>
          <dd class="text-right">{{ formatearSoles(totales.subtotal) }}</dd>
          <dt class="text-tenue">IGV {{ igv }} %</dt>
          <dd class="text-right">{{ formatearSoles(totales.igv) }}</dd>
          <dt class="border-t border-linea pt-1 font-semibold">Total</dt>
          <dd class="rs-display border-t border-linea pt-1 text-right text-base font-semibold">
            {{ formatearSoles(totales.total) }}
          </dd>
        </dl>

        <KmField v-slot="{ id }" label="Notas para el proveedor">
          <KmInput
            :id="id"
            v-model="form.notas"
            :disabled="soloLectura"
            placeholder="Ej. Entregar por la puerta de servicio"
          />
        </KmField>
      </form>

      <template #footer>
        <template v-if="!soloLectura">
          <KmButton variante="secundario" :disabled="guardando" @click="editorAbierto = false"
            >Cancelar</KmButton
          >
          <KmButton variante="secundario" type="submit" form="form-orden" :cargando="guardando"
            >Guardar borrador</KmButton
          >
          <KmButton :cargando="guardando" @click="guardar(true)">Emitir orden</KmButton>
        </template>
        <KmButton v-else variante="secundario" @click="editorAbierto = false">Cerrar</KmButton>
      </template>
    </KmDrawer>

    <KmModal
      v-model="recepcionAbierta"
      :titulo="aRecibir ? `Recibir ${aRecibir.numero}` : 'Recepción'"
      ancho="lg"
    >
      <div v-if="aRecibir" class="flex flex-col gap-3">
        <p class="text-sm text-tenue">
          Indica lo que llegó realmente y el costo de la factura. Entra al almacén
          <strong class="text-tinta">{{ nombreAlmacen(aRecibir.almacenId) }}</strong> y actualiza el
          costo promedio.
        </p>
        <div class="overflow-x-auto rounded-card border border-linea">
          <table class="w-full min-w-[34rem] text-sm">
            <thead>
              <tr class="border-b border-linea bg-panel-2">
                <th class="rs-etiqueta px-3 py-2 text-left text-tenue">Insumo</th>
                <th class="rs-etiqueta px-3 py-2 text-right text-tenue">Pendiente</th>
                <th class="rs-etiqueta w-36 px-3 py-2 text-left text-tenue">Recibido</th>
                <th class="rs-etiqueta w-32 px-3 py-2 text-left text-tenue">Costo real</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in recepcion"
                :key="r.insumoId"
                class="border-b border-linea last:border-0"
              >
                <td class="px-3 py-2 text-tinta">{{ insumo(r.insumoId)?.nombre }}</td>
                <td class="px-3 py-2 text-right text-tenue tabular-nums">
                  {{ formatearCantidad(r.pendiente, insumo(r.insumoId)?.unidad ?? 'unidad') }}
                </td>
                <td class="px-3 py-1.5">
                  <KmNumero
                    v-model="r.cantidad"
                    :min="0"
                    :max="r.pendiente"
                    :decimales="3"
                    :controles="false"
                    :sufijo="etiquetaUnidad[insumo(r.insumoId)?.unidad ?? 'unidad']"
                  />
                </td>
                <td class="px-3 py-1.5">
                  <KmNumero
                    v-model="r.costoUnitario"
                    :min="0"
                    :decimales="2"
                    :controles="false"
                    prefijo="S/"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="errorRecepcion" class="text-sm font-medium text-vino">{{ errorRecepcion }}</p>
        <p class="text-xs text-tenue">
          Si llegó menos, la orden queda «Recibida en parte» y podrás recibir el resto después.
        </p>
      </div>
      <template #footer>
        <KmButton variante="secundario" :disabled="guardando" @click="recepcionAbierta = false"
          >Cancelar</KmButton
        >
        <KmButton :cargando="guardando" @click="recibir">Registrar recepción</KmButton>
      </template>
    </KmModal>

    <KmConfirm
      v-model="confirmarAbierto"
      :titulo="confirmar?.tipo === 'anular' ? 'Anular orden' : 'Eliminar borrador'"
      :mensaje="
        confirmar?.tipo === 'anular'
          ? `¿Anular ${confirmar?.orden.numero}? Avisa al proveedor: la orden deja de ser válida.`
          : `¿Eliminar el borrador ${confirmar?.orden.numero}? Esta acción no se puede deshacer.`
      "
      :texto-confirmar="confirmar?.tipo === 'anular' ? 'Anular' : 'Eliminar'"
      peligroso
      @confirmar="ejecutarConfirmacion"
    />
  </div>
</template>
