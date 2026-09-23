<script setup lang="ts">
/** Tarjeta de producto o combo al estilo del POS, con editar y eliminar. */
import KmBotonIcono from './KmBotonIcono.vue'

withDefaults(
  defineProps<{
    nombre: string
    precio: string
    imagen?: string
    /** Texto antes del precio, p. ej. «desde». */
    antesPrecio?: string
    detalle?: string
    /** Etiqueta pequeña sobre la imagen (tiempo, tipo…). */
    marca?: string
    /** Si se indica, la tarjeta se ve apagada con esta cinta. */
    cinta?: string
    ancha?: boolean
    eliminable?: boolean
  }>(),
  { eliminable: true },
)
defineEmits<{ editar: []; eliminar: [] }>()
</script>

<template>
  <article class="rs-tarjeta-plato group" :class="{ 'rs-apagada': cinta }">
    <button
      type="button"
      class="relative block w-full overflow-hidden bg-seleccion"
      :class="ancha ? 'aspect-[16/9]' : 'aspect-[4/3]'"
      :aria-label="`Editar ${nombre}`"
      tabindex="-1"
      @click="$emit('editar')"
    >
      <img
        v-if="imagen"
        :src="imagen"
        alt=""
        class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span v-if="cinta" class="rs-cinta">{{ cinta }}</span>
      <span
        v-if="marca"
        class="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white"
      >
        {{ marca }}
      </span>
    </button>
    <div class="flex flex-1 flex-col gap-1 p-3">
      <p class="line-clamp-2 text-sm leading-tight font-semibold text-tinta">{{ nombre }}</p>
      <p v-if="detalle" class="line-clamp-2 text-[11px] text-tenue">{{ detalle }}</p>
      <div class="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
        <p class="text-sm font-bold whitespace-nowrap text-accion tabular-nums">
          <span v-if="antesPrecio" class="text-xs font-medium text-tenue">{{ antesPrecio }} </span>
          {{ precio }}
        </p>
        <div class="flex gap-0.5">
          <KmBotonIcono
            icono="editar"
            etiqueta="Editar"
            :contexto="nombre"
            @click="$emit('editar')"
          />
          <KmBotonIcono
            v-if="eliminable"
            icono="eliminar"
            tono="peligro"
            etiqueta="Eliminar"
            :contexto="nombre"
            @click="$emit('eliminar')"
          />
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.rs-tarjeta-plato {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-linea);
  border-radius: var(--radius-card);
  background: var(--color-panel);
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s;
}
.rs-tarjeta-plato:hover {
  transform: translateY(-2px);
  border-color: var(--color-accion);
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.12);
}
.rs-apagada img {
  filter: grayscale(1);
  opacity: 0.55;
}
.rs-cinta {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  transform: translateY(-50%);
  background: color-mix(in srgb, var(--color-vino) 90%, transparent);
  padding: 4px 0;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #fff;
  text-transform: uppercase;
}
</style>
