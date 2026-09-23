<script setup lang="ts">
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { useAcceso } from '@/composables/useAcceso'

/**
 * Campos de acceso. Es la única pieza que habla con el store de sesión: las
 * variantes de la pantalla la envuelven y solo deciden qué hay alrededor.
 */
withDefaults(
  defineProps<{
    /** Texto del botón. «Entrar» en la portada, «Abrir el servicio» en las demás. */
    accion?: string
    /** Sobre fondo oscuro los textos de apoyo se aclaran. */
    sobreOscuro?: boolean
  }>(),
  { accion: 'Entrar', sobreOscuro: false },
)

const { email, password, errores, errorGeneral, enviar, auth, cuentasDemo } = useAcceso()
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="enviar">
    <KmField v-slot="{ id, invalido }" label="Correo" :error="errores.email" requerido>
      <KmInput
        :id="id"
        v-model="email"
        type="email"
        autocomplete="username"
        placeholder="tucorreo@restaurante.pe"
        :invalido="invalido"
      />
    </KmField>

    <KmField v-slot="{ id, invalido }" label="Contraseña" :error="errores.password" requerido>
      <KmInput
        :id="id"
        v-model="password"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••"
        :invalido="invalido"
      />
    </KmField>

    <p
      v-if="errorGeneral"
      class="rs-tono rs-tono-coral rounded-control border px-3 py-2 text-sm font-medium"
    >
      {{ errorGeneral }}
    </p>

    <!-- `data-testid`: el texto del botón cambia con la variante, el gancho no. -->
    <KmButton
      type="submit"
      tamano="lg"
      bloque
      data-testid="acceso-enviar"
      :cargando="auth.cargando"
    >
      {{ accion }}
    </KmButton>

    <!--
      Las cuentas de prueba son parte del producto mientras no haya backend:
      cambiar de rol es la forma de ver cómo cambia el sistema.
    -->
    <div class="mt-1">
      <p class="rs-etiqueta mb-2" :class="sobreOscuro ? 'text-white/55' : 'text-tenue'">
        Cuentas de prueba · cualquier contraseña
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="c in cuentasDemo"
          :key="c.email"
          type="button"
          class="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
          :class="
            email === c.email
              ? 'border-transparent bg-accion text-white'
              : sobreOscuro
                ? 'border-white/20 text-white/70 hover:border-white/50 hover:text-white'
                : 'border-linea text-tenue hover:border-verde hover:text-verde'
          "
          @click="email = c.email"
        >
          {{ c.rol }}
        </button>
      </div>
    </div>
  </form>
</template>
