<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { inventarioService } from '@/services/inventario.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { Zona, ApiError, Insumo, TipoMovimiento } from '@/types'
import type { OpcionSelect, Pestana } from '@/types/ui'
import { etiquetaMovimiento, etiquetaUnidad, formatearSoles } from '@/utils/formato'

const props = defineProps<{
  insumo: Insumo | null
  zonas: Zona[]
  /** Para mostrar los ingredientes que consume una producción. */
  insumos: Insumo[]
  /** Pestaña con la que se abre. */
  modo?: 'movimiento' | 'traslado' | 'produccion'
}>()

const abierto = defineModel<boolean>({ required: true })
const emit = defineEmits<{ guardado: [] }>()

const auth = useAuthStore()
const ui = useUiStore()

const pestana = ref('movimiento')
const pestanas = computed<Pestana[]>(() => [
  { valor: 'movimiento', etiqueta: 'Entrada o salida' },
  { valor: 'traslado', etiqueta: 'Traslado' },
  ...(transformacion.value ? [{ valor: 'produccion', etiqueta: 'Producir' }] : []),
])

/** Transformación activa de la que sale este insumo, si la hay (F4.3). */
const transformacion = computed(() =>
  props.insumo ? inventarioService.transformacionDe(props.insumo.id) : undefined,
)

const tipo = ref<TipoMovimiento>('entrada')
const zonaId = ref('')
const destinoId = ref('')
const cantidad = ref<number | null>(null)
const costo = ref<number | null>(null)
const motivo = ref('')
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

watch(abierto, (esta) => {
  if (!esta || !props.insumo) return
  pestana.value = props.modo ?? 'movimiento'
  tipo.value = 'entrada'
  const principal = [...props.insumo.existencias].sort((a, b) => b.cantidad - a.cantidad)[0]
  zonaId.value = principal?.zonaId ?? props.zonas.find((a) => a.activo)?.id ?? ''
  destinoId.value = ''
  cantidad.value = null
  costo.value = props.insumo.costoUnitario
  motivo.value = ''
  errores.value = {}
})

const opcionesTipo: OpcionSelect[] = (['entrada', 'salida', 'merma', 'ajuste'] as const).map(
  (t) => ({
    valor: t,
    etiqueta: etiquetaMovimiento[t],
  }),
)

const ayudaTipo: Record<string, string> = {
  entrada: 'Mercadería que llega sin orden de compra (compra al paso, donación).',
  salida: 'Consumo de cocina que no se descuenta por venta.',
  merma: 'Producto vencido, dañado o desperdiciado. Resta del stock.',
  ajuste: 'Corrección puntual que suma. Para contar todo una zona usa la toma de inventario.',
}

const opcionesZona = computed<OpcionSelect[]>(() =>
  props.zonas.filter((a) => a.activo).map((a) => ({ valor: a.id, etiqueta: a.nombre })),
)

const disponible = computed(
  () => props.insumo?.existencias.find((e) => e.zonaId === zonaId.value)?.cantidad ?? 0,
)

const unidad = computed(() => (props.insumo ? etiquetaUnidad[props.insumo.unidad] : ''))

/** Lo que consumirá una producción, para verlo antes de confirmar. */
const consumos = computed(() => {
  const t = transformacion.value
  if (!t || !cantidad.value) return []
  const salida = t.salidas.find((sa) => sa.insumoId === props.insumo?.id)
  if (!salida || salida.cantidad <= 0) return []
  const veces = cantidad.value / salida.cantidad
  return t.entradas.map((e) => ({ ...e, cantidad: e.cantidad * veces }))
})

