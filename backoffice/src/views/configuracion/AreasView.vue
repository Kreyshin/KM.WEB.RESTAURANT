<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useLocales } from '@/composables/useLocales'
import { cartaService } from '@/services/carta.service'
import { dependenciasService } from '@/services/dependencias.service'
import { areasService, coberturaComanda, impresorasService } from '@/services/produccion.service'
import { useLocalStore } from '@/stores/local.store'
import type {
  Area,
  Categoria,
  Consulta,
  Impresora,
  NuevaArea,
  NuevaImpresora,
  Producto,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana } from '@/types/ui'
import { etiquetaUsoImpresora, opcionesUsoImpresora } from '@/utils/configuracion'
import { validarIpv4 } from '@/utils/validaciones'

/**
 * Áreas del local (D-004): dónde se prepara y a dónde se comanda cada producto.
 * Con una sola área basta «Todos los productos»; con varias, se reparte por
 * categoría o producto y el panel avisa de huecos y duplicados.
 */

const { opciones: opcionesLocal, nombreLocal } = useLocales()
const localStore = useLocalStore()

const pestana = ref('areas')
const pestanas: Pestana[] = [
  { valor: 'areas', etiqueta: 'Áreas' },
  { valor: 'impresoras', etiqueta: 'Impresoras' },
]

const impresoras = shallowRef<Impresora[]>([])
const areas = shallowRef<Area[]>([])
const productos = shallowRef<Producto[]>([])
const categorias = shallowRef<Categoria[]>([])

async function cargarReferencias() {
  ;[impresoras.value, areas.value, productos.value, categorias.value] = await Promise.all([
    impresorasService.todos(),
    areasService.todos(),
    cartaService.listarProductos(),
    cartaService.listarCategorias(),
  ])
}
onMounted(cargarReferencias)

const nombreImpresora = (id?: string) => impresoras.value.find((i) => i.id === id)?.nombre
const nombreCategoria = (id: string) => categorias.value.find((c) => c.id === id)?.nombre ?? '—'
const nombreProducto = (id: string) => productos.value.find((p) => p.id === id)?.nombre ?? '—'
const productosDe = (categoriaId: string) =>
  productos.value.filter((p) => p.categoriaId === categoriaId).length

function opcionesImpresora(localId: string): OpcionSelect[] {
  return [
    { valor: '', etiqueta: 'Sin impresora' },
    ...impresoras.value
      .filter((i) => i.localId === localId && i.uso === 'comandas')
      .map((i) => ({ valor: i.id, etiqueta: i.nombre })),
  ]
}

const filtroLocalOpciones = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los locales' },
  ...opcionesLocal.value,
])

function filtroLocal(consulta: Consulta) {
  return {
    get: () => (consulta.filtros?.localId as string | undefined) ?? '',
    set: (v: string | number | undefined) =>
      (consulta.filtros = { ...consulta.filtros, localId: v || undefined }),
  }
}

// ── Revisión de comandas por local ──
const localRevision = ref('')
watch(
  () => [localStore.localId, opcionesLocal.value.length] as const,
  ([id]) => {
    if (!localRevision.value)
      localRevision.value = id ?? (opcionesLocal.value[0]?.valor as string) ?? ''
  },
  { immediate: true },
)

const cobertura = computed(() =>
  coberturaComanda(areas.value, productos.value, localRevision.value),
)
const areasDelLocal = computed(() =>
  areas.value.filter((a) => a.localId === localRevision.value && a.activo && a.recibeComandas),
)

// ── Áreas ──
const columnasAreas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Área', ordenable: true },
  { clave: 'localId', etiqueta: 'Local', clase: 'w-36', ordenable: true },
  { clave: 'comanda', etiqueta: 'Recibe', clase: 'w-60' },
  { clave: 'impresoraId', etiqueta: 'Imprime en', clase: 'w-44' },
]

const nuevaArea = (): NuevaArea => {
  const localId = localRevision.value || (opcionesLocal.value[0]?.valor as string)
  const primera = !areas.value.some((a) => a.localId === localId && a.recibeComandas)
  return {
    nombre: '',
    localId,
    ubicacion: '',
    impresoraId: '',
    recibeComandas: true,
    // Con una sola área en el local, lo natural es que reciba todo.
    comanda: { modo: primera ? 'todos' : 'seleccionados', categoriaIds: [], productoIds: [] },
    activo: true,
  }
}

