<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
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
import { pedidosService } from '@/services/pedidos.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, EstadoPedidoInterno, NuevoPedidoInterno, PedidoInterno } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { copiar } from '@/utils/copiar'
import { etiquetaEstadoPedido, tonoEstadoPedido } from '@/utils/configuracion'
import { aFechaIso } from '@/utils/fechas'
import { etiquetaUnidad, formatearCantidad } from '@/utils/formato'

const ui = useUiStore()
const auth = useAuthStore()
const catalogos = useCatalogos(['almacenes', 'insumos'])
const { insumo, nombreAlmacen } = catalogos
const usuarioId = () => auth.usuario?.id ?? 'u1'

const { consulta, items, total, cargando, error, recargar } = useListado(
  (c) => pedidosService.consultar(c),
  { orden: { campo: 'numero', direccion: 'desc' } },
)

const columnas: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Pedido', clase: 'w-32', ordenable: true },
  { clave: 'ruta', etiqueta: 'Quién pide → a quién' },
  { clave: 'fechaRequerida', etiqueta: 'Para', clase: 'w-28', ordenable: true },
  { clave: 'lineas', etiqueta: 'Insumos', clase: 'w-24' },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-36', ordenable: true },
  { clave: 'acciones', etiqueta: '', clase: 'w-48 text-right' },
]

const opcionesEstado: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los estados' },
  ...(Object.keys(etiquetaEstadoPedido) as EstadoPedidoInterno[]).map((e) => ({
    valor: e,
    etiqueta: etiquetaEstadoPedido[e],
  })),
]

function filtrar(campo: string, valor: string | number | undefined) {
  consulta.filtros = { ...consulta.filtros, [campo]: valor || undefined }
}

const fechaCorta = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—')
const unidad = (id: string) => etiquetaUnidad[insumo(id)?.unidad ?? 'unidad']
const existencia = (insumoId: string, almacenId: string) =>
  insumo(insumoId)?.existencias.find((e) => e.almacenId === almacenId)?.cantidad ?? 0

async function refrescar() {
  await Promise.all([recargar(), catalogos.recargar()])
}

// ── Editor ──
const editorAbierto = ref(false)
const editando = shallowRef<PedidoInterno | null>(null)
const form = ref<NuevoPedidoInterno>(vacio())
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

function vacio(): NuevoPedidoInterno {
  return {
    destinoId: '',
    origenId: '',
    fecha: aFechaIso(new Date()),
    fechaRequerida: aFechaIso(new Date()),
    lineas: [],
    notas: '',
    usuarioId: usuarioId(),
  }
}

function nuevo() {
  editando.value = null
  form.value = vacio()
  errores.value = {}
  editorAbierto.value = true
}

function abrir(p: PedidoInterno) {
  editando.value = p
  const { id: _i, numero: _n, estado: _e, despachadoEn: _d, recibidoEn: _r, ...resto } = copiar(p)
  form.value = resto
  errores.value = {}
  editorAbierto.value = true
}

const soloLectura = computed(() => !!editando.value && editando.value.estado !== 'borrador')

const rutaElegida = computed(() => !!form.value.destinoId && !!form.value.origenId)
const lineasConInsumo = computed(() => form.value.lineas.filter((l) => l.insumoId))

const cantidadTexto = (insumoId: string, almacenId: string) =>
  formatearCantidad(existencia(insumoId, almacenId), insumo(insumoId)?.unidad ?? 'unidad')
const noAlcanza = (l: { insumoId: string; solicitado: number }) =>
  !soloLectura.value && existencia(l.insumoId, form.value.origenId) < (Number(l.solicitado) || 0)

/** Solo se ofrecen insumos que el almacén de origen tiene. */
const opcionesInsumo = computed<OpcionSelect[]>(() =>
  catalogos.insumos.value
    .filter((i) => i.activo && (!form.value.origenId || existencia(i.id, form.value.origenId) > 0))
    .map((i) => ({ valor: i.id, etiqueta: i.nombre })),
)

