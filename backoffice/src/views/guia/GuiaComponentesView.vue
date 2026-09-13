<script setup lang="ts">
import { ref } from 'vue'
import DemoTabla from './DemoTabla.vue'
import GuiaEjemplo from './GuiaEjemplo.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmRangoFechas from '@/components/ui/KmRangoFechas.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import KmUploadImagen from '@/components/ui/KmUploadImagen.vue'
import { useUiStore } from '@/stores/ui.store'
import type { Pestana, RangoFechas } from '@/types/ui'
import { formatearSoles } from '@/utils/formato'
import { rangoDeAtajo } from '@/utils/fechas'

/**
 * Catálogo vivo de los componentes base. Cada ficha muestra la demo, el código
 * de uso y sus props; es la referencia al construir pantallas nuevas.
 */

const ui = useUiStore()

const secciones: Pestana[] = [
  { valor: 'tabla', etiqueta: 'Tabla' },
  { valor: 'pestanas', etiqueta: 'Pestañas' },
  { valor: 'drawer', etiqueta: 'Drawer' },
  { valor: 'fechas', etiqueta: 'Fechas' },
  { valor: 'imagen', etiqueta: 'Imagen' },
  { valor: 'estados', etiqueta: 'Estados' },
  { valor: 'globales', etiqueta: 'Globales' },
]
const seccion = ref('tabla')

// ── Pestañas ──
const pestanasDemo: Pestana[] = [
  { valor: 'pendientes', etiqueta: 'Pendientes', contador: 4 },
  { valor: 'recibidas', etiqueta: 'Recibidas', contador: 12 },
  { valor: 'anuladas', etiqueta: 'Anuladas', contador: 1 },
]
const pestanaDemo = ref('pendientes')
const ordenesDemo: Record<string, string[]> = {
  pendientes: [
    'OC-0142 · Mercado Mayorista',
    'OC-0143 · Pesquera San José',
    'OC-0145 · Distribuidora Andina',
    'OC-0146 · Licores del Sur',
  ],
  recibidas: ['OC-0131 · Mercado Mayorista', 'OC-0133 · Avícola El Rancho', '…y 10 más'],
  anuladas: ['OC-0139 · Pesquera San José (pedido duplicado)'],
}

// ── Drawer ──
const drawerAbierto = ref(false)
const anchoDrawer = ref<'sm' | 'md' | 'lg'>('md')
const insumo = ref({ nombre: 'Limón sutil', unidad: 'kg', stockMinimo: 5 })

function guardarInsumo() {
  drawerAbierto.value = false
  ui.exito('Insumo guardado (demo).')
}

// ── Fechas ──
const rango = ref<RangoFechas>(rangoDeAtajo('ultimos7'))
const fechaSuelta = ref<string | null>('2026-09-12')
const fechaLimitada = ref<string | null>(null)

// ── Imagen ──
const imagen = ref<string>()

const codigoTabs = `<KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Órdenes de compra">
  <ListaOrdenes :estado="pestana" />
</KmTabs>

const pestanas: Pestana[] = [
  { valor: 'pendientes', etiqueta: 'Pendientes', contador: 4 },
  { valor: 'recibidas', etiqueta: 'Recibidas' },
]`

const codigoDrawer = `<KmDrawer v-model="abierto" titulo="Editar insumo" subtitulo="Limón sutil" ancho="md">
  <FormularioInsumo />
  <template #footer>
    <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
    <KmButton @click="guardar">Guardar</KmButton>
  </template>
</KmDrawer>`

const codigoFechas = `<!-- Rango: el modelo es { desde, hasta } en YYYY-MM-DD -->
<KmRangoFechas v-model="rango" />

<!-- Fecha suelta: el modelo es 'YYYY-MM-DD' o null -->
<KmField v-slot="{ id, invalido }" label="Fecha de entrega">
  <KmFecha :id="id" v-model="fecha" :invalido="invalido" min="2026-09-12" />
</KmField>`

const codigoImagen = `<KmUploadImagen
  v-model="producto.imagen"
  etiqueta="Foto del plato"
  :lado-maximo="800"
  @error="ui.error"
/>`