async function guardar() {
  if (!props.insumo) return
  errores.value = {}
  if (!(Number(cantidad.value) > 0)) {
    errores.value.cantidad = 'Indica una cantidad mayor que cero.'
    return
  }
  guardando.value = true
  const usuarioId = auth.usuario?.id ?? 'u1'
  try {
    if (pestana.value === 'traslado') {
      await inventarioService.trasladar({
        insumoId: props.insumo.id,
        origenId: zonaId.value,
        destinoId: destinoId.value,
        cantidad: Number(cantidad.value),
        motivo: motivo.value || undefined,
        usuarioId,
      })
      ui.exito('Traslado registrado.')
    } else if (pestana.value === 'produccion') {
      await inventarioService.producir({
        insumoId: props.insumo.id,
        zonaId: zonaId.value,
        cantidad: Number(cantidad.value),
        usuarioId,
      })
      ui.exito('Producción registrada.')
    } else {
      await inventarioService.registrarMovimiento({
        insumoId: props.insumo.id,
        zonaId: zonaId.value,
        tipo: tipo.value,
        cantidad: Number(cantidad.value),
        costoUnitario:
          tipo.value === 'entrada' && costo.value !== null ? Number(costo.value) : undefined,
        motivo: motivo.value || undefined,
        usuarioId,
      })
      ui.exito(`${etiquetaMovimiento[tipo.value]} registrada.`)
    }
    abierto.value = false
    emit('guardado')
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo registrar el movimiento.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <KmModal v-model="abierto" :titulo="insumo ? insumo.nombre : 'Movimiento'" ancho="md">
    <KmTabs v-if="insumo" v-model="pestana" :pestanas="pestanas" etiqueta="Tipo de registro">
      <form id="form-movimiento" class="flex flex-col gap-4" novalidate @submit.prevent="guardar">
        <div class="grid grid-cols-2 gap-4">
          <KmField v-if="pestana === 'movimiento'" v-slot="{ id }" label="Tipo">
            <KmSelect :id="id" v-model="tipo" :opciones="opcionesTipo" />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            :label="pestana === 'traslado' ? 'Desde' : 'Zona'"
            :error="errores.zonaId"
          >
            <KmSelect :id="id" v-model="zonaId" :opciones="opcionesZona" :invalido="invalido" />
          </KmField>
          <KmField
            v-if="pestana === 'traslado'"
            v-slot="{ id, invalido }"
            label="Hacia"
            :error="errores.destinoId"
          >
            <KmSelect
              :id="id"
              v-model="destinoId"
              placeholder="Elige destino"
              :opciones="opcionesZona.filter((o) => o.valor !== zonaId)"
              :invalido="invalido"
            />
          </KmField>
        </div>

        <p v-if="pestana === 'movimiento'" class="-mt-2 text-xs text-tenue">
          {{ ayudaTipo[tipo] }}
        </p>

        <div class="grid grid-cols-2 gap-4">
          <KmField
            v-slot="{ id, invalido }"
            :label="pestana === 'produccion' ? 'Cantidad a producir' : 'Cantidad'"
            :error="errores.cantidad"
            :ayuda="pestana === 'produccion' ? undefined : `Disponible: ${disponible} ${unidad}`"
            requerido
          >
            <KmNumero
              :id="id"
              v-model="cantidad"
              :min="0"
              :decimales="3"
              :sufijo="unidad"
              :invalido="invalido"
            />
          </KmField>
          <KmField
            v-if="pestana === 'movimiento' && tipo === 'entrada'"
            v-slot="{ id }"
            label="Costo unitario"
            ayuda="Sin IGV. Actualiza el costo promedio."
          >
            <KmNumero :id="id" v-model="costo" :min="0" :decimales="2" prefijo="S/" />
          </KmField>
        </div>

        <div
          v-if="pestana === 'produccion' && consumos.length"
          class="rounded-card border border-dashed border-linea px-4 py-3 text-sm"
        >
          <p class="rs-etiqueta mb-2 text-tenue">
            Se descontará de {{ opcionesZona.find((o) => o.valor === zonaId)?.etiqueta }}
          </p>
          <ul class="flex flex-col gap-1">
            <li v-for="c in consumos" :key="c.insumoId" class="flex justify-between tabular-nums">
              <span>{{ insumos.find((i) => i.id === c.insumoId)?.nombre ?? c.insumoId }}</span>
              <span>
                {{ c.cantidad.toFixed(3) }}
                {{ etiquetaUnidad[insumos.find((i) => i.id === c.insumoId)?.unidad ?? 'unidad'] }}
              </span>
            </li>
          </ul>
        </div>

        <KmField v-if="pestana !== 'produccion'" v-slot="{ id }" label="Motivo">
          <KmInput :id="id" v-model="motivo" placeholder="Ej. Compra en mercado" />
        </KmField>

        <p
          v-if="pestana === 'movimiento' && tipo === 'entrada' && cantidad && costo"
          class="text-xs text-tenue"
        >
          Valor de la entrada: {{ formatearSoles(Number(cantidad) * Number(costo)) }}
        </p>
      </form>
    </KmTabs>

    <template #footer>
      <KmButton variante="secundario" :disabled="guardando" @click="abierto = false"
        >Cancelar</KmButton
      >
      <KmButton type="submit" form="form-movimiento" :cargando="guardando">Registrar</KmButton>
    </template>
  </KmModal>
</template>
