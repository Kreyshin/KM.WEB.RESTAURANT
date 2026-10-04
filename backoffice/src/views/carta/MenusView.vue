<script setup lang="ts">
import { computed } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { useLocales } from '@/composables/useLocales'
import { menuVigente, menusService, productosDelMenu } from '@/services/menus.service'
import type { DiaSemana, Menu, NuevoMenu } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { etiquetaDia } from '@/utils/configuracion'
import { hoyLocal } from '@/utils/fechas'
import { formatearDia } from '@/utils/formato'

/**
 * Menús (D-016): agrupadores de lo que se ofrece. No llevan precio —cada
 * producto se cobra por su lista—, y cada uno trae su vigencia, así que «menú
 * del día» es un menú con vigencia por días y no una pantalla aparte.
 */

const { productos, producto } = useCatalogos(['productos'])
const { opciones: opcionesLocal, nombreLocal } = useLocales()

const hoy = hoyLocal()
const dias = [0, 1, 2, 3, 4, 5, 6] as DiaSemana[]

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Menú', ordenable: true },
  { clave: 'vigencia', etiqueta: 'Cuándo se ofrece', clase: 'w-64' },
  { clave: 'locales', etiqueta: 'Dónde', clase: 'w-44' },
  { clave: 'productos', etiqueta: 'Productos', clase: 'w-28 text-right' },
]

let contador = 0
const nuevo = (): NuevoMenu => ({
  nombre: '',
  descripcion: '',
  localIds: [],
  modoVigencia: 'permanente',
  dias: [],
  secciones: [{ id: `s-nuevo-${++contador}`, nombre: '', productoIds: [] }],
  activo: true,
})

const opcionesModo: OpcionSelect[] = [
  { valor: 'permanente', etiqueta: 'Siempre' },
  { valor: 'dias', etiqueta: 'Ciertos días de la semana' },
  { valor: 'fechas', etiqueta: 'Entre dos fechas' },
]

const opcionesProducto = computed<OpcionSelect[]>(() =>
  productos.value.map((p) => ({ valor: p.id, etiqueta: p.nombre })),
)

function textoVigencia(m: Menu) {
  if (m.modoVigencia === 'permanente') return 'Siempre'
  if (m.modoVigencia === 'dias') {
    if (m.dias.length === 7) return 'Todos los días'
    return m.dias.map((d) => etiquetaDia[d]).join(', ')
  }
  return m.desde && m.hasta ? `${formatearDia(m.desde)} al ${formatearDia(m.hasta)}` : 'Sin fechas'
}

const seOfreceHoy = (m: Menu) => menuVigente(m, hoy)

function textoLocales(m: Menu) {
  return m.localIds.length ? m.localIds.map(nombreLocal).join(', ') : 'Todos los locales'
}

