<script setup lang="ts">
import { onMounted, ref } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmOrigenErp from '@/components/ui/KmOrigenErp.vue'
import { empresaService } from '@/services/empresa.service'
import type { ApiError, Empresa } from '@/types'

/** Datos de la empresa: vienen del ERP y aquí solo se consultan (D-005). */

const empresa = ref<Empresa | null>(null)
const cargando = ref(true)
const errorCarga = ref<string | null>(null)

async function cargar() {
  cargando.value = true
  errorCarga.value = null
  try {
    empresa.value = await empresaService.obtener()
  } catch (e) {
    errorCarga.value = (e as ApiError).mensaje ?? 'No se pudieron cargar los datos.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-6">
    <KmCard v-if="cargando" titulo="Empresa"><KmEstado tipo="cargando" compacto /></KmCard>

    <KmCard v-else-if="errorCarga" titulo="Empresa">
      <KmEstado tipo="error" :mensaje="errorCarga">
        <KmButton variante="secundario" tamano="sm" @click="cargar">Reintentar</KmButton>
      </KmEstado>
    </KmCard>

    <template v-else-if="empresa">
      <KmOrigenErp detalle />

      <KmCard
        titulo="Datos tributarios"
        subtitulo="Aparecen en boletas, facturas y en la cabecera de los reportes."
      >
        <dl class="rs-ficha">
          <div>
            <dt>RUC</dt>
            <dd class="font-mono tabular-nums">{{ empresa.ruc }}</dd>
          </div>
          <div>
            <dt>Razón social</dt>
            <dd>{{ empresa.razonSocial }}</dd>
          </div>
          <div>
            <dt>Nombre comercial</dt>
            <dd>{{ empresa.nombreComercial }}</dd>
          </div>
          <div>
            <dt>Dirección fiscal</dt>
            <dd>{{ empresa.direccionFiscal }}</dd>
          </div>
        </dl>
      </KmCard>

      <KmCard titulo="Contacto y marca">
        <div class="flex flex-wrap items-start gap-6">
          <dl class="rs-ficha flex-1">
            <div>
              <dt>Teléfono</dt>
              <dd>{{ empresa.telefono || '—' }}</dd>
            </div>
            <div>
              <dt>Correo de facturación</dt>
              <dd>{{ empresa.email || '—' }}</dd>
            </div>
          </dl>
          <div class="flex flex-col gap-2">
            <span class="rs-etiqueta text-tenue">Logo</span>
            <img
              v-if="empresa.logo"
              :src="empresa.logo"
              alt="Logo de la empresa"
              class="size-24 rounded-card border border-linea object-contain"
            />
            <span v-else class="text-sm text-tenue">Sin logo</span>
          </div>
        </div>
      </KmCard>

      <KmCard titulo="Regional">
        <dl class="rs-ficha">
          <div>
            <dt>Moneda</dt>
            <dd>Sol peruano (PEN · S/)</dd>
          </div>
          <div>
            <dt>Zona horaria</dt>
            <dd>Lima (UTC−5)</dd>
          </div>
        </dl>
      </KmCard>
    </template>
  </div>
</template>

<style scoped>
.rs-ficha {
  display: grid;
  gap: 1rem 2rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
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