const opcionesParaAnadir = computed(() =>
  opcionesInsumo.value.filter((o) => !form.value.lineas.some((l) => l.insumoId === o.valor)),
)

function anadirInsumo(id: string | number | undefined) {
  if (!id) return
  form.value.lineas.push({ insumoId: String(id), solicitado: 0, despachado: 0, recibido: 0 })
  errores.value = {}
}

function quitarInsumo(id: string) {
  form.value.lineas = form.value.lineas.filter((l) => l.insumoId !== id)
}

async function sugerir() {
  if (!form.value.destinoId || !form.value.origenId) {
    errores.value = { lineas: 'Elige primero quién pide y a quién.' }
    return
  }
  const lineas = await pedidosService.sugerir(form.value.destinoId, form.value.origenId)
  if (lineas.length === 0) {
    ui.exito(`${nombreAlmacen(form.value.destinoId)} no tiene insumos bajo su mínimo.`)
    return
  }
  const actuales = form.value.lineas.filter((l) => l.insumoId)
  form.value.lineas = [
    ...actuales,
    ...lineas.filter((l) => !actuales.some((a) => a.insumoId === l.insumoId)),
  ]
  errores.value = {}
}

async function guardar(enviar = false) {
  errores.value = {}
  guardando.value = true
  try {
    let pedido = editando.value
      ? await pedidosService.actualizar(editando.value.id, form.value)
      : await pedidosService.crear(form.value)
    if (enviar) pedido = await pedidosService.enviar(pedido.id)
    ui.exito(
      enviar
        ? `${pedido.numero} enviado a ${nombreAlmacen(pedido.origenId)}.`
        : `${pedido.numero} guardado como borrador.`,
    )
    editorAbierto.value = false
    await refrescar()
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar el pedido.')
  } finally {
    guardando.value = false
  }
}

// ── Despachar y recibir ──
const operacion = ref<{ tipo: 'despachar' | 'recibir'; pedido: PedidoInterno } | null>(null)
const cantidades = ref<{ insumoId: string; referencia: number; cantidad: number | null }[]>([])
const errorOperacion = ref('')
const operacionAbierta = computed({
  get: () => !!operacion.value,
  set: (v) => !v && (operacion.value = null),
})

function abrirOperacion(tipo: 'despachar' | 'recibir', pedido: PedidoInterno) {
  errorOperacion.value = ''
  cantidades.value = pedido.lineas
    .filter((l) => tipo === 'despachar' || l.despachado > 0)
    .map((l) => {
      const referencia = tipo === 'despachar' ? l.solicitado : l.despachado
      const tope =
        tipo === 'despachar'
          ? Math.min(referencia, existencia(l.insumoId, pedido.origenId))
          : referencia
      return { insumoId: l.insumoId, referencia, cantidad: tope }
    })
  operacion.value = { tipo, pedido }
}

async function confirmarOperacion() {
  const op = operacion.value
  if (!op) return
  guardando.value = true
  errorOperacion.value = ''
  const datos = cantidades.value.map((c) => ({
    insumoId: c.insumoId,
    cantidad: Number(c.cantidad) || 0,
  }))
  try {
    if (op.tipo === 'despachar') {
      await pedidosService.despachar(op.pedido.id, datos, usuarioId())
      ui.exito(`${op.pedido.numero} despachado: salió de ${nombreAlmacen(op.pedido.origenId)}.`)
    } else {
      await pedidosService.recibir(op.pedido.id, datos, usuarioId())
      const faltan = cantidades.value.some((c) => (Number(c.cantidad) || 0) < c.referencia)
      ui.exito(
        faltan
          ? `${op.pedido.numero} recibido con faltantes: se registraron como merma.`
          : `${op.pedido.numero} recibido completo.`,
      )
    }
    operacion.value = null
    await refrescar()
  } catch (e) {
    errorOperacion.value = (e as ApiError).mensaje ?? 'No se pudo completar la operación.'
  } finally {
    guardando.value = false
  }
}

// ── Anular / eliminar ──
const confirmar = ref<{ tipo: 'anular' | 'eliminar'; pedido: PedidoInterno } | null>(null)
const confirmarAbierto = computed({
  get: () => !!confirmar.value,
  set: (v) => !v && (confirmar.value = null),
})

