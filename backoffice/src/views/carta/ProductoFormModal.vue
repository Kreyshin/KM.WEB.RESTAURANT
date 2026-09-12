<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import type { Alergeno, ApiError, Categoria, NuevoProducto, Producto } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { alergenos, etiquetaAlergeno, formatearSoles } from '@/utils/formato'

const props = defineProps<{
  /** Producto a editar; `null` significa "crear nuevo". */
  producto: Producto | null
  categorias: Categoria[]
  categoriaPorDefecto?: string
}>()

const abierto = defineModel<boolean>({ required: true })
const emit = defineEmits<{ guardado: [datos: NuevoProducto, id?: string] }>()

const vacio = (): NuevoProducto => ({
  categoriaId: props.categoriaPorDefecto ?? props.categorias[0]?.id ?? '',
  nombre: '',
  descripcion: '',
  precio: 0,
  disponible: true,
  tiempoPreparacionMin: 10,
  alergenos: [],
  variantes: [],
  gruposModificadores: [],
})

const form = ref<NuevoProducto>(vacio())
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

watch(abierto, (esta) => {
  if (!esta) return
  errores.value = {}
  guardando.value = false
  // structuredClone evita editar en vivo el objeto de la tabla.
  form.value = props.producto ? structuredClone({ ...props.producto }) : vacio()
})

const opcionesCategoria = computed<OpcionSelect[]>(() =>
  props.categorias.map((c) => ({
    valor: c.id,
    etiqueta: c.activa ? c.nombre : `${c.nombre} (oculta)`,
  })),
)

/** Un contador local basta para dar ids únicos a filas nuevas del formulario. */
let contador = 0
const idLocal = (prefijo: string) => `${prefijo}-nuevo-${++contador}`

function alternarAlergeno(a: Alergeno) {
  const lista = form.value.alergenos
  const i = lista.indexOf(a)
  if (i === -1) lista.push(a)
  else lista.splice(i, 1)
}

// ── Variantes ───────────────────────────────────────────────────────────────

function agregarVariante() {
  form.value.variantes.push({
    id: idLocal('v'),
    nombre: '',
    precio: Number(form.value.precio) || 0,
    activa: true,
  })
}

function quitarVariante(indice: number) {
  form.value.variantes.splice(indice, 1)
}

// ── Grupos de modificadores ─────────────────────────────────────────────────

function agregarGrupo() {
  form.value.gruposModificadores.push({
    id: idLocal('g'),
    nombre: '',
    seleccionMinima: 0,
    seleccionMaxima: 1,
    modificadores: [],
  })
}

function quitarGrupo(indice: number) {
  form.value.gruposModificadores.splice(indice, 1)
}

function agregarModificador(indiceGrupo: number) {
  form.value.gruposModificadores[indiceGrupo].modificadores.push({
    id: idLocal('mo'),
    nombre: '',
    recargo: 0,
    activo: true,
  })
}

function quitarModificador(indiceGrupo: number, indice: number) {
  form.value.gruposModificadores[indiceGrupo].modificadores.splice(indice, 1)
}

/** Texto que explica la regla del grupo en lenguaje de sala. */
function reglaGrupo(min: number, max: number) {
  const m = Number(min)
  const M = Number(max)
  if (m >= 1 && M === 1) return 'El mesero debe elegir exactamente una opción.'
  if (m >= 1) return `El mesero debe elegir entre ${m} y ${M} opciones.`
  if (M === 1) return 'El mesero puede elegir una opción, o ninguna.'
  return `El mesero puede elegir hasta ${M} opciones, o ninguna.`
}

// ── Envío ───────────────────────────────────────────────────────────────────

function validar() {
  errores.value = {}
  const f = form.value

  if (!f.nombre.trim()) errores.value.nombre = 'El nombre es obligatorio.'
  if (!f.categoriaId) errores.value.categoriaId = 'Selecciona una categoría.'

  const precio = Number(f.precio)
  if (!Number.isFinite(precio) || precio < 0) {
    errores.value.precio = 'El precio debe ser un número mayor o igual a cero.'
  }

  if (f.variantes.some((v) => !v.nombre.trim())) {
    errores.value.variantes = 'Cada presentación necesita un nombre.'
  } else if (f.variantes.some((v) => !Number.isFinite(Number(v.precio)) || Number(v.precio) < 0)) {
    errores.value.variantes = 'Revisa los precios de las presentaciones.'
  }

  for (const g of f.gruposModificadores) {
    if (!g.nombre.trim()) {
      errores.value.grupos = 'Cada grupo de opciones necesita un nombre.'
      break
    }
    if (g.modificadores.length === 0) {
      errores.value.grupos = `El grupo «${g.nombre}» no tiene ninguna opción.`
      break
    }
    if (g.modificadores.some((m) => !m.nombre.trim())) {
      errores.value.grupos = `Hay opciones sin nombre en «${g.nombre}».`
      break
    }
    if (Number(g.seleccionMinima) > Number(g.seleccionMaxima)) {
      errores.value.grupos = `En «${g.nombre}» el mínimo no puede superar al máximo.`
      break
    }
    if (Number(g.seleccionMaxima) > g.modificadores.length) {
      errores.value.grupos = `En «${g.nombre}» el máximo supera el número de opciones.`
      break
    }
  }

  return Object.keys(errores.value).length === 0
}