function validarArea(a: NuevaArea) {
  const errores: Record<string, string> = {}
  if (!a.nombre.trim()) errores.nombre = 'El nombre es obligatorio.'
  if (!a.localId) errores.localId = 'Elige un local.'
  if (
    a.recibeComandas &&
    a.comanda.modo === 'seleccionados' &&
    !a.comanda.categoriaIds.length &&
    !a.comanda.productoIds.length
  ) {
    errores.comanda = 'Elige al menos una categoría o un producto, o marca «Todos los productos».'
  }
  return errores
}

function resumenComanda(a: Area) {
  if (!a.recibeComandas) return 'No recibe comandas'
  if (a.comanda.modo === 'todos') return 'Todos los productos'
  const partes = []
  if (a.comanda.categoriaIds.length) {
    partes.push(a.comanda.categoriaIds.map(nombreCategoria).join(', '))
  }
  if (a.comanda.productoIds.length) {
    partes.push(
      a.comanda.productoIds.length === 1
        ? `+ ${nombreProducto(a.comanda.productoIds[0]!)}`
        : `+ ${a.comanda.productoIds.length} productos`,
    )
  }
  return partes.join(' ')
}

function alternarCategoria(a: NuevaArea, id: string, marcado: boolean) {
  const lista = a.comanda.categoriaIds.filter((c) => c !== id)
  a.comanda.categoriaIds = marcado ? [...lista, id] : lista
}

function opcionesProductoSuelto(a: NuevaArea): OpcionSelect[] {
  return productos.value
    .filter(
      (p) =>
        !a.comanda.productoIds.includes(p.id) && !a.comanda.categoriaIds.includes(p.categoriaId),
    )
    .map((p) => ({ valor: p.id, etiqueta: `${p.nombre} · ${nombreCategoria(p.categoriaId)}` }))
}

function agregarProducto(a: NuevaArea, id: string | number | undefined) {
  if (id && !a.comanda.productoIds.includes(String(id))) a.comanda.productoIds.push(String(id))
}

// ── Impresoras ──
const columnasImpresoras: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Impresora', ordenable: true },
  { clave: 'localId', etiqueta: 'Local', clase: 'w-36', ordenable: true },
  { clave: 'uso', etiqueta: 'Uso', clase: 'w-36', ordenable: true },
  { clave: 'conexion', etiqueta: 'Conexión', clase: 'w-44' },
]

const nuevaImpresora = (): NuevaImpresora => ({
  nombre: '',
  localId: opcionesLocal.value[0]?.valor as string,
  uso: 'comandas',
  ancho: '80mm',
  conexion: 'red',
  direccionIp: '',
  activo: true,
})

