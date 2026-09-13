<script setup lang="ts">
import EditorHorario from './EditorHorario.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { localesService } from '@/services/locales.service'
import { dependenciasService } from '@/services/dependencias.service'
import { useLocalStore } from '@/stores/local.store'
import type { DiaSemana, HorarioDia, Local, NuevoLocal } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { etiquetaDia } from '@/utils/configuracion'
import { validarHorario } from '@/utils/validaciones'

const localStore = useLocalStore()

const columnas: ColumnaTabla[] = [
  { clave: 'codigoEstablecimiento', etiqueta: 'Código', clase: 'w-24', ordenable: true },
  { clave: 'nombre', etiqueta: 'Local', ordenable: true },
  { clave: 'horario', etiqueta: 'Horario' },
]

function nuevo(): NuevoLocal {
  return {
    nombre: '',
    direccion: '',
    distrito: '',
    telefono: '',
    codigoEstablecimiento: '',
    horario: ([0, 1, 2, 3, 4, 5, 6] as DiaSemana[]).map((dia) => ({
      dia,
      abierto: true,
      apertura: '12:00',
      cierre: '23:00',
    })),
    activo: true,
  }
}

function validar(l: NuevoLocal) {
  const e: Record<string, string> = {}
  if (!l.nombre.trim()) e.nombre = 'El nombre es obligatorio.'
  if (!l.direccion.trim()) e.direccion = 'La dirección es obligatoria.'
  if (!l.distrito.trim()) e.distrito = 'El distrito es obligatorio.'
  if (!/^\d{4}$/.test(l.codigoEstablecimiento)) {
    e.codigoEstablecimiento = 'Usa 4 dígitos, p. ej. 0001.'
  }
  if (Object.keys(validarHorario(l.horario)).length) e.horario = 'Revisa el horario.'
  return e
}

/** Resumen corto del horario: «Lun–Dom 12:00–23:00» o «Abre 5 días». */
function resumenHorario(horario: HorarioDia[]) {
  const abiertos = horario.filter((d) => d.abierto)
  if (!abiertos.length) return 'Cerrado toda la semana'
  const mismoTurno = abiertos.every(
    (d) => d.apertura === abiertos[0]!.apertura && d.cierre === abiertos[0]!.cierre,
  )
  const turno = `${abiertos[0]!.apertura}–${abiertos[0]!.cierre}`
  if (abiertos.length === 7 && mismoTurno) return `Todos los días · ${turno}`
  const cerrados = horario.filter((d) => !d.abierto).map((d) => etiquetaDia[d.dia].slice(0, 3))
  return mismoTurno
    ? `${turno} · cierra ${cerrados.join(', ')}`
    : `Abre ${abiertos.length} días con turnos distintos`
}

/** El selector de local de la cabecera debe reflejar altas, bajas y renombres. */
function alCambiar() {
  localStore.cargar()
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6">
    <KmCatalogo
      titulo="Locales"
      subtitulo="Sucursales del negocio, su horario y su código de establecimiento ante SUNAT."
      entidad="local"
      :servicio="localesService"
      :consecuencias-estado="dependenciasService.local"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(l: Local) => l.nombre"
      :orden="{ campo: 'codigoEstablecimiento', direccion: 'asc' }"
      :exportacion="[
        { etiqueta: 'Código', valor: (l: Local) => l.codigoEstablecimiento },
        { etiqueta: 'Local', valor: (l: Local) => l.nombre },
        { etiqueta: 'Dirección', valor: (l: Local) => l.direccion },
        { etiqueta: 'Distrito', valor: (l: Local) => l.distrito },
        { etiqueta: 'Teléfono', valor: (l: Local) => l.telefono },
        { etiqueta: 'Horario', valor: (l: Local) => resumenHorario(l.horario) },
        { etiqueta: 'Activo', valor: (l: Local) => l.activo },
      ]"
      archivo="locales"
      ancho-drawer="lg"
      @cambio="alCambiar"
    >
      <template #col-codigoEstablecimiento="{ fila }">
        <span class="font-mono text-xs text-tenue">{{ fila.codigoEstablecimiento }}</span>
      </template>

      <template #col-nombre="{ fila }">
        <p class="font-medium text-tinta">{{ fila.nombre }}</p>
        <p class="text-xs text-tenue">{{ fila.direccion }} · {{ fila.distrito }}</p>
      </template>

      <template #col-horario="{ fila }">
        <span class="text-sm text-tenue">{{ resumenHorario(fila.horario) }}</span>
      </template>

      <template #formulario="{ borrador, errores }">
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id, invalido }" label="Nombre" requerido :error="errores.nombre">
            <KmInput
              :id="id"
              v-model="borrador.nombre"
              placeholder="Ej. Surco"
              :invalido="invalido"
            />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Código de establecimiento"
            requerido
            ayuda="Anexo SUNAT. 0000 es el domicilio fiscal."
            :error="errores.codigoEstablecimiento"
          >
            <KmInput
              :id="id"
              v-model="borrador.codigoEstablecimiento"
              inputmode="numeric"
              placeholder="0001"
              :invalido="invalido"
            />
          </KmField>
          <KmField v-slot="{ id, invalido }" label="Dirección" requerido :error="errores.direccion">
            <KmInput :id="id" v-model="borrador.direccion" :invalido="invalido" />
          </KmField>
          <KmField v-slot="{ id, invalido }" label="Distrito" requerido :error="errores.distrito">
            <KmInput :id="id" v-model="borrador.distrito" :invalido="invalido" />
          </KmField>
          <KmField v-slot="{ id }" label="Teléfono">
            <KmInput :id="id" v-model="borrador.telefono" type="tel" />
          </KmField>
        </div>

        <EditorHorario v-model="borrador.horario" />
        <p v-if="errores.horario" class="text-xs font-medium text-vino">{{ errores.horario }}</p>
      </template>
    </KmCatalogo>
  </div>
</template>
