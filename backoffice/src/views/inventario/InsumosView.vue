<script setup lang="ts">
import { computed, ref } from 'vue'
import VinculosArticulo from './VinculosArticulo.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo, { type ServicioCatalogo } from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { estadoStock, inventarioService } from '@/services/inventario.service'
import type { CategoriaInsumo, Consulta, Insumo, TipoAbastecimiento } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import {
  etiquetaCategoriaInsumo,
  etiquetaUnidad,
  formatearCantidad,
  formatearSoles,
  unidadesMedida,
} from '@/utils/formato'

const catalogos = useCatalogos(['zonas', 'insumos', 'locales', 'articulos'])
const { articulo, nombreZona } = catalogos

/** Artículo que se propone al pedir: el marcado por defecto, o el primero. */
function articuloPorDefecto(i: Insumo) {
  const vinculo = i.articulos.find((v) => v.porDefecto) ?? i.articulos[0]
  return vinculo ? articulo(vinculo.articuloId) : undefined
}

/** Adaptador: la ficha no toca el stock; el alta carga el stock inicial como entrada. */
const servicio: ServicioCatalogo<Insumo> = {
  consultar: (c) => inventarioService.consultarInsumos(c),
  crear: ({ stock, existencias: _e, ...d }) =>
    inventarioService.crearInsumo({ ...d, stockInicial: Number(stock) || 0 }, zonaInicial.value),
  actualizar: (id, { stock: _s, existencias: _e, ...d }) =>
    inventarioService.actualizarInsumo(id, d),
  eliminar: (id) => inventarioService.eliminarInsumo(id),
}

const zonaInicial = ref('')

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Insumo', ordenable: true },
  { clave: 'stock', etiqueta: 'Stock', clase: 'w-44 text-right', ordenable: true },
  { clave: 'costoUnitario', etiqueta: 'Costo', clase: 'w-32 text-right', ordenable: true },
  { clave: 'valor', etiqueta: 'Valorizado', clase: 'w-32 text-right' },
]

const tonoEstado = { agotado: 'vino', bajo: 'laton', ok: 'verde' } as const
const textoEstado = { agotado: 'Agotado', bajo: 'Bajo mínimo', ok: 'Normal' } as const

const opcionesUnidad: OpcionSelect[] = unidadesMedida.map((u) => ({
  valor: u,
  etiqueta: `${u} · ${etiquetaUnidad[u]}`,
}))
const opcionesCategoria: OpcionSelect[] = (
  Object.keys(etiquetaCategoriaInsumo) as CategoriaInsumo[]
).map((c) => ({ valor: c, etiqueta: etiquetaCategoriaInsumo[c] }))
const opcionesAbastecimiento: OpcionSelect[] = [
  { valor: 'directa', etiqueta: 'Comprable: conversión directa desde el artículo' },
  { valor: 'transformacion', etiqueta: 'Producible: sale de una transformación' },
  { valor: 'ambos', etiqueta: 'Comprable y producible' },
]
const etiquetaAbastecimiento: Record<TipoAbastecimiento, string> = {
  directa: 'Comprable',
  transformacion: 'Producible',
  ambos: 'Comprable y producible',
}
const opcionesZonaFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todas las zonas' },
  ...catalogos.opcionesZona.value,
])

function nuevo(): Omit<Insumo, 'id'> {
  zonaInicial.value = (catalogos.opcionesZona.value[0]?.valor as string) ?? ''
  return {
    nombre: '',
    unidad: 'kg',
    categoria: 'abarrotes',
    stock: 0,
    existencias: [],
    stockMinimo: 0,
    costoUnitario: 0,
    abastecimiento: 'directa',
    articulos: [],
    activo: true,
  }
}

