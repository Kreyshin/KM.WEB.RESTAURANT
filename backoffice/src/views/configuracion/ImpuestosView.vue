<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmField from '@/components/ui/KmField.vue'
import KmOrigenErp from '@/components/ui/KmOrigenErp.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import { canalesService } from '@/services/comercial.service'
import { impuestosService } from '@/services/empresa.service'
import type { ApiError, CanalVenta, ConfigImpuestos } from '@/types'
import { desglosarTicket } from '@/utils/impuestos'
import { formatearSoles } from '@/utils/formato'

/** Impuestos: vienen del ERP y aquí solo se consultan (D-005). */

const form = ref<ConfigImpuestos | null>(null)
const canales = shallowRef<CanalVenta[]>([])
const cargando = ref(true)
const errorCarga = ref<string | null>(null)

async function cargar() {
  cargando.value = true
  errorCarga.value = null
  try {
    const [config, lista] = await Promise.all([impuestosService.obtener(), canalesService.todos()])
    form.value = config
    canales.value = lista.filter((c) => c.activo)
  } catch (e) {
    errorCarga.value = (e as ApiError).mensaje ?? 'No se pudo cargar la configuración.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

const canalesConRecargo = computed(() => canales.value.filter((c) => c.aplicaRecargoConsumo))

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

    <div v-else-if="form" class="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div class="flex flex-col gap-6">
        <KmOrigenErp detalle>
          Tasas y cargos se administran en el módulo de ventas del ERP. Qué canal cobra el recargo
          al consumo sí se decide aquí, en Canales de venta.
        </KmOrigenErp>

        <KmCard
          titulo="IGV"
          subtitulo="Impuesto General a las Ventas aplicado en los comprobantes."
        >
          <dl class="rs-ficha">
            <div>
              <dt>Tasa</dt>
              <dd class="tabular-nums">{{ form.igvPorcentaje }} %</dd>
            </div>
            <div>
              <dt>Precios de la carta</dt>
              <dd>{{ form.preciosIncluyenIgv ? 'Incluyen IGV' : 'Sin IGV: se suma al cobrar' }}</dd>
            </div>
          </dl>
        </KmCard>

        <KmCard
          titulo="Recargo al consumo"
          subtitulo="Cargo por servicio que se suma a la cuenta. La ley lo limita al 13 %."
        >
          <dl class="rs-ficha">
            <div>
              <dt>Estado</dt>
              <dd>{{ form.recargoConsumoActivo ? 'Se cobra' : 'No se cobra' }}</dd>
            </div>
            <div v-if="form.recargoConsumoActivo">
              <dt>Porcentaje</dt>
              <dd class="tabular-nums">{{ form.recargoConsumoPorcentaje }} %</dd>
            </div>
          </dl>
          <div v-if="form.recargoConsumoActivo" class="mt-5 flex flex-col gap-2">
            <p class="rs-etiqueta text-tenue">Se cobra en</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="c in canalesConRecargo"
                :key="c.id"
                class="rounded-full border border-linea px-3 py-1 text-sm text-tinta"
              >
                {{ c.nombre }}
              </span>
              <span v-if="canalesConRecargo.length === 0" class="text-sm text-vino">
                Ningún canal lo cobra todavía.
              </span>
            </div>
            <RouterLink
              :to="{ name: 'config-canales' }"
              class="self-start text-xs font-semibold text-verde hover:underline"
            >
              Cambiar en Canales de venta
            </RouterLink>
          </div>
        </KmCard>

        <KmCard titulo="ICBPER" subtitulo="Impuesto al consumo de bolsas de plástico.">
          <dl class="rs-ficha">
            <div>
              <dt>Monto por bolsa</dt>
              <dd class="tabular-nums">{{ formatearSoles(form.icbperMonto) }}</dd>
            </div>
          </dl>
        </KmCard>
      </div>

      <!-- Ticket de ejemplo: muestra el efecto de la configuración vigente. -->
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
      </aside>
    </div>
  </div>
</template>

<style scoped>
.rs-ficha {
  display: grid;
  gap: 1rem 2rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  margin: 0;
}
.rs-ficha dt {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-tenue);
}
.rs-ficha dd {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  color: var(--color-tinta);
}
</style>