const codigoEstados = `<KmEstado tipo="vacio" mensaje="Aún no hay proveedores registrados.">
  <KmButton tamano="sm" @click="nuevo">Nuevo proveedor</KmButton>
</KmEstado>

<KmEstado tipo="error" :mensaje="error">
  <KmButton variante="secundario" tamano="sm" @click="recargar">Reintentar</KmButton>
</KmEstado>`
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
    <KmCard
      titulo="Guía de componentes"
      subtitulo="Piezas base del back office con demo, código y props. Revísalas también en sala de noche."
    >
      <KmTabs v-model="seccion" :pestanas="secciones" etiqueta="Grupos de componentes">
        <DemoTabla v-if="seccion === 'tabla'" />

        <GuiaEjemplo
          v-else-if="seccion === 'pestanas'"
          titulo="KmTabs"
          descripcion="Pestañas con contador opcional. Accesibles: flechas ← →, Inicio y Fin mueven el foco y cambian la pestaña activa."
          :codigo="codigoTabs"
          :props="[
            { nombre: 'v-model', tipo: 'string', descripcion: 'Valor de la pestaña activa.' },
            {
              nombre: 'pestanas',
              tipo: 'Pestana[]',
              descripcion: 'valor, etiqueta y contador opcional.',
            },
            { nombre: 'etiqueta', tipo: 'string', descripcion: 'Nombre accesible del grupo.' },
            {
              nombre: 'default',
              tipo: 'slot { activa }',
              descripcion: 'Contenido del panel activo.',
            },
          ]"
        >
          <KmTabs v-model="pestanaDemo" :pestanas="pestanasDemo" etiqueta="Órdenes de compra">
            <ul
              class="flex flex-col divide-y divide-linea rounded-card border border-linea bg-panel"
            >
              <li
                v-for="o in ordenesDemo[pestanaDemo]"
                :key="o"
                class="px-4 py-3 text-sm text-tinta"
              >
                {{ o }}
              </li>
            </ul>
          </KmTabs>
        </GuiaEjemplo>

        <GuiaEjemplo
          v-else-if="seccion === 'drawer'"
          titulo="KmDrawer"
          descripcion="Panel lateral para editar sin perder el contexto de la lista. Se cierra con Escape, con el velo o con la ×, y bloquea el scroll de fondo."
          :codigo="codigoDrawer"
          :props="[
            { nombre: 'v-model', tipo: 'boolean', descripcion: 'Abierto o cerrado.' },
            { nombre: 'titulo / subtitulo', tipo: 'string', descripcion: 'Cabecera del panel.' },
            {
              nombre: 'ancho',
              tipo: `'sm' | 'md' | 'lg'`,
              descripcion: '384, 448 o 672 px como máximo.',
            },
            { nombre: '#footer', tipo: 'slot', descripcion: 'Acciones fijas al pie.' },
          ]"
        >
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-40">
              <KmSelect
                v-model="anchoDrawer"
                etiqueta="Ancho del drawer"
                :opciones="[
                  { valor: 'sm', etiqueta: 'Ancho sm' },
                  { valor: 'md', etiqueta: 'Ancho md' },
                  { valor: 'lg', etiqueta: 'Ancho lg' },
                ]"
              />
            </div>
            <KmButton @click="drawerAbierto = true">Editar insumo</KmButton>
          </div>

          <KmDrawer
            v-model="drawerAbierto"
            titulo="Editar insumo"
            :subtitulo="insumo.nombre"
            :ancho="anchoDrawer"
          >
            <div class="flex flex-col gap-4">
              <KmField v-slot="{ id }" label="Nombre" requerido>
                <KmInput :id="id" v-model="insumo.nombre" />
              </KmField>
              <KmField v-slot="{ id }" label="Unidad">
                <KmSelect
                  :id="id"
                  v-model="insumo.unidad"
                  :opciones="[
                    { valor: 'kg', etiqueta: 'Kilogramo' },
                    { valor: 'unidad', etiqueta: 'Unidad' },
                  ]"
                />
              </KmField>
              <KmField v-slot="{ id }" label="Stock mínimo" ayuda="Por debajo se marca como bajo.">
                <KmNumero :id="id" v-model="insumo.stockMinimo" :min="0" />
              </KmField>
            </div>
            <template #footer>
              <KmButton variante="secundario" @click="drawerAbierto = false">Cancelar</KmButton>
              <KmButton @click="guardarInsumo"> Guardar </KmButton>
            </template>
          </KmDrawer>
        </GuiaEjemplo>

        <GuiaEjemplo
          v-else-if="seccion === 'fechas'"
          titulo="KmRangoFechas y KmFecha"
          descripcion="Calendario en español, semana desde el lunes. Clic en el mes o el año de la cabecera para saltar; también se puede escribir a mano (01/08/2026 o 01082026) y confirmar con Enter. El modelo siempre viaja en YYYY-MM-DD."
          :codigo="codigoFechas"
          :props="[
            {
              nombre: 'KmRangoFechas v-model',
              tipo: 'RangoFechas',
              descripcion: '{ desde, hasta } en YYYY-MM-DD.',
            },
            {
              nombre: 'KmRangoFechas atajos',
              tipo: 'AtajoRango[]',
              descripcion: 'Botones rápidos bajo el campo.',
            },
            {
              nombre: 'KmFecha v-model',
              tipo: 'string | null',
              descripcion: 'Fecha en YYYY-MM-DD.',
            },
            {
              nombre: 'min / max',
              tipo: 'string',
              descripcion: 'Límites en YYYY-MM-DD (ambos componentes).',
            },
            {
              nombre: 'invalido / limpiable',
              tipo: 'boolean',
              descripcion: 'Borde de error y botón de borrar (KmFecha).',
            },
          ]"
        >
          <div class="grid gap-6 md:grid-cols-2">
            <div class="flex flex-col gap-2">
              <p class="rs-etiqueta text-tenue">Rango con atajos</p>
              <KmRangoFechas v-model="rango" />
              <p class="text-xs text-tenue tabular-nums">
                Modelo: <code>{{ rango }}</code>
              </p>
            </div>
            <div class="flex flex-col gap-4">
              <KmField v-slot="{ id }" label="Fecha suelta">
                <KmFecha :id="id" v-model="fechaSuelta" />
              </KmField>
              <KmField
                v-slot="{ id }"
                label="Entrega de compra"
                ayuda="Solo desde hoy en adelante."
              >
                <KmFecha :id="id" v-model="fechaLimitada" min="2026-09-12" />
              </KmField>
              <p class="text-xs text-tenue tabular-nums">
                Modelos: <code>{{ fechaSuelta ?? 'null' }}</code> ·
                <code>{{ fechaLimitada ?? 'null' }}</code>
              </p>
            </div>
          </div>
        </GuiaEjemplo>

        <GuiaEjemplo
          v-else-if="seccion === 'imagen'"
          titulo="KmUploadImagen"
          descripcion="Arrastra o elige una imagen; se reduce en el navegador y se guarda como data URL en el mock. Con backend, el servicio la subirá y guardará la URL."
          :codigo="codigoImagen"
          :props="[
            {
              nombre: 'v-model',
              tipo: 'string | undefined',
              descripcion: 'Data URL (mock) o URL final.',
            },
            {
              nombre: 'ladoMaximo',
              tipo: 'number',
              descripcion: 'Lado mayor tras reducir. Por defecto 800.',
            },
            { nombre: 'maxKb', tipo: 'number', descripcion: 'Peso máximo del archivo original.' },
            {
              nombre: '@error',
              tipo: '(mensaje) => void',
              descripcion: 'Formato no válido o archivo ilegible.',
            },
          ]"
        >
          <div class="flex flex-wrap items-center gap-8">
            <KmUploadImagen v-model="imagen" etiqueta="Foto del plato" @error="ui.error" />
            <div
              v-if="imagen"
              class="flex items-center gap-3 rounded-card border border-linea bg-panel p-3"
            >
              <img :src="imagen" alt="" class="size-14 rounded-control object-cover" />
              <div>
                <p class="text-sm font-medium text-tinta">Ceviche clásico</p>
                <p class="text-xs text-tenue">
                  {{ formatearSoles(38) }} · {{ Math.round((imagen.length * 3) / 4 / 1024) }} KB
                </p>
              </div>
            </div>
          </div>
        </GuiaEjemplo>

        <GuiaEjemplo
          v-else-if="seccion === 'estados'"
          titulo="KmEstado"
          descripcion="Estados vacío, cargando y error con acciones opcionales. KmTable ya los usa por dentro."
          :codigo="codigoEstados"
          :props="[
            {
              nombre: 'tipo',
              tipo: `'vacio' | 'cargando' | 'error'`,
              descripcion: 'Icono, rol ARIA y título por defecto.',
            },
            {
              nombre: 'titulo / mensaje',
              tipo: 'string',
              descripcion: 'Texto principal y secundario.',
            },
            { nombre: 'compacto', tipo: 'boolean', descripcion: 'Menos espacio vertical.' },
            { nombre: 'default', tipo: 'slot', descripcion: 'Botones de acción.' },
          ]"
        >
          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-card border border-linea bg-panel">
              <KmEstado tipo="vacio" mensaje="Aún no hay proveedores registrados." compacto>
                <KmButton tamano="sm">Nuevo proveedor</KmButton>
              </KmEstado>
            </div>
            <div class="rounded-card border border-linea bg-panel">
              <KmEstado tipo="cargando" compacto />
            </div>
            <div class="rounded-card border border-linea bg-panel">
              <KmEstado tipo="error" mensaje="Error de red simulado. Vuelve a intentarlo." compacto>
                <KmButton variante="secundario" tamano="sm">Reintentar</KmButton>
              </KmEstado>
            </div>
          </div>
        </GuiaEjemplo>

        <GuiaEjemplo
          v-else
          titulo="Piezas globales del shell"
          descripcion="Están montadas una sola vez en el layout y se abren desde cualquier pantalla."
        >
          <div class="flex flex-wrap gap-3">
            <KmButton variante="secundario" @click="ui.buscadorAbierto = true">
              Buscador global (Ctrl K)
            </KmButton>
            <KmButton variante="secundario" @click="ui.panelDatosAbierto = true">
              Datos de ejemplo
            </KmButton>
            <KmButton variante="secundario" @click="ui.exito('Así se ve un aviso de éxito.')">
              Aviso de éxito
            </KmButton>
            <KmButton variante="secundario" @click="ui.error('Así se ve un aviso de error.')">
              Aviso de error
            </KmButton>
          </div>
        </GuiaEjemplo>
      </KmTabs>
    </KmCard>
  </div>
</template>