function validar(i: Omit<Insumo, 'id'>): Record<string, string> {
  const e: Record<string, string> = {}
  if (!i.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (!(Number(i.stockMinimo) >= 0)) e.stockMinimo = 'No puede ser negativo.'
  if (!(Number(i.costoUnitario) >= 0)) e.costoUnitario = 'No puede ser negativo.'
  if (i.abastecimiento === 'transformacion' && i.articulos.length > 0) {
    e.articulos = 'Lo que sale de una transformación no se compra: quita sus artículos.'
  }
  if (i.articulos.some((v) => !v.articuloId)) e.articulos = 'Elige el artículo de cada fila.'
  if (i.articulos.some((v) => !(Number(v.factor) > 0))) {
    e.articulos = 'El factor de conversión debe ser mayor que cero.'
  }
  return e
}

function filtrar(consulta: Consulta, campo: string, valor: string | number | undefined) {
  consulta.filtros = { ...consulta.filtros, [campo]: valor || undefined }
}

const alertas = computed(() =>
  catalogos.insumos.value.filter((i) => i.activo && estadoStock(i.stock, i.stockMinimo) !== 'ok'),
)

/**
 * Nivel de la barra. El mínimo se sitúa siempre a media barra: así «por debajo
 * de la mitad» significa lo mismo en un saco de harina que en un limón, por
 * mucho que sus cantidades no se parezcan en nada.
 */
function nivel(i: Insumo) {
  const tope = Math.max(i.stockMinimo * 2, i.stock, 1)
  return Math.min(100, (i.stock / tope) * 100)
}

/**
 * Dónde está físicamente el insumo. Es el dato que no cabe en una tabla y el
 * que de verdad se necesita: un cocinero no busca una fila, camina la cámara,
 * el almacén seco y la barra, y quiere saber en cuál de los tres mirar.
 */
function reparto(i: Insumo) {
  return i.existencias
    .filter((e) => e.cantidad > 0)
    .map((e) => ({
      zona: nombreZona(e.zonaId),
      cantidad: e.cantidad,
      porcentaje: i.stock > 0 ? (e.cantidad / i.stock) * 100 : 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div
      v-if="alertas.length"
      class="rs-tono rs-tono-laton flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border px-4 py-3 text-sm"
      role="status"
    >
      <strong>{{ alertas.length }} insumos necesitan reposición:</strong>
      <span
        >{{
          alertas
            .slice(0, 5)
            .map((i) => i.nombre)
            .join(', ')
        }}{{ alertas.length > 5 ? '…' : '' }}</span
      >
    </div>

    <KmCatalogo
      titulo="Insumos"
      subtitulo="Materia prima y preparaciones, con su stock por zona y su costo promedio."
      entidad="insumo"
      :servicio="servicio"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(i: Insumo) => i.nombre"
      :orden="{ campo: 'nombre', direccion: 'asc' }"
      vista-por-defecto="tarjetas"
      :exportacion="[
        { etiqueta: 'Insumo', valor: (i: Insumo) => i.nombre },
        { etiqueta: 'Categoría', valor: (i: Insumo) => etiquetaCategoriaInsumo[i.categoria] },
        { etiqueta: 'Unidad', valor: (i: Insumo) => i.unidad },
        { etiqueta: 'Stock', valor: (i: Insumo) => i.stock },
        { etiqueta: 'Mínimo', valor: (i: Insumo) => i.stockMinimo },
        { etiqueta: 'Costo unitario', valor: (i: Insumo) => i.costoUnitario },
        {
          etiqueta: 'Valorizado',
          valor: (i: Insumo) => Math.round(i.stock * i.costoUnitario * 100) / 100,
        },
        {
          etiqueta: 'Abastecimiento',
          valor: (i: Insumo) => etiquetaAbastecimiento[i.abastecimiento],
        },
        {
          etiqueta: 'Artículo por defecto',
          valor: (i: Insumo) => articuloPorDefecto(i)?.nombre ?? '',
        },
        { etiqueta: 'Artículos alternos', valor: (i: Insumo) => i.articulos.length },
      ]"
      archivo="insumos"
      @cambio="catalogos.recargar"
    >
      <template #filtros="{ consulta }">
        <div class="w-full sm:w-48">
          <KmSelect
            :model-value="(consulta.filtros?.zonaId as string) ?? ''"
            :opciones="opcionesZonaFiltro"
            etiqueta="Filtrar por zona"
            @update:model-value="filtrar(consulta, 'zonaId', $event)"
          />
        </div>
        <div class="w-full sm:w-44">
          <KmSelect
            :model-value="(consulta.filtros?.estadoStock as string) ?? ''"
            :opciones="[
              { valor: '', etiqueta: 'Todo el stock' },
              { valor: 'bajo', etiqueta: 'Bajo mínimo' },
              { valor: 'agotado', etiqueta: 'Agotado' },
              { valor: 'ok', etiqueta: 'Normal' },
            ]"
            etiqueta="Filtrar por nivel de stock"
            @update:model-value="filtrar(consulta, 'estadoStock', $event)"
          />
        </div>
      </template>

      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p class="text-xs text-tenue">
          {{ etiquetaCategoriaInsumo[fila.categoria] }}
          <template v-if="fila.abastecimiento === 'transformacion'"> · Transformación</template>
          <template v-else-if="articuloPorDefecto(fila)">
            · {{ articuloPorDefecto(fila)!.codigo }}
            <template v-if="fila.articulos.length > 1">
              (+{{ fila.articulos.length - 1 }} alterno{{ fila.articulos.length > 2 ? 's' : '' }})
            </template>
          </template>
          <template v-else> · Sin artículo</template>
        </p>
      </template>
      <template #col-stock="{ fila }">
        <p class="font-semibold text-tinta tabular-nums">
          {{ formatearCantidad(fila.stock, fila.unidad) }}
        </p>
        <div class="mt-1 flex justify-end">
          <KmBadge :tono="tonoEstado[estadoStock(fila.stock, fila.stockMinimo)]" punto>
            {{ textoEstado[estadoStock(fila.stock, fila.stockMinimo)] }}
          </KmBadge>
        </div>
      </template>
      <template #col-costoUnitario="{ fila }">
        <span class="tabular-nums">{{ formatearSoles(fila.costoUnitario) }}</span>
      </template>
      <template #col-valor="{ fila }">
        <span class="text-tenue tabular-nums">{{
          formatearSoles(fila.stock * fila.costoUnitario)
        }}</span>
      </template>

      <!--
        La tarjeta de despensa. Lo que se mira no es el nombre: es cuánto queda
        respecto del mínimo y en qué zona está, que es lo que decide si hay que
        pedir o solo hay que ir a buscarlo.
      -->
      <template #tarjeta="{ fila, editar, eliminar }">
        <article
          class="group flex flex-col rounded-card border bg-panel p-4 transition-colors"
          :class="
            estadoStock(fila.stock, fila.stockMinimo) === 'agotado'
              ? 'border-vino/45'
              : estadoStock(fila.stock, fila.stockMinimo) === 'bajo'
                ? 'border-verde/45'
                : 'border-linea hover:border-laton'
          "
        >
          <header class="flex items-start justify-between gap-3">
            <p class="min-w-0 truncate font-medium text-tinta">{{ fila.nombre }}</p>
            <KmBadge tono="neutro">{{ etiquetaCategoriaInsumo[fila.categoria] }}</KmBadge>
          </header>

          <div class="mt-4">
            <div class="flex items-baseline justify-between">
              <p class="rs-display text-2xl leading-none font-semibold text-tinta tabular-nums">
                {{ formatearCantidad(fila.stock, fila.unidad) }}
              </p>
              <p class="text-[11px] text-tenue tabular-nums">
                mín. {{ formatearCantidad(fila.stockMinimo, fila.unidad) }}
              </p>
            </div>

            <div class="relative mt-2 h-2 overflow-hidden rounded-full bg-panel-2">
              <div
                class="h-full rounded-full transition-[width] duration-500"
                :class="
                  estadoStock(fila.stock, fila.stockMinimo) === 'agotado'
                    ? 'bg-vino'
                    : estadoStock(fila.stock, fila.stockMinimo) === 'bajo'
                      ? 'bg-laton'
                      : 'bg-verde'
                "
                :style="{ width: `${nivel(fila)}%` }"
              />
              <span class="absolute inset-y-0 left-1/2 w-px bg-tinta/35" aria-hidden="true" />
            </div>
          </div>

          <!--
            Solo se marca la excepción. En una rejilla de doce, una insignia
            «Normal» repetida diez veces tapa justo la que hay que ver; lo
            normal ya lo dicen la cifra y la barra.
          -->
          <div v-if="estadoStock(fila.stock, fila.stockMinimo) !== 'ok'" class="mt-3">
            <KmBadge :tono="tonoEstado[estadoStock(fila.stock, fila.stockMinimo)]" punto>
              {{ textoEstado[estadoStock(fila.stock, fila.stockMinimo)] }}
            </KmBadge>
          </div>

          <!-- Dónde está: el reparto por zona, en una sola línea. -->
          <ul v-if="reparto(fila).length" class="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            <li v-for="z in reparto(fila)" :key="z.zona" class="text-[11px] text-tenue">
              <span class="font-semibold text-tinta">
                {{ formatearCantidad(z.cantidad, fila.unidad) }}
              </span>
              en {{ z.zona }}
            </li>
          </ul>
          <p v-else class="mt-3 text-[11px] text-tenue">Sin existencias en ninguna zona.</p>

          <footer class="mt-auto flex items-end justify-between gap-3 pt-4">
            <p class="text-sm text-tinta tabular-nums">
              {{ formatearSoles(fila.stock * fila.costoUnitario) }}
              <span class="text-[11px] text-tenue">valorizado</span>
            </p>
            <span
              class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
            >
              <KmBotonIcono
                icono="editar"
                etiqueta="Editar"
                :contexto="fila.nombre"
                @click="editar"
              />
              <KmBotonIcono
                v-if="eliminar"
                icono="eliminar"
                etiqueta="Eliminar"
                :contexto="fila.nombre"
                tono="peligro"
                @click="eliminar"
              />
            </span>
          </footer>
        </article>
      </template>

      <template #formulario="{ borrador, errores, editando }">
        <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
          <KmInput
            :id="id"
            v-model="borrador.nombre"
            placeholder="Ej. Limón sutil"
            :invalido="invalido"
          />
        </KmField>
        <div class="grid grid-cols-2 gap-4">
          <KmField v-slot="{ id }" label="Categoría">
            <KmSelect :id="id" v-model="borrador.categoria" :opciones="opcionesCategoria" />
          </KmField>
          <KmField
            v-slot="{ id }"
            label="Unidad"
            :ayuda="editando ? 'Cambiarla no convierte el stock.' : undefined"
          >
            <KmSelect :id="id" v-model="borrador.unidad" :opciones="opcionesUnidad" />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Stock mínimo"
            :error="errores.stockMinimo"
            ayuda="Por debajo se avisa."
          >
            <KmNumero
              :id="id"
              v-model="borrador.stockMinimo"
              :min="0"
              :decimales="3"
              :sufijo="etiquetaUnidad[borrador.unidad]"
              :invalido="invalido"
            />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Costo unitario"
            :error="errores.costoUnitario"
            :ayuda="
              borrador.abastecimiento === 'transformacion'
                ? 'Lo calcula su transformación.'
                : 'Sin IGV.'
            "
          >
            <KmNumero
              :id="id"
              v-model="borrador.costoUnitario"
              :min="0"
              :decimales="2"
              prefijo="S/"
              :disabled="borrador.abastecimiento === 'transformacion'"
              :invalido="invalido"
            />
          </KmField>
        </div>

        <KmField
          v-slot="{ id }"
          label="Cómo se abastece"
          ayuda="Cómo se llega desde lo que compra el ERP hasta la unidad de uso."
        >
          <KmSelect :id="id" v-model="borrador.abastecimiento" :opciones="opcionesAbastecimiento" />
        </KmField>

        <VinculosArticulo
          v-if="borrador.abastecimiento !== 'transformacion'"
          v-model="borrador.articulos"
          :articulos="catalogos.articulos.value"
          :opciones="catalogos.opcionesArticulo.value"
          :unidad="borrador.unidad"
          :error="errores.articulos"
        />
        <p v-else class="rounded-card border border-dashed border-linea p-4 text-sm text-tenue">
          Este insumo no se compra: sale de una transformación (despiece o preparación). Su receta y
          su costo se definen en <strong class="text-tinta">Transformaciones</strong>.
        </p>

        <KmField
          v-slot="{ id }"
          label="Rendimiento al acondicionar"
          ayuda="Lo que queda limpio (pescado fileteado, papa pelada). Se usa en recetas si está activo en Configuración › Recetas y costos."
        >
          <KmNumero
            :id="id"
            :model-value="borrador.rendimientoPorcentaje ?? null"
            :min="1"
            :max="100"
            :decimales="1"
            sufijo="%"
            placeholder="100 %"
            @update:model-value="borrador.rendimientoPorcentaje = $event ?? undefined"
          />
        </KmField>

        <div
          v-if="borrador.abastecimiento !== 'directa'"
          class="grid grid-cols-2 gap-4 rounded-card border border-dashed border-linea p-4"
        >
          <KmField
            v-slot="{ id }"
            label="Vida útil al producirlo"
            ayuda="Propone el vencimiento de cada parte de producción."
          >
            <KmNumero
              :id="id"
              :model-value="borrador.vidaUtilDias ?? null"
              :min="0"
              sufijo="días"
              placeholder="Sin definir"
              @update:model-value="borrador.vidaUtilDias = $event ?? undefined"
            />
          </KmField>
          <KmField
            v-slot="{ id }"
            label="Aprobada por"
            ayuda="Solo se exige si la vida útil está en modo «Validada»."
          >
            <KmInput :id="id" v-model="borrador.vidaUtilAprobadaPor" placeholder="Opcional" />
          </KmField>
        </div>

        <div
          v-if="!editando"
          class="grid grid-cols-2 gap-4 rounded-card border border-dashed border-linea p-4"
        >
          <KmField v-slot="{ id }" label="Stock inicial" ayuda="Se registra como entrada.">
            <KmNumero
              :id="id"
              v-model="borrador.stock"
              :min="0"
              :decimales="3"
              :sufijo="etiquetaUnidad[borrador.unidad]"
            />
          </KmField>
          <KmField v-slot="{ id }" label="En la zona">
            <KmSelect :id="id" v-model="zonaInicial" :opciones="catalogos.opcionesZona.value" />
          </KmField>
        </div>
        <p v-else class="text-xs text-tenue">
          El stock ({{ formatearCantidad(borrador.stock, borrador.unidad) }}) cambia con compras,
          pedidos internos y mermas, nunca editándolo aquí. Su historial está en Movimientos.
        </p>
      </template>
    </KmCatalogo>
  </div>
</template>
