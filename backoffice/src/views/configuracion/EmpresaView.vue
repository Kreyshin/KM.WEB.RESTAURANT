<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmEstado from '@/components/ui/KmEstado.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmUploadImagen from '@/components/ui/KmUploadImagen.vue'
import { empresaService } from '@/services/empresa.service'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, Empresa } from '@/types'
import { validarEmail, validarRuc } from '@/utils/validaciones'

const ui = useUiStore()

const original = ref<Empresa | null>(null)
const form = ref<Empresa | null>(null)
const errores = ref<Record<string, string>>({})
const cargando = ref(true)
const errorCarga = ref<string | null>(null)
const guardando = ref(false)

const cambios = computed(
  () => !!form.value && JSON.stringify(form.value) !== JSON.stringify(original.value),
)

/** Pista en vivo mientras se escribe el RUC. */
const estadoRuc = computed(() => {
  const ruc = form.value?.ruc ?? ''
  if (!ruc) return null
  if (ruc.length < 11) return { ok: false, texto: `${ruc.length} de 11 dígitos` }
  return validarRuc(ruc)
    ? { ok: true, texto: ruc.startsWith('20') ? 'Persona jurídica · válido' : 'RUC válido' }
    : { ok: false, texto: 'Dígito verificador incorrecto' }
})

async function cargar() {
  cargando.value = true
  errorCarga.value = null
  try {
    const empresa = await empresaService.obtener()
    original.value = empresa
    form.value = structuredClone(empresa)
  } catch (e) {
    errorCarga.value = (e as ApiError).mensaje ?? 'No se pudieron cargar los datos.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function validar() {
  const f = form.value!
  const e: Record<string, string> = {}
  if (!validarRuc(f.ruc)) e.ruc = 'Ingresa un RUC válido de 11 dígitos.'
  if (!f.razonSocial.trim()) e.razonSocial = 'La razón social es obligatoria.'
  if (!f.nombreComercial.trim()) e.nombreComercial = 'El nombre comercial es obligatorio.'
  if (!f.direccionFiscal.trim()) e.direccionFiscal = 'La dirección fiscal es obligatoria.'
  if (f.email && !validarEmail(f.email)) e.email = 'El correo no es válido.'
  errores.value = e
  return Object.keys(e).length === 0
}

async function guardar() {
  if (!form.value || !validar()) return
  guardando.value = true
  try {
    const guardada = await empresaService.guardar(form.value)
    original.value = guardada
    form.value = structuredClone(guardada)
    ui.exito('Datos de la empresa guardados.')
  } catch (e) {
    const err = e as ApiError
    errores.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudieron guardar los datos.')
  } finally {
    guardando.value = false
  }
}

function descartar() {
  form.value = structuredClone(original.value)
  errores.value = {}
}

/** Solo dígitos en el RUC: se filtra al escribir para no pelear con el usuario después. */
function soloDigitos(valor: string | number | undefined) {
  if (form.value)
    form.value.ruc = String(valor ?? '')
      .replace(/\D/g, '')
      .slice(0, 11)
}
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-6">
    <KmCard v-if="cargando" titulo="Empresa"><KmEstado tipo="cargando" compacto /></KmCard>

    <KmCard v-else-if="errorCarga" titulo="Empresa">
      <KmEstado tipo="error" :mensaje="errorCarga">
        <KmButton variante="secundario" tamano="sm" @click="cargar">Reintentar</KmButton>
      </KmEstado>
    </KmCard>

    <form v-else-if="form" class="flex flex-col gap-6" novalidate @submit.prevent="guardar">
      <KmCard
        titulo="Datos tributarios"
        subtitulo="Aparecen en boletas, facturas y en la cabecera de los reportes."
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id, invalido }" label="RUC" requerido :error="errores.ruc">
            <KmInput
              :id="id"
              :model-value="form.ruc"
              inputmode="numeric"
              autocomplete="off"
              placeholder="20XXXXXXXXX"
              :invalido="invalido"
              @update:model-value="soloDigitos"
            />
            <p
              v-if="estadoRuc && !errores.ruc"
              class="text-xs"
              :class="estadoRuc.ok ? 'text-verde' : 'text-tenue'"
            >
              {{ estadoRuc.texto }}
            </p>
          </KmField>

          <KmField
            v-slot="{ id, invalido }"
            label="Razón social"
            requerido
            :error="errores.razonSocial"
          >
            <KmInput :id="id" v-model="form.razonSocial" :invalido="invalido" />
          </KmField>

          <KmField
            v-slot="{ id, invalido }"
            label="Nombre comercial"
            requerido
            ayuda="El que ven tus clientes en la carta y el ticket."
            :error="errores.nombreComercial"
          >
            <KmInput :id="id" v-model="form.nombreComercial" :invalido="invalido" />
          </KmField>

          <KmField
            v-slot="{ id, invalido }"
            label="Dirección fiscal"
            requerido
            :error="errores.direccionFiscal"
          >
            <KmInput :id="id" v-model="form.direccionFiscal" :invalido="invalido" />
          </KmField>
        </div>
      </KmCard>

      <KmCard titulo="Contacto y marca">
        <div class="grid gap-6 sm:grid-cols-2">
          <div class="flex flex-col gap-4">
            <KmField v-slot="{ id }" label="Teléfono">
              <KmInput :id="id" v-model="form.telefono" type="tel" autocomplete="tel" />
            </KmField>
            <KmField
              v-slot="{ id, invalido }"
              label="Correo de facturación"
              ayuda="Recibe copias de los comprobantes emitidos."
              :error="errores.email"
            >
              <KmInput :id="id" v-model="form.email" type="email" :invalido="invalido" />
            </KmField>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-tinta">Logo</span>
            <KmUploadImagen
              v-model="form.logo"
              etiqueta="Logo"
              :lado-maximo="512"
              @error="ui.error"
            />
          </div>
        </div>
      </KmCard>

      <KmCard titulo="Regional" subtitulo="Fijado para operar en Perú.">
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt class="rs-etiqueta text-tenue">Moneda</dt>
            <dd class="mt-1 text-tinta">Sol peruano (PEN · S/)</dd>
          </div>
          <div>
            <dt class="rs-etiqueta text-tenue">Zona horaria</dt>
            <dd class="mt-1 text-tinta">Lima (UTC−5)</dd>
          </div>
        </dl>
      </KmCard>

      <!-- Barra de guardado fija: siempre a mano en un formulario largo. -->
      <div
        class="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 rounded-card border border-linea bg-panel px-4 py-3"
        style="box-shadow: var(--rs-sombra-flotante)"
      >
        <p class="mr-auto text-sm text-tenue">
          {{ cambios ? 'Tienes cambios sin guardar.' : 'Todo guardado.' }}
        </p>
        <KmButton variante="secundario" :disabled="!cambios || guardando" @click="descartar">
          Descartar
        </KmButton>
        <KmButton type="submit" :disabled="!cambios" :cargando="guardando"
          >Guardar cambios</KmButton
        >
      </div>
    </form>
  </div>
</template>
