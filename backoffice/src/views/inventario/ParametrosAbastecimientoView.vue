<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmField from '@/components/ui/KmField.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import {
  etiquetaNivel,
  etiquetaParametro,
  nivelesParametros,
  parametrosAbastecimientoService,
} from '@/services/abastecimiento.service'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  CategoriaInsumo,
  NivelParametros,
  ParametrosAbastecimiento,
  ParametrosResueltos,
} from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaCategoriaInsumo } from '@/utils/formato'

/**
 * Parámetros de abastecimiento y su herencia (F4.3, D-004).
 *
 * Se fijan en cualquier nivel —Cadena, Local, Almacén, Categoría o Insumo— y
 * gana el más específico. La pantalla hace dos cosas: **simular** qué le toca
 * a un insumo en un almacén concreto, diciendo de qué nivel viene cada valor,
 * y **fijar** los valores de un nivel.
 */

const ui = useUiStore()
const catalogos = useCatalogos(['insumos', 'almacenes', 'locales'])
const { opcionesInsumo, opcionesAlmacen, opcionesLocal, nombreAlmacen } = catalogos

const claves = Object.keys(etiquetaParametro) as (keyof ParametrosAbastecimiento)[]

const opcionesBooleano: OpcionSelect[] = [
  { valor: '', etiqueta: 'Heredar' },
  { valor: 'si', etiqueta: 'Sí' },
  { valor: 'no', etiqueta: 'No' },
]
const opcionesRecepcion: OpcionSelect[] = [
  { valor: '', etiqueta: 'Heredar' },
  { valor: 'total', etiqueta: 'Total' },
  { valor: 'detalle', etiqueta: 'A detalle' },
]

const tonoNivel: Record<NivelParametros, 'neutro' | 'pizarra' | 'laton' | 'verde' | 'vino'> = {
  cadena: 'neutro',
  local: 'pizarra',
  almacen: 'laton',
  categoria: 'verde',
  insumo: 'vino',
}

// ── Simulador ──

const insumoId = ref('')
const almacenId = ref('')
const resuelto = shallowRef<ParametrosResueltos | null>(null)

async function simular() {
  if (!insumoId.value) {
    resuelto.value = null
    return
  }
  resuelto.value = await parametrosAbastecimientoService.resolver({
    insumoId: insumoId.value,
    almacenId: almacenId.value || undefined,
  })
}

function textoValor(clave: keyof ParametrosAbastecimiento, valor: unknown) {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (clave === 'tipoRecepcion') return valor === 'detalle' ? 'A detalle' : 'Total'
  return `${valor} días`
}

// ── Editor de un nivel ──

const nivel = ref<NivelParametros>('cadena')
const referencia = ref('')
/** Valor en el formulario: '' significa «heredar». */
const borrador = ref<Record<string, string>>({})
const guardando = ref(false)

const opcionesNivel: OpcionSelect[] = nivelesParametros.map((n) => ({
  valor: n,
  etiqueta: etiquetaNivel[n],
}))

const opcionesCategoria = computed<OpcionSelect[]>(() =>
  (Object.keys(etiquetaCategoriaInsumo) as CategoriaInsumo[]).map((c) => ({
    valor: c,
    etiqueta: etiquetaCategoriaInsumo[c],
  })),
)

const opcionesReferencia = computed<OpcionSelect[]>(() => {
  if (nivel.value === 'local') return opcionesLocal.value
  if (nivel.value === 'almacen') return opcionesAlmacen.value
  if (nivel.value === 'categoria') return opcionesCategoria.value
  if (nivel.value === 'insumo') return opcionesInsumo.value
  return []
})

/** El nivel de cadena no hereda de nadie: todos sus valores son obligatorios. */
const esCadena = computed(() => nivel.value === 'cadena')

async function cargarNivel() {
  borrador.value = {}
  if (!esCadena.value && !referencia.value) return
  const ajustes = await parametrosAbastecimientoService.ajustes(nivel.value)
  const ajuste = ajustes.find(
    (a) => (a.referencia ?? '') === (esCadena.value ? '' : referencia.value),
  )
  const valores = ajuste?.valores ?? {}
  for (const clave of claves) {
    const valor = valores[clave]
    if (valor === undefined) borrador.value[clave] = ''
    else if (typeof valor === 'boolean') borrador.value[clave] = valor ? 'si' : 'no'
    else borrador.value[clave] = String(valor)
  }
}

watch([nivel, referencia], () => {
  referencia.value = opcionesReferencia.value.some((o) => o.valor === referencia.value)
    ? referencia.value
    : ''
  void cargarNivel()
})

async function guardar() {
  guardando.value = true
  const valores: Partial<ParametrosAbastecimiento> = {}
  for (const clave of claves) {
    const texto = borrador.value[clave]
    if (!texto) continue
    if (clave === 'diasAlerta') valores.diasAlerta = Number(texto)
    else if (clave === 'tipoRecepcion') valores.tipoRecepcion = texto as 'total' | 'detalle'
    else valores[clave] = (texto === 'si') as never
  }
  try {
    await parametrosAbastecimientoService.guardarAjuste(
      nivel.value,
      esCadena.value ? undefined : referencia.value,
      valores,
    )
    ui.exito(`Parámetros de ${etiquetaNivel[nivel.value].toLowerCase()} guardados.`)
    await cargarNivel()
    await simular()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron guardar los parámetros.')
  } finally {
    guardando.value = false
  }
}

