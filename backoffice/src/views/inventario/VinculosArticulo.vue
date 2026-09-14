<script setup lang="ts">
import { computed } from 'vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import type { Articulo, UnidadMedida, VinculoArticulo } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaUnidad } from '@/utils/formato'

/**
 * Artículos del ERP que abastecen a un insumo (D-004). Varios artículos en el
 * mismo insumo son sus **alternos**: sirven indistintamente para reponerlo, y
 * uno de ellos es el que se propone al pedir.
 *
 * El `factor` es la conversión directa: cuántas unidades de uso rinde una
 * unidad de compra del artículo (un saco de 50 kg de papa → 50 kg).
 */
const props = defineProps<{
  articulos: Articulo[]
  opciones: OpcionSelect[]
  unidad: UnidadMedida
  error?: string
}>()

const vinculos = defineModel<VinculoArticulo[]>({ required: true })

const articuloPor = (id: string) => props.articulos.find((a) => a.id === id)

/** Un artículo ya vinculado no vuelve a ofrecerse, salvo en su propia fila. */
function opcionesDe(actual: string): OpcionSelect[] {
  const usados = new Set(vinculos.value.map((v) => v.articuloId).filter((id) => id !== actual))
  return props.opciones.filter((o) => !usados.has(o.valor as string))
}

const hayPorDefecto = computed(() => vinculos.value.some((v) => v.porDefecto))

function anadir() {
  vinculos.value = [
    ...vinculos.value,
    { articuloId: '', factor: 1, porDefecto: !hayPorDefecto.value },
  ]
}

function quitar(indice: number) {
  const resto = vinculos.value.filter((_, i) => i !== indice)
  // Siempre queda uno por defecto mientras haya artículos.
  if (resto.length > 0 && !resto.some((v) => v.porDefecto)) resto[0]!.porDefecto = true
  vinculos.value = resto
}

function marcarPorDefecto(indice: number) {
  vinculos.value = vinculos.value.map((v, i) => ({ ...v, porDefecto: i === indice }))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-tinta">Artículos que lo abastecen</p>
        <p class="text-xs text-tenue">
          Del ERP. El factor convierte la unidad de compra en
          {{ etiquetaUnidad[unidad] }}.
        </p>
      </div>
      <KmButton tamano="sm" variante="secundario" @click="anadir">Añadir artículo</KmButton>
    </div>

    <p v-if="error" class="text-xs font-medium text-vino">{{ error }}</p>

    <p v-if="vinculos.length === 0" class="text-sm text-tenue">
      Sin artículos: este insumo todavía no se puede pedir al ERP.
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="(vinculo, indice) in vinculos"
        :key="indice"
        class="flex flex-wrap items-end gap-2 rounded-card border border-linea bg-panel p-3"
      >
        <div class="min-w-52 flex-1">
          <KmField v-slot="{ id }" label="Artículo del ERP">
            <KmSelect
              :id="id"
              v-model="vinculo.articuloId"
              placeholder="Elige un artículo"
              :opciones="opcionesDe(vinculo.articuloId)"
            />
          </KmField>
        </div>
        <div class="w-32">
          <KmField v-slot="{ id }" label="Factor">
            <KmNumero
              :id="id"
              v-model="vinculo.factor"
              :min="0"
              :decimales="3"
              :sufijo="etiquetaUnidad[unidad]"
              :controles="false"
            />
          </KmField>
        </div>
        <KmButton
          :variante="vinculo.porDefecto ? 'primario' : 'secundario'"
          tamano="sm"
          :disabled="vinculo.porDefecto"
          @click="marcarPorDefecto(indice)"
        >
          {{ vinculo.porDefecto ? 'Por defecto' : 'Usar por defecto' }}
        </KmButton>
        <KmBotonIcono
          icono="eliminar"
          etiqueta="Quitar artículo"
          :contexto="articuloPor(vinculo.articuloId)?.nombre ?? 'sin elegir'"
          @click="quitar(indice)"
        />
        <p v-if="articuloPor(vinculo.articuloId)" class="basis-full text-xs text-tenue">
          1 {{ articuloPor(vinculo.articuloId)!.unidadCompra }} = {{ vinculo.factor }}
          {{ etiquetaUnidad[unidad] }}
        </p>
      </li>
    </ul>
  </div>
</template>
