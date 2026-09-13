<script setup lang="ts">
import { computed } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmTarjetaPlato from '@/components/ui/KmTarjetaPlato.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmUploadImagen from '@/components/ui/KmUploadImagen.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { combosService } from '@/services/combos.service'
import { useUiStore } from '@/stores/ui.store'
import type { Combo, DiaSemana, NuevoCombo } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { etiquetaDia, etiquetaTipoCombo } from '@/utils/configuracion'
import { formatearSoles } from '@/utils/formato'

const ui = useUiStore()
const { productos, producto } = useCatalogos(['productos'])

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Combo o menú', ordenable: true },
  { clave: 'tipo', etiqueta: 'Tipo', clase: 'w-36', ordenable: true },
  { clave: 'dias', etiqueta: 'Días', clase: 'w-40' },
  { clave: 'precio', etiqueta: 'Precio', clase: 'w-40 text-right', ordenable: true },
]

const dias = [0, 1, 2, 3, 4, 5, 6] as DiaSemana[]

let contador = 0
const nuevo = (): NuevoCombo => ({
  tipo: 'combo',
  nombre: '',
  descripcion: '',
  precio: 0,
  grupos: [{ id: `g-nuevo-${++contador}`, nombre: '', opciones: [] }],
  dias: [],
  activo: true,
})

const opcionesProducto = computed<OpcionSelect[]>(() =>
  productos.value.map((p) => ({
    valor: p.id,
    etiqueta: `${p.nombre} · ${formatearSoles(p.precio)}`,
  })),
)

/** Suma de la opción más barata de cada parte: lo que costaría pedirlo suelto. */
function sueltos(grupos: NuevoCombo['grupos']) {
  return grupos.reduce((t, g) => {
    const precios = g.opciones.map((id) => producto(id)?.precio).filter((p) => p !== undefined)
    return t + (precios.length ? Math.min(...(precios as number[])) : 0)
  }, 0)
}

function textoDias(lista: DiaSemana[]) {
  if (lista.length === 0 || lista.length === 7) return 'Todos los días'
  return lista.map((d) => etiquetaDia[d].slice(0, 3)).join(', ')
}

function alternarDia(c: NuevoCombo, d: DiaSemana) {
  c.dias = c.dias.includes(d) ? c.dias.filter((x) => x !== d) : [...c.dias, d].sort()
}

function agregarOpcion(g: NuevoCombo['grupos'][number], id: string | number | undefined) {
  if (id && !g.opciones.includes(String(id))) g.opciones.push(String(id))
}