onMounted(async () => {
  await catalogos.recargar()
  insumoId.value = (opcionesInsumo.value[0]?.valor as string) ?? ''
  almacenId.value = (opcionesAlmacen.value[0]?.valor as string) ?? ''
  await Promise.all([cargarNivel(), simular()])
})

watch([insumoId, almacenId], simular)
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-5">
    <KmCard
      titulo="Qué le toca a un insumo"
      subtitulo="Los parámetros se heredan Cadena → Local → Almacén → Categoría → Insumo, y gana el más específico. Elige un insumo y un almacén para ver de dónde sale cada valor."
    >
      <div class="mb-4 flex flex-wrap gap-3">
        <div class="w-full sm:w-64">
          <KmField v-slot="{ id }" label="Insumo">
            <KmSelect :id="id" v-model="insumoId" :opciones="opcionesInsumo" />
          </KmField>
        </div>
        <div class="w-full sm:w-64">
          <KmField v-slot="{ id }" label="Almacén">
            <KmSelect :id="id" v-model="almacenId" :opciones="opcionesAlmacen" />
          </KmField>
        </div>
      </div>

      <dl v-if="resuelto" class="grid gap-2 sm:grid-cols-2">
        <div
          v-for="clave in claves"
          :key="clave"
          class="flex items-center justify-between gap-3 rounded-card border border-linea bg-panel px-4 py-3"
        >
          <dt class="text-sm text-tinta">{{ etiquetaParametro[clave] }}</dt>
          <dd class="flex items-center gap-2">
            <span class="text-sm font-semibold text-tinta">
              {{ textoValor(clave, resuelto[clave].valor) }}
            </span>
            <KmBadge :tono="tonoNivel[resuelto[clave].nivel]" punto>
              {{ etiquetaNivel[resuelto[clave].nivel] }}
            </KmBadge>
          </dd>
        </div>
      </dl>
      <p v-else class="text-sm text-tenue">Elige un insumo para ver sus parámetros.</p>
    </KmCard>

    <KmCard
      titulo="Fijar parámetros de un nivel"
      subtitulo="Deja «Heredar» en lo que no quieras decidir aquí: ese parámetro seguirá viniendo del nivel anterior."
    >
      <div class="mb-4 flex flex-wrap gap-3">
        <div class="w-full sm:w-48">
          <KmField v-slot="{ id }" label="Nivel">
            <KmSelect :id="id" v-model="nivel" :opciones="opcionesNivel" />
          </KmField>
        </div>
        <div v-if="!esCadena" class="w-full sm:w-64">
          <KmField v-slot="{ id }" :label="etiquetaNivel[nivel]">
            <KmSelect
              :id="id"
              v-model="referencia"
              placeholder="Elige a qué aplica"
              :opciones="opcionesReferencia"
            />
          </KmField>
        </div>
      </div>

      <p v-if="esCadena" class="mb-4 text-sm text-tenue">
        Es el nivel más general: no hereda de nadie, así que todos sus parámetros tienen valor.
      </p>
      <p v-else-if="!referencia" class="text-sm text-tenue">
        Elige a qué {{ etiquetaNivel[nivel].toLowerCase() }} se aplican estos parámetros.
      </p>

      <template v-if="esCadena || referencia">
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField
            v-for="clave in claves"
            :key="clave"
            v-slot="{ id }"
            :label="etiquetaParametro[clave]"
          >
            <KmNumero
              v-if="clave === 'diasAlerta'"
              :id="id"
              :model-value="borrador[clave] === '' ? null : Number(borrador[clave])"
              :min="0"
              sufijo="días"
              :placeholder="esCadena ? '' : 'Heredar'"
              @update:model-value="borrador[clave] = $event === null ? '' : String($event)"
            />
            <KmSelect
              v-else-if="clave === 'tipoRecepcion'"
              :id="id"
              v-model="borrador[clave]"
              :opciones="esCadena ? opcionesRecepcion.slice(1) : opcionesRecepcion"
            />
            <KmSelect
              v-else
              :id="id"
              v-model="borrador[clave]"
              :opciones="esCadena ? opcionesBooleano.slice(1) : opcionesBooleano"
            />
          </KmField>
        </div>

        <div class="mt-5 flex justify-end">
          <KmButton :cargando="guardando" @click="guardar">
            Guardar {{ esCadena ? 'la cadena' : etiquetaNivel[nivel].toLowerCase() }}
          </KmButton>
        </div>
      </template>
    </KmCard>

    <p class="text-xs text-tenue">
      La recepción de F4.5 leerá estos parámetros para decidir si pide lote, vencimiento y
      ubicación, y en qué orden propone salir el stock. Sin ubicación por defecto en
      {{ nombreAlmacen(almacenId) }} no se podrá recepcionar lo que la exija.
    </p>
  </div>
</template>