function enviar() {
  if (!validar()) return
  guardando.value = true
  try {
    const f = form.value
    emit(
      'guardado',
      {
        ...f,
        precio: Number(f.precio),
        tiempoPreparacionMin: f.tiempoPreparacionMin ? Number(f.tiempoPreparacionMin) : undefined,
        variantes: f.variantes.map((v) => ({ ...v, precio: Number(v.precio) })),
        gruposModificadores: f.gruposModificadores.map((g) => ({
          ...g,
          seleccionMinima: Number(g.seleccionMinima),
          seleccionMaxima: Number(g.seleccionMaxima),
          modificadores: g.modificadores.map((m) => ({ ...m, recargo: Number(m.recargo) })),
        })),
      },
      props.producto?.id,
    )
  } finally {
    guardando.value = false
  }
}

function mostrarError(e: ApiError) {
  errores.value = e.campos ?? {}
}

defineExpose({ mostrarError })
</script>

<template>
  <KmModal
    v-model="abierto"
    ancho="lg"
    :titulo="producto ? `Editar ${producto.nombre}` : 'Nuevo producto'"
  >
    <form id="form-producto" class="flex flex-col gap-7" @submit.prevent="enviar">
      <!-- Datos básicos -->
      <div class="grid gap-4 sm:grid-cols-2">
        <KmField
          v-slot="{ id, invalido }"
          class="sm:col-span-2"
          label="Nombre"
          :error="errores.nombre"
          requerido
        >
          <KmInput
            :id="id"
            v-model="form.nombre"
            placeholder="Ej. Lomo saltado"
            :invalido="invalido"
          />
        </KmField>

        <KmField v-slot="{ id }" class="sm:col-span-2" label="Descripción">
          <KmInput :id="id" v-model="form.descripcion" placeholder="Cómo se sirve el plato" />
        </KmField>

        <KmField v-slot="{ id, invalido }" label="Categoría" :error="errores.categoriaId" requerido>
          <KmSelect
            :id="id"
            v-model="form.categoriaId"
            :opciones="opcionesCategoria"
            :invalido="invalido"
          />
        </KmField>

        <KmField
          v-slot="{ id, invalido }"
          label="Precio base"
          :error="errores.precio"
          :ayuda="
            form.variantes.length ? 'Con presentaciones, manda el precio de cada una.' : 'En soles.'
          "
          requerido
        >
          <KmInput :id="id" v-model="form.precio" type="number" min="0" :invalido="invalido" />
        </KmField>

        <KmField v-slot="{ id }" label="Preparación (min)">
          <KmInput :id="id" v-model="form.tiempoPreparacionMin" type="number" min="0" />
        </KmField>

        <div class="flex items-end pb-2">
          <label class="flex items-center gap-2.5">
            <input
              v-model="form.disponible"
              type="checkbox"
              class="size-4 rounded border-linea accent-[var(--rs-accion)]"
            />
            <span class="text-sm text-tinta">Disponible hoy</span>
          </label>
        </div>
      </div>

      <!-- Alérgenos -->
      <div>
        <p class="rs-etiqueta mb-2.5 text-laton-texto">Alérgenos</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="a in alergenos"
            :key="a"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            :class="
              form.alergenos.includes(a)
                ? 'rs-tono rs-tono-laton'
                : 'border-linea text-tenue hover:border-verde hover:text-tinta'
            "
            :aria-pressed="form.alergenos.includes(a)"
            @click="alternarAlergeno(a)"
          >
            {{ etiquetaAlergeno[a] }}
          </button>
        </div>
      </div>

      <!-- Presentaciones -->
      <div>
        <div class="mb-2.5 flex items-center justify-between gap-3">
          <div>
            <p class="rs-etiqueta text-laton-texto">Presentaciones</p>
            <p class="mt-1 text-xs text-tenue">
              Personal, fuente, jarra... Cada una lleva su propio precio final.
            </p>
          </div>
          <KmButton variante="secundario" tamano="sm" @click="agregarVariante">Añadir</KmButton>
        </div>

        <p v-if="errores.variantes" class="mb-2 text-xs font-medium text-vino">
          {{ errores.variantes }}
        </p>

        <p v-if="form.variantes.length === 0" class="text-sm text-tenue">
          Sin presentaciones: se cobra el precio base de
          {{ formatearSoles(Number(form.precio) || 0) }}.
        </p>

        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="(v, i) in form.variantes"
            :key="v.id"
            class="grid grid-cols-[1fr_110px_auto_auto] items-center gap-2"
          >
            <KmInput v-model="v.nombre" placeholder="Nombre" />
            <KmInput v-model="v.precio" type="number" min="0" placeholder="Precio" />
            <label class="flex items-center gap-1.5 px-1 text-xs text-tenue">
              <input
                v-model="v.activa"
                type="checkbox"
                class="size-3.5 rounded border-linea accent-[var(--rs-accion)]"
              />
              Activa
            </label>
            <KmButton variante="fantasma" tamano="sm" @click="quitarVariante(i)">
              <span class="text-vino">Quitar</span>
            </KmButton>
          </li>
        </ul>
      </div>

      <!-- Grupos de opciones -->
      <div>
        <div class="mb-2.5 flex items-center justify-between gap-3">
          <div>
            <p class="rs-etiqueta text-laton-texto">Grupos de opciones</p>
            <p class="mt-1 text-xs text-tenue">
              Término, extras, nivel de ají... Es lo que el mesero marca al tomar la comanda.
            </p>
          </div>
          <KmButton variante="secundario" tamano="sm" @click="agregarGrupo">Añadir grupo</KmButton>
        </div>

        <p v-if="errores.grupos" class="mb-2 text-xs font-medium text-vino">{{ errores.grupos }}</p>

        <p v-if="form.gruposModificadores.length === 0" class="text-sm text-tenue">
          Sin grupos de opciones.
        </p>

        <ul v-else class="flex flex-col gap-4">
          <li
            v-for="(g, ig) in form.gruposModificadores"
            :key="g.id"
            class="rounded-card border border-linea bg-panel-2 p-4"
          >
            <div class="grid grid-cols-[1fr_84px_84px_auto] items-center gap-2">
              <KmInput v-model="g.nombre" placeholder="Nombre del grupo" />
              <KmInput v-model="g.seleccionMinima" type="number" min="0" placeholder="Mín." />
              <KmInput v-model="g.seleccionMaxima" type="number" min="1" placeholder="Máx." />
              <KmButton variante="fantasma" tamano="sm" @click="quitarGrupo(ig)">
                <span class="text-vino">Quitar</span>
              </KmButton>
            </div>

            <p class="mt-2 text-xs text-tenue">
              {{ reglaGrupo(g.seleccionMinima, g.seleccionMaxima) }}
            </p>

            <div class="rs-filete my-3.5" role="presentation"></div>

            <ul class="flex flex-col gap-2">
              <li
                v-for="(m, im) in g.modificadores"
                :key="m.id"
                class="grid grid-cols-[1fr_110px_auto_auto] items-center gap-2"
              >
                <KmInput v-model="m.nombre" placeholder="Opción" />
                <KmInput v-model="m.recargo" type="number" min="0" placeholder="Recargo" />
                <label class="flex items-center gap-1.5 px-1 text-xs text-tenue">
                  <input
                    v-model="m.activo"
                    type="checkbox"
                    class="size-3.5 rounded border-linea accent-[var(--rs-accion)]"
                  />
                  Activa
                </label>
                <KmButton variante="fantasma" tamano="sm" @click="quitarModificador(ig, im)">
                  <span class="text-vino">Quitar</span>
                </KmButton>
              </li>
            </ul>

            <KmButton variante="fantasma" tamano="sm" class="mt-2" @click="agregarModificador(ig)">
              Añadir opción
            </KmButton>
          </li>
        </ul>
      </div>
    </form>

    <template #footer>
      <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
      <KmButton type="submit" form="form-producto" :cargando="guardando">
        {{ producto ? 'Guardar cambios' : 'Crear producto' }}
      </KmButton>
    </template>
  </KmModal>
</template>