function validar(m: NuevoMenu): Record<string, string> {
  const e: Record<string, string> = {}
  if (!m.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (m.modoVigencia === 'dias' && !m.dias.length) e.dias = 'Elige al menos un día.'
  if (m.modoVigencia === 'fechas') {
    if (!m.desde || !m.hasta) e.vigencia = 'Indica desde cuándo y hasta cuándo.'
    else if (m.desde > m.hasta) e.vigencia = 'El inicio no puede ser posterior al fin.'
  }
  if (!m.secciones.length) e.secciones = 'Añade al menos una sección.'
  else if (m.secciones.some((s) => !s.nombre.trim())) {
    e.secciones = 'Cada sección necesita un nombre.'
  } else if (m.secciones.some((s) => s.productoIds.length === 0)) {
    e.secciones = 'Cada sección necesita al menos un producto.'
  }
  return e
}

function agregarSeccion(m: NuevoMenu) {
  m.secciones.push({ id: `s-nuevo-${++contador}`, nombre: '', productoIds: [] })
}
function quitarSeccion(m: NuevoMenu, i: number) {
  m.secciones.splice(i, 1)
}
function alternarProducto(seccion: NuevoMenu['secciones'][number], id: string, marcado: boolean) {
  seccion.productoIds = marcado
    ? [...seccion.productoIds, id]
    : seccion.productoIds.filter((p) => p !== id)
}
function alternarDia(m: NuevoMenu, d: DiaSemana, marcado: boolean) {
  m.dias = marcado ? [...m.dias, d] : m.dias.filter((x) => x !== d)
}
function alternarLocal(m: NuevoMenu, id: string, marcado: boolean) {
  m.localIds = marcado ? [...m.localIds, id] : m.localIds.filter((l) => l !== id)
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <KmCatalogo
      titulo="Menús"
      subtitulo="Qué se ofrece y cuándo. Cada producto se cobra a su precio de lista: el menú no tiene precio propio."
      entidad="menú"
      :servicio="menusService"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(m: Menu) => m.nombre"
      :exportacion="[
        { etiqueta: 'Menú', valor: (m: Menu) => m.nombre },
        { etiqueta: 'Cuándo', valor: (m: Menu) => textoVigencia(m) },
        { etiqueta: 'Dónde', valor: (m: Menu) => textoLocales(m) },
        { etiqueta: 'Productos', valor: (m: Menu) => productosDelMenu(m) },
        { etiqueta: 'Activo', valor: (m: Menu) => m.activo },
      ]"
      archivo="menus"
      ancho-drawer="lg"
    >
      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p class="text-xs text-tenue">
          {{ fila.secciones.map((s: Menu['secciones'][number]) => s.nombre).join(' · ') }}
        </p>
      </template>

      <template #col-vigencia="{ fila }">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-tenue">{{ textoVigencia(fila) }}</span>
          <KmBadge v-if="seOfreceHoy(fila)" tono="verde" punto>Hoy</KmBadge>
        </div>
      </template>

      <template #col-locales="{ fila }">
        <span class="text-sm text-tenue">{{ textoLocales(fila) }}</span>
      </template>

      <template #col-productos="{ fila }">
        <span class="text-sm text-tinta tabular-nums">{{ productosDelMenu(fila) }}</span>
      </template>

      <template #formulario="{ borrador, errores }">
        <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
          <KmInput
            :id="id"
            v-model="borrador.nombre"
            placeholder="Ej. Menú del día"
            :invalido="invalido"
          />
        </KmField>
        <KmField v-slot="{ id }" label="Descripción">
          <KmInput :id="id" v-model="borrador.descripcion" />
        </KmField>

        <!-- Vigencia -->
        <KmField
          v-slot="{ id }"
          label="Cuándo se ofrece"
          ayuda="Un «menú del día» es este menú con los días de la semana marcados."
        >
          <KmSelect :id="id" v-model="borrador.modoVigencia" :opciones="opcionesModo" />
        </KmField>

        <div v-if="borrador.modoVigencia === 'dias'" class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Días</p>
          <div class="flex flex-wrap gap-3">
            <KmCheckbox
              v-for="d in dias"
              :key="d"
              :model-value="borrador.dias.includes(d)"
              @update:model-value="alternarDia(borrador, d, $event)"
            >
              {{ etiquetaDia[d] }}
            </KmCheckbox>
          </div>
          <p v-if="errores.dias" class="text-xs font-medium text-vino">{{ errores.dias }}</p>
        </div>

        <div v-if="borrador.modoVigencia === 'fechas'" class="flex flex-col gap-1">
          <div class="grid gap-4 sm:grid-cols-2">
            <KmField v-slot="{ id }" label="Desde" requerido>
              <KmFecha
                :id="id"
                :model-value="borrador.desde ?? null"
                @update:model-value="borrador.desde = $event ?? undefined"
              />
            </KmField>
            <KmField v-slot="{ id }" label="Hasta" requerido>
              <KmFecha
                :id="id"
                :model-value="borrador.hasta ?? null"
                @update:model-value="borrador.hasta = $event ?? undefined"
              />
            </KmField>
          </div>
          <p v-if="errores.vigencia" class="text-xs font-medium text-vino">
            {{ errores.vigencia }}
          </p>
        </div>

        <!-- Locales -->
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-tinta">Dónde se ofrece</p>
          <p class="text-xs text-tenue">Sin marcar ninguno, se ofrece en todos los locales.</p>
          <div class="flex flex-wrap gap-3">
            <KmCheckbox
              v-for="l in opcionesLocal"
              :key="l.valor"
              :model-value="borrador.localIds.includes(l.valor as string)"
              @update:model-value="alternarLocal(borrador, l.valor as string, $event)"
            >
              {{ l.etiqueta }}
            </KmCheckbox>
          </div>
        </div>

        <!-- Secciones -->
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="rs-etiqueta text-laton-texto">Secciones</p>
              <p class="mt-1 text-xs text-tenue">
                Entradas, fondos, bebidas... Solo ordenan lo que se ofrece; el precio sigue siendo
                el de cada producto.
              </p>
            </div>
            <KmButton variante="secundario" tamano="sm" @click="agregarSeccion(borrador)">
              Añadir sección
            </KmButton>
          </div>

          <p v-if="errores.secciones" class="text-xs font-medium text-vino">
            {{ errores.secciones }}
          </p>

          <ul class="flex flex-col gap-4">
            <li
              v-for="(s, i) in borrador.secciones"
              :key="s.id"
              class="rounded-card border border-linea bg-panel-2 p-4"
            >
              <div class="flex items-center gap-2">
                <KmInput v-model="s.nombre" class="min-w-0 flex-1" placeholder="Ej. Fondos" />
                <KmBotonIcono
                  icono="eliminar"
                  tono="peligro"
                  etiqueta="Quitar sección"
                  :contexto="s.nombre"
                  @click="quitarSeccion(borrador, i)"
                />
              </div>

              <div class="rs-filete my-3.5" role="presentation"></div>

              <div class="flex flex-wrap gap-x-4 gap-y-2">
                <KmCheckbox
                  v-for="o in opcionesProducto"
                  :key="o.valor"
                  :model-value="s.productoIds.includes(o.valor as string)"
                  @update:model-value="alternarProducto(s, o.valor as string, $event)"
                >
                  {{ o.etiqueta }}
                </KmCheckbox>
              </div>

              <p v-if="s.productoIds.length" class="mt-2.5 text-xs text-tenue">
                {{ s.productoIds.length }} producto(s):
                {{ s.productoIds.map((id: string) => producto(id)?.nombre ?? '—').join(', ') }}
              </p>
            </li>
          </ul>
        </section>
      </template>
    </KmCatalogo>
  </div>
</template>
