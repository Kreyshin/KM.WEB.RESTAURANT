<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Tamaño máximo aceptado, en KB. */
    maxKb?: number
    /** Lado mayor al que se reduce la imagen antes de guardarla, en px. */
    ladoMaximo?: number
    etiqueta?: string
  }>(),
  { maxKb: 5000, ladoMaximo: 800, etiqueta: 'Imagen' },
)

/**
 * Data URL de la imagen. En mock se guarda tal cual; con backend, el servicio
 * la subirá y la sustituirá por la URL definitiva.
 */
const imagen = defineModel<string | undefined>()
const emit = defineEmits<{ error: [mensaje: string] }>()

const entrada = ref<HTMLInputElement | null>(null)
const arrastrando = ref(false)
const procesando = ref(false)

/** Reduce y recomprime en el navegador: una foto de móvil pasa de ~4 MB a ~80 KB. */
function reducir(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, props.ladoMaximo / Math.max(img.width, img.height))
      const lienzo = document.createElement('canvas')
      lienzo.width = Math.round(img.width * escala)
      lienzo.height = Math.round(img.height * escala)
      lienzo.getContext('2d')?.drawImage(img, 0, 0, lienzo.width, lienzo.height)
      URL.revokeObjectURL(url)
      resolve(lienzo.toDataURL('image/webp', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('imagen ilegible'))
    }
    img.src = url
  })
}

async function procesar(archivo?: File) {
  if (!archivo) return
  if (!archivo.type.startsWith('image/')) {
    emit('error', 'El archivo no es una imagen. Usa JPG, PNG o WebP.')
    return
  }
  if (archivo.size > props.maxKb * 1024) {
    emit('error', `La imagen pesa más de ${Math.round(props.maxKb / 1000)} MB.`)
    return
  }
  procesando.value = true
  try {
    imagen.value = await reducir(archivo)
  } catch {
    emit('error', 'No se pudo leer la imagen. Prueba con otro archivo.')
  } finally {
    procesando.value = false
    if (entrada.value) entrada.value.value = ''
  }
}

function alSoltar(evento: DragEvent) {
  arrastrando.value = false
  procesar(evento.dataTransfer?.files[0])
}
</script>

<template>
  <div class="flex items-center gap-4">
    <button
      type="button"
      class="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-card border-2 border-dashed transition-colors"
      :class="
        arrastrando
          ? 'border-laton bg-seleccion'
          : imagen
            ? 'border-transparent'
            : 'border-linea bg-panel-2 hover:border-verde'
      "
      :aria-label="imagen ? `Cambiar ${etiqueta.toLowerCase()}` : `Subir ${etiqueta.toLowerCase()}`"
      @click="entrada?.click()"
      @dragover.prevent="arrastrando = true"
      @dragleave="arrastrando = false"
      @drop.prevent="alSoltar"
    >
      <img v-if="imagen" :src="imagen" alt="" class="size-full object-cover" />
      <span v-else class="flex flex-col items-center gap-1 px-2 text-xs text-tenue">
        <svg
          class="size-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 16l4.6-4.6a2 2 0 0 1 2.8 0L16 16m-2-2 1.6-1.6a2 2 0 0 1 2.8 0L20 14M14 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
          />
        </svg>
        {{ procesando ? 'Procesando…' : 'Arrastra o elige' }}
      </span>
    </button>

    <div class="flex flex-col gap-1.5 text-xs text-tenue">
      <p>JPG, PNG o WebP. Se reduce a {{ ladoMaximo }} px automáticamente.</p>
      <div class="flex gap-3">
        <button
          type="button"
          class="font-semibold text-verde hover:underline"
          @click="entrada?.click()"
        >
          {{ imagen ? 'Cambiar' : 'Elegir archivo' }}
        </button>
        <button
          v-if="imagen"
          type="button"
          class="font-semibold text-vino hover:underline"
          @click="imagen = undefined"
        >
          Quitar
        </button>
      </div>
    </div>

    <input
      ref="entrada"
      type="file"
      accept="image/*"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="procesar(($event.target as HTMLInputElement).files?.[0])"
    />
  </div>
</template>
