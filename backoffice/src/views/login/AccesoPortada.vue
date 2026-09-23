<script setup lang="ts">
import FormularioAcceso from '@/components/acceso/FormularioAcceso.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaMesa from '@/components/marca/MarcaMesa.vue'
import { marca } from '@/config/marca'

/**
 * Variante «Portada»: la de siempre. Mitad manifiesto, mitad formulario.
 *
 * Es la más sobria de las tres y la que mejor funciona cuando la pantalla se
 * usa para presentar el producto a alguien que no lo conoce.
 */
</script>

<template>
  <div class="grid h-full lg:grid-cols-[1.05fr_1fr]">
    <!--
      Portada: carbón con halos naranja y plata. Sobria, sin fotografía, con el
      peso puesto en la tipografía y en la llama de la vertical.
    -->
    <div class="relative hidden flex-col justify-between overflow-hidden p-14 lg:flex">
      <div class="absolute inset-0 bg-[#0d1014]" />
      <div
        class="absolute top-[-18rem] right-[-14rem] size-[42rem] rounded-full opacity-30 blur-3xl"
        style="background: radial-gradient(circle, #f36b25 0%, transparent 65%)"
      />
      <div
        class="absolute bottom-[-16rem] left-[-12rem] size-[36rem] rounded-full opacity-40 blur-3xl"
        style="background: radial-gradient(circle, #737c89 0%, transparent 70%)"
      />

      <!-- Filigrana de la llama, a gran escala y muy tenue. -->
      <MarcaMesa
        :tamano="500"
        class="pointer-events-none absolute right-[-7rem] bottom-[-5rem] opacity-[0.055] grayscale"
        aria-hidden="true"
      />

      <div class="relative flex items-center gap-3.5">
        <MarcaMesa :tamano="46" />
        <div>
          <p class="rs-display text-xl leading-none font-semibold text-[#f8f9fb]">
            {{ marca.nombre }}
          </p>
          <p class="rs-etiqueta mt-1.5 text-[#ff9145]">{{ marca.descriptor }}</p>
        </div>
      </div>

      <div class="relative">
        <h1 class="rs-display max-w-lg text-[3.4rem] leading-[1.05] font-semibold text-[#f8f9fb]">
          {{ marca.lema }}
        </h1>

        <div class="rs-filete mt-8 max-w-md" role="presentation" />

        <ul class="mt-7 flex max-w-md flex-col gap-3.5">
          <li
            v-for="c in marca.capacidades"
            :key="c"
            class="flex items-start gap-3 text-sm text-[#c5cad2]"
          >
            <span class="mt-[7px] size-1 shrink-0 rounded-full bg-[#f36b25]" aria-hidden="true" />
            {{ c }}
          </li>
        </ul>
      </div>

      <!-- La pertenencia a la plataforma se mantiene explícita. -->
      <div class="relative flex items-center gap-2.5">
        <KarmaLogo :tamano="20" />
        <p class="text-xs text-[#929aa6]">{{ marca.plataforma }}</p>
      </div>
    </div>

    <!-- Formulario -->
    <div class="flex items-center justify-center bg-panel p-6">
      <div class="w-full max-w-sm">
        <div class="mb-10 flex items-center gap-3 lg:hidden">
          <MarcaMesa :tamano="42" />
          <div>
            <p class="rs-display text-lg leading-none font-semibold text-tinta">
              {{ marca.nombre }}
            </p>
            <p class="rs-etiqueta mt-1.5 text-laton-texto">{{ marca.descriptor }}</p>
          </div>
        </div>

        <h2 class="rs-titulo-pagina text-tinta">Iniciar sesión</h2>
        <p class="mt-2 text-sm text-tenue">Ingresa con tu cuenta del restaurante.</p>

        <div class="mt-9">
          <FormularioAcceso />
        </div>
      </div>
    </div>
  </div>
</template>
