<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmField from '@/components/ui/KmField.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { canalesService } from '@/services/comercial.service'
import { impuestosService } from '@/services/empresa.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, CanalVenta, ConfigImpuestos } from '@/types'
import { desglosarTicket } from '@/utils/impuestos'
import { formatearSoles } from '@/utils/formato'

const ui = useUiStore()

const original = ref<ConfigImpuestos | null>(null)
const form = ref<ConfigImpuestos | null>(null)
const canales = shallowRef<CanalVenta[]>([])
const errores = ref<Record<string, string>>({})
const cargando = ref(true)
const errorCarga = ref<string | null>(null)
const guardando = ref(false)

const cambios = computed(
  () => !!form.value && JSON.stringify(form.value) !== JSON.stringify(original.value),
)

async function cargar() {
  cargando.value = true
  errorCarga.value = null
  try {
    const [config, lista] = await Promise.all([impuestosService.obtener(), canalesService.todos()])
    original.value = config
    form.value = structuredClone(config)
    canales.value = lista.filter((c) => c.activo)
  } catch (e) {
    errorCarga.value = (e as ApiError).mensaje ?? 'No se pudo cargar la configuración.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function alternarCanal(id: string) {
  const lista = form.value!.recargoConsumoCanales
  form.value!.recargoConsumoCanales = lista.includes(id)
    ? lista.filter((c) => c !== id)
    : [...lista, id]
}

async function guardar() {
  if (!form.value) return
  guardando.value = true
  errores.value = {}
  try {
    const datos = {
      ...form.value,
      igvPorcentaje: Number(form.value.igvPorcentaje),
      recargoConsumoPorcentaje: Number(form.value.recargoConsumoPorcentaje),
      icbperMonto: Number(form.value.icbperMonto),
    }
    const guardada = await impuestosService.guardar(datos)
    original.value = guardada
    form.value = structuredClone(guardada)
    ui.exito('Impuestos y cargos guardados.')
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo guardar.')
  } finally {
    guardando.value = false
  }
}

function descartar() {
  form.value = structuredClone(original.value)
  errores.value = {}
}

/** Ticket de ejemplo que se recalcula con cada ajuste. */
const consumoEjemplo = ref(120)
const ejemplo = computed(() =>
  form.value
    ? desglosarTicket(Number(consumoEjemplo.value) || 0, {
        ...form.value,
        igvPorcentaje: Number(form.value.igvPorcentaje),
        recargoConsumoPorcentaje: Number(form.value.recargoConsumoPorcentaje),
      })
    : null,
)
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCard v-if="cargando" titulo="Impuestos y cargos">
      <KmEstado tipo="cargando" compacto />
    </KmCard>

    <KmCard v-else-if="errorCarga" titulo="Impuestos y cargos">
      <KmEstado tipo="error" :mensaje="errorCarga">
        <KmButton variante="secundario" tamano="sm" @click="cargar">Reintentar</KmButton>
      </KmEstado>
    </KmCard>

    <form
      v-else-if="form"
      class="grid gap-6 lg:grid-cols-[1fr_20rem]"
      novalidate
      @submit.prevent="guardar"
    >
      <div class="flex flex-col gap-6">
        <KmCard
          titulo="IGV"
          subtitulo="Impuesto General a las Ventas aplicado en los comprobantes."
        >
          <div class="flex flex-col gap-5">
            <KmField
              v-slot="{ id, invalido }"
              label="Tasa de IGV (%)"
              ayuda="18 % general. Los restaurantes MYPE acogidos a la Ley 31556 aplican una tasa reducida."
              :error="errores.igvPorcentaje"
            >
              <div class="w-48">
                <KmNumero
                  :id="id"
                  v-model="form.igvPorcentaje"
                  :min="0"
                  :max="30"
                  :invalido="invalido"
                  sufijo="%"
                  :decimales="2"
                />
              </div>
            </KmField>
            <KmSwitch
              v-model="form.preciosIncluyenIgv"
              etiqueta="Los precios de la carta incluyen IGV"
              descripcion="Si lo desactivas, el IGV se suma al precio al cobrar."
            />
          </div>
        </KmCard>

        <KmCard
          titulo="Recargo al consumo"
          subtitulo="Cargo por servicio que se suma a la cuenta. La ley lo limita al 13 %."
        >
          <div class="flex flex-col gap-5">
            <KmSwitch
              v-model="form.recargoConsumoActivo"
              etiqueta="Cobrar recargo al consumo"
              descripcion="Se muestra como una línea aparte en la precuenta y el comprobante."
            />

            <template v-if="form.recargoConsumoActivo">
              <KmField
                v-slot="{ id, invalido }"
                label="Porcentaje (%)"
                :error="errores.recargoConsumoPorcentaje"
              >
                <div class="w-48">
                  <KmNumero
                    :id="id"
                    v-model="form.recargoConsumoPorcentaje"
                    :min="0"
                    :max="13"
                    :invalido="invalido"
                    sufijo="%"
                    :decimales="2"
                    :step="0.5"
                  />
                </div>
              </KmField>

              <fieldset class="flex flex-col gap-2">
                <legend class="mb-1 text-sm font-semibold text-tinta">Aplica en</legend>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="c in canales"
                    :key="c.id"
                    type="button"
                    class="rounded-full border px-3 py-1.5 text-sm transition-colors"
                    :class="
                      form.recargoConsumoCanales.includes(c.id)
                        ? 'border-rail bg-rail text-rail-tinta'
                        : 'border-linea text-tenue hover:border-verde hover:text-tinta'
                    "
                    :aria-pressed="form.recargoConsumoCanales.includes(c.id)"
                    @click="alternarCanal(c.id)"
                  >
                    {{ c.nombre }}
                  </button>
                </div>
                <p v-if="errores.recargoConsumoCanales" class="text-xs font-medium text-vino">
                  {{ errores.recargoConsumoCanales }}
                </p>
              </fieldset>
            </template>
          </div>
        </KmCard>

        <KmCard titulo="ICBPER" subtitulo="Impuesto al consumo de bolsas de plástico.">
          <KmField
            v-slot="{ id, invalido }"
            label="Monto por bolsa (S/)"
            :error="errores.icbperMonto"
          >
            <div class="w-48">
              <KmNumero
                :id="id"
                v-model="form.icbperMonto"
                :min="0"
                :invalido="invalido"
                prefijo="S/"
                :decimales="2"
                :step="0.1"
              />
            </div>
          </KmField>
        </KmCard>
      </div>

      <!-- Ticket de ejemplo: muestra el efecto de la configuración antes de guardarla. -->
      <aside
        class="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start"
        aria-label="Ticket de ejemplo"
      >
        <KmCard titulo="Ticket de ejemplo">
          <div v-if="ejemplo" class="flex flex-col gap-4">
            <KmField v-slot="{ id }" label="Consumo de la mesa (S/)">
              <KmNumero
                :id="id"
                v-model="consumoEjemplo"
                :min="0"
                prefijo="S/"
                :decimales="2"
                :step="10"
              />
            </KmField>

            <dl
              class="flex flex-col gap-1.5 border-t border-dashed border-linea pt-3 text-sm tabular-nums"
            >
              <div class="flex justify-between">
                <dt class="text-tenue">Op. gravada</dt>
                <dd class="text-tinta">{{ formatearSoles(ejemplo.baseImponible) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-tenue">IGV {{ form.igvPorcentaje }} %</dt>
                <dd class="text-tinta">{{ formatearSoles(ejemplo.igv) }}</dd>
              </div>
              <div v-if="ejemplo.recargo > 0" class="flex justify-between">
                <dt class="text-tenue">Recargo al consumo {{ form.recargoConsumoPorcentaje }} %</dt>
                <dd class="text-tinta">{{ formatearSoles(ejemplo.recargo) }}</dd>
              </div>
              <div class="mt-2 flex justify-between border-t border-linea pt-2">
                <dt class="font-semibold text-tinta">Total</dt>
                <dd class="rs-display text-lg font-semibold text-tinta">
                  {{ formatearSoles(ejemplo.total) }}
                </dd>
              </div>
            </dl>
            <p class="text-xs text-tenue">
              Calculado para el canal Salón, redondeado a céntimos. El recargo se calcula sobre el
              valor sin IGV.
            </p>
          </div>
        </KmCard>

        <div class="flex justify-end gap-2">
          <KmButton variante="secundario" :disabled="!cambios || guardando" @click="descartar">
            Descartar
          </KmButton>
          <KmButton type="submit" :disabled="!cambios" :cargando="guardando">
            Guardar cambios
          </KmButton>
        </div>
      </aside>
    </form>
  </div>
</template>