function validarImpresora(i: NuevaImpresora) {
  const e: Record<string, string> = {}
  if (!i.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (!i.localId) e.localId = 'Elige un local.'
  if (i.conexion === 'red' && !validarIpv4(i.direccionIp ?? '')) {
    e.direccionIp = 'Ingresa una IP válida, p. ej. 192.168.1.50.'
  }
  return e
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
    <KmCard
      titulo="Áreas e impresoras"
      subtitulo="Dónde se prepara cada producto, a qué área llega su comanda y en qué impresora sale."
    >
      <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Áreas e impresoras">
        <div v-if="pestana === 'areas'" class="flex flex-col gap-5">
          <!-- Revisión: todo producto debe llegar a un área -->
          <section
            class="flex flex-col gap-3 rounded-card border border-linea bg-panel-2 p-4"
            aria-label="Revisión de comandas"
          >
            <div class="flex flex-wrap items-center gap-3">
              <p class="text-sm font-semibold text-tinta">Revisión de comandas</p>
              <div class="w-full sm:w-48">
                <KmSelect
                  v-model="localRevision"
                  :opciones="opcionesLocal"
                  etiqueta="Local a revisar"
                />
              </div>
              <span class="text-xs text-tenue">
                {{ areasDelLocal.length }} áreas reciben comandas en este local
              </span>
            </div>

            <p
              v-if="!cobertura.sinArea.length && !cobertura.enVarias.length"
              class="rs-tono rs-tono-verde rounded-control border px-3 py-2 text-sm"
              role="status"
            >
              Todos los productos llegan a un área, y a una sola.
            </p>
            <div
              v-if="cobertura.sinArea.length"
              class="rs-tono rs-tono-vino flex flex-col gap-1.5 rounded-control border px-3 py-2 text-sm"
              role="alert"
            >
              <strong>
                {{ cobertura.sinArea.length }}
                {{ cobertura.sinArea.length === 1 ? 'producto no llega' : 'productos no llegan' }}
                a ninguna área: su comanda no saldría.
              </strong>
              <span>{{ cobertura.sinArea.map((p) => p.nombre).join(', ') }}</span>
            </div>
            <div
              v-if="cobertura.enVarias.length"
              class="rs-tono rs-tono-laton flex flex-col gap-1.5 rounded-control border px-3 py-2 text-sm"
              role="status"
            >
              <strong>
                {{ cobertura.enVarias.length }}
                {{ cobertura.enVarias.length === 1 ? 'producto sale' : 'productos salen' }}
                en más de un área a la vez.
              </strong>
              <ul class="flex flex-col gap-0.5">
                <li v-for="d in cobertura.enVarias" :key="d.producto.id">
                  {{ d.producto.nombre }}: {{ d.areas.map((a) => a.nombre).join(' y ') }}
                </li>
              </ul>
              <span class="text-xs"
                >Si es a propósito (por ejemplo, barra y cocina), puedes dejarlo.</span
              >
            </div>
          </section>

          <KmCatalogo
            titulo="Áreas"
            entidad="área"
            femenino
            sin-tarjeta
            ancho-drawer="lg"
            :servicio="areasService"
            :consecuencias-estado="dependenciasService.area"
            :columnas="columnasAreas"
            :nuevo="nuevaArea"
            :validar="validarArea"
            :nombre-de="(a: Area) => a.nombre"
            :exportacion="[
              { etiqueta: 'Área', valor: (a: Area) => a.nombre },
              { etiqueta: 'Ubicación', valor: (a: Area) => a.ubicacion },
              { etiqueta: 'Local', valor: (a: Area) => nombreLocal(a.localId) },
              { etiqueta: 'Recibe', valor: (a: Area) => resumenComanda(a) },
              { etiqueta: 'Impresora', valor: (a: Area) => nombreImpresora(a.impresoraId) },
              { etiqueta: 'Activa', valor: (a: Area) => a.activo },
            ]"
            archivo="areas"
            @cambio="cargarReferencias"
          >
            <template #filtros="{ consulta }">
              <div class="w-full sm:w-44">
                <KmSelect
                  :model-value="filtroLocal(consulta).get()"
                  :opciones="filtroLocalOpciones"
                  etiqueta="Filtrar por local"
                  @update:model-value="filtroLocal(consulta).set"
                />
              </div>
            </template>

            <template #col-nombre="{ fila }">
              <p class="font-medium text-tinta">{{ fila.nombre }}</p>
              <p v-if="fila.ubicacion" class="text-xs text-tenue">{{ fila.ubicacion }}</p>
            </template>
            <template #col-localId="{ fila }">{{ nombreLocal(fila.localId) }}</template>
            <template #col-comanda="{ fila }">
              <KmBadge v-if="!fila.recibeComandas" tono="neutro">No recibe comandas</KmBadge>
              <KmBadge v-else-if="fila.comanda.modo === 'todos'" tono="verde" punto>
                Todos los productos
              </KmBadge>
              <span v-else class="text-sm text-tinta">{{ resumenComanda(fila) }}</span>
            </template>
            <template #col-impresoraId="{ fila }">
              <span v-if="nombreImpresora(fila.impresoraId)" class="text-tinta">
                {{ nombreImpresora(fila.impresoraId) }}
              </span>
              <KmBadge v-else-if="fila.recibeComandas" tono="laton" punto>Sin impresora</KmBadge>
              <span v-else class="text-tenue">—</span>
            </template>

            <template #formulario="{ borrador, errores }">
              <div class="grid gap-4 sm:grid-cols-2">
                <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
                  <KmInput
                    :id="id"
                    v-model="borrador.nombre"
                    placeholder="Ej. Cocina caliente"
                    :invalido="invalido"
                  />
                </KmField>
                <KmField
                  v-slot="{ id }"
                  label="Ubicación"
                  ayuda="Piso, sala o zona. Distingue áreas con el mismo nombre."
                >
                  <KmInput :id="id" v-model="borrador.ubicacion" placeholder="Ej. Segundo piso" />
                </KmField>
                <KmField v-slot="{ id, invalido }" label="Local" requerido :error="errores.localId">
                  <KmSelect
                    :id="id"
                    v-model="borrador.localId"
                    :opciones="opcionesLocal"
                    :invalido="invalido"
                    @update:model-value="borrador.impresoraId = ''"
                  />
                </KmField>
                <KmField
                  v-slot="{ id, invalido }"
                  label="Impresora de comandas"
                  ayuda="Solo impresoras de comandas del mismo local."
                  :error="errores.impresoraId"
                >
                  <KmSelect
                    :id="id"
                    v-model="borrador.impresoraId"
                    :opciones="opcionesImpresora(borrador.localId)"
                    :invalido="invalido"
                    :disabled="!borrador.recibeComandas"
                  />
                </KmField>
              </div>

              <section class="flex flex-col gap-4 border-t border-linea pt-5">
                <KmSwitch
                  v-model="borrador.recibeComandas"
                  etiqueta="Recibe comandas"
                  descripcion="Desactívalo en áreas que no preparan pedidos, como recepción o almacén."
                />

                <template v-if="borrador.recibeComandas">
                  <div
                    role="radiogroup"
                    aria-label="Qué productos recibe"
                    class="grid gap-2 sm:grid-cols-2"
                  >
                    <button
                      v-for="modo in [
                        {
                          valor: 'todos',
                          titulo: 'Todos los productos',
                          texto: 'Lo natural si el local tiene una sola cocina.',
                        },
                        {
                          valor: 'seleccionados',
                          titulo: 'Solo algunos',
                          texto: 'Por categoría y, si hace falta, productos sueltos.',
                        },
                      ] as const"
                      :key="modo.valor"
                      type="button"
                      role="radio"
                      :aria-checked="borrador.comanda.modo === modo.valor"
                      class="flex flex-col gap-0.5 rounded-card border px-4 py-3 text-left transition-colors"
                      :class="
                        borrador.comanda.modo === modo.valor
                          ? 'border-accion bg-seleccion'
                          : 'border-linea hover:border-accion'
                      "
                      @click="borrador.comanda.modo = modo.valor"
                    >
                      <span class="text-sm font-semibold text-tinta">{{ modo.titulo }}</span>
                      <span class="text-xs text-tenue">{{ modo.texto }}</span>
                    </button>
                  </div>

                  <p v-if="errores.comanda" class="text-xs font-medium text-vino">
                    {{ errores.comanda }}
                  </p>

                  <template v-if="borrador.comanda.modo === 'seleccionados'">
                    <div class="flex flex-col gap-2">
                      <p class="rs-etiqueta text-laton-texto">Categorías</p>
                      <div class="grid gap-2 sm:grid-cols-2">
                        <div
                          v-for="c in categorias"
                          :key="c.id"
                          class="rounded-control border border-linea px-3 py-2"
                        >
                          <KmCheckbox
                            :model-value="borrador.comanda.categoriaIds.includes(c.id)"
                            :ayuda="`${productosDe(c.id)} productos`"
                            @update:model-value="alternarCategoria(borrador, c.id, $event)"
                          >
                            {{ c.nombre }}
                          </KmCheckbox>
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-col gap-2">
                      <p class="rs-etiqueta text-laton-texto">Productos sueltos</p>
                      <p class="text-xs text-tenue">
                        Para un producto de otra categoría que también se prepara aquí.
                      </p>
                      <ul v-if="borrador.comanda.productoIds.length" class="flex flex-wrap gap-1.5">
                        <li
                          v-for="pid in borrador.comanda.productoIds"
                          :key="pid"
                          class="flex items-center gap-1.5 rounded-full border border-linea bg-panel py-1 pr-1 pl-2.5 text-xs text-tinta"
                        >
                          {{ nombreProducto(pid) }}
                          <button
                            type="button"
                            class="grid size-5 place-items-center rounded-full text-tenue hover:bg-vino/10 hover:text-vino"
                            :aria-label="`Quitar ${nombreProducto(pid)}`"
                            @click="
                              borrador.comanda.productoIds = borrador.comanda.productoIds.filter(
                                (x) => x !== pid,
                              )
                            "
                          >
                            ×
                          </button>
                        </li>
                      </ul>
                      <KmSelect
                        :model-value="undefined"
                        placeholder="Añadir producto…"
                        :opciones="opcionesProductoSuelto(borrador)"
                        etiqueta="Añadir producto suelto"
                        @update:model-value="agregarProducto(borrador, $event)"
                      />
                    </div>
                  </template>
                </template>
              </section>
            </template>
          </KmCatalogo>
        </div>

        <KmCatalogo
          v-else
          titulo="Impresoras"
          entidad="impresora"
          femenino
          sin-tarjeta
          :servicio="impresorasService"
          :consecuencias-estado="dependenciasService.impresora"
          :columnas="columnasImpresoras"
          :nuevo="nuevaImpresora"
          :validar="validarImpresora"
          :nombre-de="(i: Impresora) => i.nombre"
          :exportacion="[
            { etiqueta: 'Impresora', valor: (i: Impresora) => i.nombre },
            { etiqueta: 'Local', valor: (i: Impresora) => nombreLocal(i.localId) },
            { etiqueta: 'Uso', valor: (i: Impresora) => etiquetaUsoImpresora[i.uso] },
            { etiqueta: 'Ancho', valor: (i: Impresora) => i.ancho },
            { etiqueta: 'Conexión', valor: (i: Impresora) => i.conexion },
            { etiqueta: 'IP', valor: (i: Impresora) => i.direccionIp },
            { etiqueta: 'Activa', valor: (i: Impresora) => i.activo },
          ]"
          archivo="impresoras"
          @cambio="cargarReferencias"
        >
          <template #filtros="{ consulta }">
            <div class="w-full sm:w-44">
              <KmSelect
                :model-value="filtroLocal(consulta).get()"
                :opciones="filtroLocalOpciones"
                etiqueta="Filtrar por local"
                @update:model-value="filtroLocal(consulta).set"
              />
            </div>
          </template>

          <template #col-nombre="{ fila }">
            <p class="font-medium text-tinta">{{ fila.nombre }}</p>
            <p class="text-xs text-tenue">Papel de {{ fila.ancho }}</p>
          </template>
          <template #col-localId="{ fila }">{{ nombreLocal(fila.localId) }}</template>
          <template #col-uso="{ fila }">
            <KmBadge>{{ etiquetaUsoImpresora[fila.uso] }}</KmBadge>
          </template>
          <template #col-conexion="{ fila }">
            <span v-if="fila.conexion === 'red'" class="font-mono text-xs text-tinta">
              {{ fila.direccionIp }}
            </span>
            <span v-else class="text-sm text-tenue">USB</span>
          </template>

          <template #formulario="{ borrador, errores }">
            <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
              <KmInput
                :id="id"
                v-model="borrador.nombre"
                placeholder="Ej. Cocina caliente"
                :invalido="invalido"
              />
            </KmField>
            <div class="grid grid-cols-2 gap-4">
              <KmField v-slot="{ id, invalido }" label="Local" requerido :error="errores.localId">
                <KmSelect
                  :id="id"
                  v-model="borrador.localId"
                  :opciones="opcionesLocal"
                  :invalido="invalido"
                />
              </KmField>
              <KmField v-slot="{ id }" label="Uso">
                <KmSelect :id="id" v-model="borrador.uso" :opciones="opcionesUsoImpresora" />
              </KmField>
              <KmField v-slot="{ id }" label="Ancho de papel">
                <KmSelect
                  :id="id"
                  v-model="borrador.ancho"
                  :opciones="[
                    { valor: '80mm', etiqueta: '80 mm' },
                    { valor: '58mm', etiqueta: '58 mm' },
                  ]"
                />
              </KmField>
              <KmField v-slot="{ id }" label="Conexión">
                <KmSelect
                  :id="id"
                  v-model="borrador.conexion"
                  :opciones="[
                    { valor: 'red', etiqueta: 'Red (IP)' },
                    { valor: 'usb', etiqueta: 'USB' },
                  ]"
                />
              </KmField>
            </div>
            <KmField
              v-if="borrador.conexion === 'red'"
              v-slot="{ id, invalido }"
              label="Dirección IP"
              requerido
              :error="errores.direccionIp"
            >
              <KmInput
                :id="id"
                v-model="borrador.direccionIp"
                inputmode="decimal"
                placeholder="192.168.1.50"
                :invalido="invalido"
              />
            </KmField>
          </template>
        </KmCatalogo>
      </KmTabs>
    </KmCard>
  </div>
</template>