async function ejecutarConfirmacion() {
  const c = confirmar.value
  if (!c) return
  try {
    if (c.tipo === 'anular') await pedidosService.anular(c.pedido.id)
    else await pedidosService.eliminar(c.pedido.id)
    ui.exito(c.tipo === 'anular' ? `${c.pedido.numero} anulado.` : `${c.pedido.numero} eliminado.`)
    await refrescar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo completar la acción.')
  } finally {
    confirmar.value = null
  }
}

const porDespachar = computed(() => items.value.filter((p) => p.estado === 'enviado').length)
const enCamino = computed(() => items.value.filter((p) => p.estado === 'despachado').length)
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5">
    <KmCard
      titulo="Pedidos internos"
      subtitulo="Un almacén o sucursal pide mercadería a otro. El stock sale al despachar y entra al recibir."
      sin-padding
    >
      <template #acciones>
        <KmBadge v-if="porDespachar" tono="laton" punto>{{ porDespachar }} por despachar</KmBadge>
        <KmBadge v-if="enCamino" tono="pizarra" punto>{{ enCamino }} en camino</KmBadge>
        <KmButton tamano="sm" @click="nuevo">Nuevo pedido</KmButton>
      </template>

      <div class="flex flex-wrap items-center gap-3 border-b border-linea px-6 py-3">
        <KmBusqueda v-model="consulta.buscar" placeholder="Buscar número o nota" />
        <div class="w-full sm:w-44">
          <KmSelect
            :model-value="(consulta.filtros?.estado as string) ?? ''"
            :opciones="opcionesEstado"
            etiqueta="Filtrar por estado"
            @update:model-value="filtrar('estado', $event)"
          />
        </div>
        <div class="w-full sm:w-52">
          <KmSelect
            :model-value="(consulta.filtros?.destinoId as string) ?? ''"
            :opciones="[{ valor: '', etiqueta: 'Pide: todos' }, ...catalogos.opcionesAlmacen.value]"
            etiqueta="Filtrar por quién pide"
            @update:model-value="filtrar('destinoId', $event)"
          />
        </div>
        <div class="w-full sm:w-52">
          <KmSelect
            :model-value="(consulta.filtros?.origenId as string) ?? ''"
            :opciones="[
              { valor: '', etiqueta: 'Despacha: todos' },
              ...catalogos.opcionesAlmacen.value,
            ]"
            etiqueta="Filtrar por quién despacha"
            @update:model-value="filtrar('origenId', $event)"
          />
        </div>
      </div>

      <KmTable
        v-model:orden="consulta.orden"
        :columnas="columnas"
        :filas="items"
        :cargando="cargando"
        :error="error"
        mensaje-vacio="No hay pedidos con estos filtros."
        @reintentar="recargar"
      >
        <template #col-numero="{ fila }">
          <span class="font-mono font-semibold text-tinta">{{ fila.numero }}</span>
        </template>
        <template #col-ruta="{ fila }">
          <p class="text-tinta">
            {{ nombreAlmacen(fila.destinoId) }}
            <span class="text-tenue">pide a</span>
            {{ nombreAlmacen(fila.origenId) }}
          </p>
          <p v-if="fila.notas" class="text-xs text-tenue">{{ fila.notas }}</p>
        </template>
        <template #col-fechaRequerida="{ fila }">
          <span class="text-tenue tabular-nums">{{ fechaCorta(fila.fechaRequerida) }}</span>
        </template>
        <template #col-lineas="{ fila }">
          <span class="tabular-nums">{{ fila.lineas.length }}</span>
        </template>
        <template #col-estado="{ fila }">
          <KmBadge :tono="tonoEstadoPedido[fila.estado]" punto>
            {{ etiquetaEstadoPedido[fila.estado] }}
          </KmBadge>
        </template>
        <template #col-acciones="{ fila }">
          <div class="flex items-center justify-end gap-1">
            <KmButton
              v-if="fila.estado === 'enviado'"
              variante="secundario"
              tamano="sm"
              @click="abrirOperacion('despachar', fila)"
            >
              Despachar
            </KmButton>
            <KmButton
              v-if="fila.estado === 'despachado'"
              variante="secundario"
              tamano="sm"
              @click="abrirOperacion('recibir', fila)"
            >
              Recibir
            </KmButton>
            <KmBotonIcono
              :icono="fila.estado === 'borrador' ? 'editar' : 'ver'"
              :etiqueta="fila.estado === 'borrador' ? 'Editar' : 'Ver'"
              :contexto="fila.numero"
              @click="abrir(fila)"
            />
            <KmBotonIcono
              v-if="fila.estado === 'enviado'"
              icono="anular"
              tono="peligro"
              etiqueta="Anular"
              :contexto="fila.numero"
              @click="confirmar = { tipo: 'anular', pedido: fila }"
            />
            <KmBotonIcono
              v-if="fila.estado === 'borrador'"
              icono="eliminar"
              tono="peligro"
              etiqueta="Eliminar"
              :contexto="fila.numero"
              @click="confirmar = { tipo: 'eliminar', pedido: fila }"
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

    <!-- Editor del pedido -->
    <KmDrawer
      v-model="editorAbierto"
      :titulo="editando ? editando.numero : 'Nuevo pedido interno'"
      :subtitulo="
        editando ? etiquetaEstadoPedido[editando.estado] : 'Se guarda como borrador hasta enviarlo.'
      "
      ancho="lg"
    >
      <form
        id="form-pedido"
        class="flex flex-col gap-6"
        novalidate
        @submit.prevent="guardar(false)"
      >
        <!-- Ruta del pedido -->
        <section class="flex flex-col gap-4">
          <div class="grid items-start gap-3 sm:grid-cols-[1fr_2rem_1fr]">
            <KmField
              v-slot="{ id, invalido }"
              label="Quién pide"
              requerido
              :error="errores.destinoId"
            >
              <KmSelect
                :id="id"
                v-model="form.destinoId"
                placeholder="Almacén que recibe"
                :opciones="catalogos.opcionesAlmacen.value"
                :invalido="invalido"
                :disabled="soloLectura"
              />
            </KmField>
            <svg
              viewBox="0 0 24 24"
              class="mt-9 hidden size-5 justify-self-center text-tenue sm:block"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M19 12H5m0 0l6-6m-6 6l6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <KmField
              v-slot="{ id, invalido }"
              label="A quién se pide"
              requerido
              :error="errores.origenId"
            >
              <KmSelect
                :id="id"
                v-model="form.origenId"
                placeholder="Almacén que despacha"
                :opciones="
                  catalogos.opcionesAlmacen.value.filter((o) => o.valor !== form.destinoId)
                "
                :invalido="invalido"
                :disabled="soloLectura"
              />
            </KmField>
          </div>
          <div class="grid gap-3 sm:grid-cols-[1fr_2rem_1fr]">
            <KmField v-slot="{ id }" label="Se necesita para">
              <KmFecha
                :id="id"
                :model-value="form.fechaRequerida ?? null"
                :min="form.fecha"
                :limpiable="false"
                :disabled="soloLectura"
                @update:model-value="form.fechaRequerida = $event || undefined"
              />
            </KmField>
            <span class="hidden sm:block"></span>
            <KmField v-slot="{ id }" label="Notas">
              <KmInput
                :id="id"
                v-model="form.notas"
                placeholder="Ej. Para el turno de la noche"
                :disabled="soloLectura"
              />
            </KmField>
          </div>
        </section>

        <!-- Insumos -->
        <section class="flex flex-col gap-3 border-t border-linea pt-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-semibold text-tinta">Insumos del pedido</h3>
              <p class="text-xs text-tenue">
                {{
                  lineasConInsumo.length === 1 ? '1 insumo' : `${lineasConInsumo.length} insumos`
                }}
              </p>
            </div>
            <KmButton
              v-if="!soloLectura"
              variante="secundario"
              tamano="sm"
              :disabled="!rutaElegida"
              @click="sugerir"
            >
              Añadir los que están bajo mínimo
            </KmButton>
          </div>

          <KmSelect
            v-if="!soloLectura"
            :model-value="undefined"
            :placeholder="
              rutaElegida ? 'Añadir insumo al pedido…' : 'Elige primero quién pide y a quién'
            "
            :opciones="opcionesParaAnadir"
            :disabled="!rutaElegida"
            etiqueta="Añadir insumo"
            @update:model-value="anadirInsumo"
          />

          <p v-if="errores.lineas" class="text-xs font-medium text-vino">{{ errores.lineas }}</p>

          <div
            v-if="lineasConInsumo.length === 0"
            class="flex flex-col items-center gap-1 rounded-card border border-dashed border-linea px-6 py-8 text-center"
          >
            <p class="text-sm font-medium text-tinta">Aún no hay insumos</p>
            <p class="text-xs text-tenue">
              Añádelos con el buscador o carga de golpe los que están bajo su mínimo.
            </p>
          </div>

          <ul v-else class="divide-y divide-linea rounded-card border border-linea">
            <li
              v-for="l in lineasConInsumo"
              :key="l.insumoId"
              class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="font-medium text-tinta">{{ insumo(l.insumoId)?.nombre }}</p>
                <p class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-tenue">
                  <span>
                    {{ nombreAlmacen(form.destinoId) }} tiene
                    <b class="text-tinta tabular-nums">{{
                      cantidadTexto(l.insumoId, form.destinoId)
                    }}</b>
                  </span>
                  <span :class="{ 'font-semibold text-vino': noAlcanza(l) }">
                    {{ nombreAlmacen(form.origenId) }} tiene
                    <b class="tabular-nums" :class="noAlcanza(l) ? 'text-vino' : 'text-tinta'">{{
                      cantidadTexto(l.insumoId, form.origenId)
                    }}</b>
                    <template v-if="noAlcanza(l)"> · no alcanza</template>
                  </span>
                </p>
              </div>

              <template v-if="!soloLectura">
                <div class="w-44">
                  <KmNumero
                    v-model="l.solicitado"
                    :min="0"
                    :decimales="2"
                    :sufijo="unidad(l.insumoId)"
                    :aria-label="`Cantidad de ${insumo(l.insumoId)?.nombre}`"
                  />
                </div>
                <KmBotonIcono
                  icono="eliminar"
                  tono="peligro"
                  etiqueta="Quitar"
                  :contexto="insumo(l.insumoId)?.nombre"
                  @click="quitarInsumo(l.insumoId)"
                />
              </template>
              <dl v-else class="grid grid-cols-3 gap-4 text-right text-xs">
                <div>
                  <dt class="text-tenue">Pedido</dt>
                  <dd class="font-semibold text-tinta tabular-nums">{{ l.solicitado }}</dd>
                </div>
                <div>
                  <dt class="text-tenue">Despachado</dt>
                  <dd class="font-semibold text-tinta tabular-nums">{{ l.despachado }}</dd>
                </div>
                <div>
                  <dt class="text-tenue">Recibido</dt>
                  <dd
                    class="font-semibold tabular-nums"
                    :class="
                      editando?.estado === 'recibido' && l.recibido < l.despachado
                        ? 'text-vino'
                        : 'text-tinta'
                    "
                  >
                    {{ l.recibido }}
                  </dd>
                </div>
              </dl>
            </li>
          </ul>
        </section>
      </form>

      <template #footer>
        <template v-if="!soloLectura">
          <KmButton variante="secundario" :disabled="guardando" @click="editorAbierto = false">
            Cancelar
          </KmButton>
          <KmButton variante="secundario" type="submit" form="form-pedido" :cargando="guardando">
            Guardar borrador
          </KmButton>
          <KmButton :cargando="guardando" @click="guardar(true)">Enviar pedido</KmButton>
        </template>
        <KmButton v-else variante="secundario" @click="editorAbierto = false">Cerrar</KmButton>
      </template>
    </KmDrawer>

    <!-- Despachar o recibir -->
    <KmModal
      v-model="operacionAbierta"
      :titulo="
        operacion
          ? `${operacion.tipo === 'despachar' ? 'Despachar' : 'Recibir'} ${operacion.pedido.numero}`
          : ''
      "
      ancho="lg"
    >
      <div v-if="operacion" class="flex flex-col gap-3">
        <p class="text-sm text-tenue">
          <template v-if="operacion.tipo === 'despachar'">
            Indica lo que sale realmente de
            <strong class="text-tinta">{{ nombreAlmacen(operacion.pedido.origenId) }}</strong
            >. Si no hay suficiente, despacha lo que haya.
          </template>
          <template v-else>
            Indica lo que llegó a
            <strong class="text-tinta">{{ nombreAlmacen(operacion.pedido.destinoId) }}</strong
            >. Lo que falte se registra como merma «Faltante en traslado».
          </template>
        </p>
        <div class="overflow-x-auto rounded-card border border-linea">
          <table class="w-full min-w-[30rem] text-sm">
            <thead>
              <tr class="border-b border-linea bg-panel-2">
                <th class="rs-etiqueta px-3 py-2 text-left text-tenue">Insumo</th>
                <th class="rs-etiqueta px-3 py-2 text-right text-tenue">
                  {{ operacion.tipo === 'despachar' ? 'Pedido' : 'Despachado' }}
                </th>
                <th
                  v-if="operacion.tipo === 'despachar'"
                  class="rs-etiqueta px-3 py-2 text-right text-tenue"
                >
                  Disponible
                </th>
                <th class="rs-etiqueta w-40 px-3 py-2 text-left text-tenue">
                  {{ operacion.tipo === 'despachar' ? 'Sale' : 'Llegó' }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in cantidades"
                :key="c.insumoId"
                class="border-b border-linea last:border-0"
              >
                <td class="px-3 py-2 text-tinta">{{ insumo(c.insumoId)?.nombre }}</td>
                <td class="px-3 py-2 text-right text-tenue tabular-nums">
                  {{ formatearCantidad(c.referencia, insumo(c.insumoId)?.unidad ?? 'unidad') }}
                </td>
                <td
                  v-if="operacion.tipo === 'despachar'"
                  class="px-3 py-2 text-right text-tenue tabular-nums"
                >
                  {{
                    formatearCantidad(
                      existencia(c.insumoId, operacion.pedido.origenId),
                      insumo(c.insumoId)?.unidad ?? 'unidad',
                    )
                  }}
                </td>
                <td class="px-3 py-1.5">
                  <KmNumero
                    v-model="c.cantidad"
                    :min="0"
                    :max="operacion.tipo === 'recibir' ? c.referencia : undefined"
                    :decimales="3"
                    :controles="false"
                    :sufijo="unidad(c.insumoId)"
                    :etiqueta="`Cantidad de ${insumo(c.insumoId)?.nombre}`"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="errorOperacion" class="text-sm font-medium text-vino">{{ errorOperacion }}</p>
      </div>
      <template #footer>
        <KmButton variante="secundario" :disabled="guardando" @click="operacion = null"
          >Cancelar</KmButton
        >
        <KmButton :cargando="guardando" @click="confirmarOperacion">
          {{ operacion?.tipo === 'despachar' ? 'Confirmar despacho' : 'Confirmar recepción' }}
        </KmButton>
      </template>
    </KmModal>

    <KmConfirm
      v-model="confirmarAbierto"
      :titulo="confirmar?.tipo === 'anular' ? 'Anular pedido' : 'Eliminar borrador'"
      :mensaje="
        confirmar?.tipo === 'anular'
          ? `¿Anular ${confirmar?.pedido.numero}? El almacén de origen ya no lo verá por despachar.`
          : `¿Eliminar el borrador ${confirmar?.pedido.numero}? Esta acción no se puede deshacer.`
      "
      :texto-confirmar="confirmar?.tipo === 'anular' ? 'Anular' : 'Eliminar'"
      peligroso
      @confirmar="ejecutarConfirmacion"
    />
  </div>
</template>