function validar(c: NuevoCombo): Record<string, string> {
  const e: Record<string, string> = {}
  c.precio = Number(c.precio) || 0
  if (!c.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (!(c.precio > 0)) e.precio = 'El precio debe ser mayor que cero.'
  if (c.grupos.length === 0) e.grupos = 'Añade al menos una parte.'
  else if (c.grupos.some((g) => !g.nombre.trim())) e.grupos = 'Cada parte necesita un nombre.'
  else if (c.grupos.some((g) => g.opciones.length === 0)) {
    e.grupos = 'Cada parte necesita al menos un producto.'
  }
  if (c.tipo === 'menuDia' && c.dias.length === 0) e.dias = 'Elige los días del menú.'
  return e
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCatalogo
      titulo="Combos y menús"
      subtitulo="Productos agrupados a un precio cerrado: menú del día, combos y promociones."
      entidad="combo"
      :servicio="combosService"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(c: Combo) => c.nombre"
      :exportacion="[
        { etiqueta: 'Nombre', valor: (c: Combo) => c.nombre },
        { etiqueta: 'Tipo', valor: (c: Combo) => etiquetaTipoCombo[c.tipo] },
        { etiqueta: 'Días', valor: (c: Combo) => textoDias(c.dias) },
        { etiqueta: 'Precio', valor: (c: Combo) => c.precio },
        { etiqueta: 'Precio suelto', valor: (c: Combo) => sueltos(c.grupos) },
        { etiqueta: 'Activo', valor: (c: Combo) => c.activo },
      ]"
      archivo="combos"
      ancho-drawer="lg"
    >
      <template #col-nombre="{ fila }">
        <div class="flex items-start gap-3">
          <img
            v-if="fila.imagen"
            :src="fila.imagen"
            alt=""
            class="size-10 rounded-control object-cover"
          />
          <div class="min-w-0">
            <p class="font-medium text-tinta">{{ fila.nombre }}</p>
            <p class="text-xs text-tenue">{{ fila.grupos.map((g) => g.nombre).join(' + ') }}</p>
          </div>
        </div>
      </template>
      <template #col-tipo="{ fila }">
        <KmBadge :tono="fila.tipo === 'menuDia' ? 'laton' : 'neutro'">
          {{ etiquetaTipoCombo[fila.tipo] }}
        </KmBadge>
      </template>
      <template #col-dias="{ fila }">
        <span class="text-sm text-tenue">{{ textoDias(fila.dias) }}</span>
      </template>
      <template #col-precio="{ fila }">
        <p class="font-semibold text-tinta tabular-nums">{{ formatearSoles(fila.precio) }}</p>
        <p v-if="sueltos(fila.grupos) > fila.precio" class="text-xs text-verde tabular-nums">
          Ahorra {{ formatearSoles(sueltos(fila.grupos) - fila.precio) }}
        </p>
      </template>

      <template #tarjeta="{ fila, editar, eliminar }">
        <KmTarjetaPlato
          ancha
          :nombre="fila.nombre"
          :imagen="fila.imagen"
          :precio="formatearSoles(fila.precio)"
          :marca="`${etiquetaTipoCombo[fila.tipo]} · ${textoDias(fila.dias)}`"
          :detalle="
            fila.grupos
              .map((g) => g.opciones.map((id) => producto(id)?.nombre ?? '—').join(' o '))
              .join(' + ')
          "
          :cinta="fila.activo ? undefined : 'Inactivo'"
          :eliminable="!!eliminar"
          @editar="editar"
          @eliminar="eliminar?.()"
        />
      </template>

      <template #formulario="{ borrador, errores }">
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
            <KmInput
              :id="id"
              v-model="borrador.nombre"
              placeholder="Ej. Menú ejecutivo"
              :invalido="invalido"
            />
          </KmField>
          <KmField v-slot="{ id }" label="Tipo">
            <KmSelect
              :id="id"
              v-model="borrador.tipo"
              :opciones="[
                { valor: 'combo', etiqueta: 'Combo' },
                { valor: 'menuDia', etiqueta: 'Menú del día' },
              ]"
            />
          </KmField>
        </div>
        <KmField v-slot="{ id }" label="Descripción">
          <KmInput :id="id" v-model="borrador.descripcion" />
        </KmField>

        <!-- Partes -->
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="rs-etiqueta text-laton-texto">Partes del combo</p>
              <p class="mt-1 text-xs text-tenue">
                Una parte con un producto es fija; con varios, el cliente elige uno.
              </p>
            </div>
            <KmButton
              variante="secundario"
              tamano="sm"
              @click="
                borrador.grupos.push({ id: `g-nuevo-${Date.now()}`, nombre: '', opciones: [] })
              "
            >
              Añadir parte
            </KmButton>
          </div>
          <p v-if="errores.grupos" class="text-xs font-medium text-vino">{{ errores.grupos }}</p>

          <div
            v-for="(g, i) in borrador.grupos"
            :key="g.id"
            class="flex flex-col gap-2 rounded-card border border-linea bg-panel-2 p-3"
          >
            <div class="flex items-center gap-2">
              <KmInput v-model="g.nombre" placeholder="Ej. Entrada" />
              <KmBotonIcono
                icono="eliminar"
                tono="peligro"
                etiqueta="Quitar parte"
                :contexto="g.nombre"
                @click="borrador.grupos.splice(i, 1)"
              />
            </div>
            <ul class="flex flex-wrap gap-1.5">
              <li
                v-for="pid in g.opciones"
                :key="pid"
                class="flex items-center gap-1.5 rounded-full border border-linea bg-panel py-1 pr-1 pl-2.5 text-xs text-tinta"
              >
                {{ producto(pid)?.nombre ?? 'Producto eliminado' }}
                <button
                  type="button"
                  class="grid size-5 place-items-center rounded-full text-tenue hover:bg-vino/10 hover:text-vino"
                  :aria-label="`Quitar ${producto(pid)?.nombre ?? ''}`"
                  @click="g.opciones = g.opciones.filter((x) => x !== pid)"
                >
                  ×
                </button>
              </li>
            </ul>
            <KmSelect
              :model-value="undefined"
              placeholder="Añadir producto…"
              :opciones="opcionesProducto.filter((o) => !g.opciones.includes(String(o.valor)))"
              etiqueta="Añadir producto"
              @update:model-value="agregarOpcion(g, $event)"
            />
          </div>
        </section>

        <!-- Precio -->
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField
            v-slot="{ id, invalido }"
            label="Precio del combo"
            requerido
            :error="errores.precio"
          >
            <KmNumero
              :id="id"
              v-model="borrador.precio"
              :min="0"
              :decimales="2"
              prefijo="S/"
              :invalido="invalido"
            />
          </KmField>
          <div
            class="flex flex-col justify-center rounded-card border border-dashed border-linea px-4 py-2 text-sm"
          >
            <span class="text-tenue"
              >Pedido suelto: {{ formatearSoles(sueltos(borrador.grupos)) }}</span
            >
            <span
              v-if="Number(borrador.precio) > 0"
              class="font-semibold tabular-nums"
              :class="
                sueltos(borrador.grupos) > Number(borrador.precio) ? 'text-verde' : 'text-vino'
              "
            >
              {{
                sueltos(borrador.grupos) > Number(borrador.precio)
                  ? `El cliente ahorra ${formatearSoles(sueltos(borrador.grupos) - Number(borrador.precio))}`
                  : 'El combo sale más caro que pedirlo suelto'
              }}
            </span>
          </div>
        </div>

        <!-- Días -->
        <KmField
          label="Días en que se ofrece"
          :error="errores.dias"
          :ayuda="borrador.tipo === 'combo' ? 'Sin días marcados, se ofrece siempre.' : undefined"
        >
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Días">
            <button
              v-for="d in dias"
              :key="d"
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
              :class="
                borrador.dias.includes(d)
                  ? 'border-rail bg-rail text-rail-tinta'
                  : 'border-linea text-tenue hover:border-verde hover:text-tinta'
              "
              :aria-pressed="borrador.dias.includes(d)"
              @click="alternarDia(borrador, d)"
            >
              {{ etiquetaDia[d].slice(0, 3) }}
            </button>
          </div>
        </KmField>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-tinta">Foto</span>
          <KmUploadImagen v-model="borrador.imagen" etiqueta="Foto del combo" @error="ui.error" />
        </div>
      </template>
    </KmCatalogo>
  </div>
</template>
