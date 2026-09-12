<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaMesa from '@/components/marca/MarcaMesa.vue'
import { marca } from '@/config/marca'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError } from '@/types'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const email = ref('admin@kmrestaurante.pe')
const password = ref('demo')
const errores = ref<Record<string, string>>({})
const errorGeneral = ref('')

async function enviar() {
  errores.value = {}
  errorGeneral.value = ''

  if (!email.value.trim()) {
    errores.value.email = 'Ingresa tu correo.'
    return
  }
  if (!password.value) {
    errores.value.password = 'Ingresa tu contraseña.'
    return
  }

  try {
    const sesion = await auth.login(email.value, password.value)
    ui.exito(`Bienvenido, ${sesion.usuario.nombre.split(' ')[0]}.`)
    const destino = (route.query.redirect as string) || '/dashboard'
    router.push(destino)
  } catch (e) {
    const err = e as ApiError
    errorGeneral.value = err.mensaje ?? 'No se pudo iniciar sesión.'
    errores.value = err.campos ?? {}
  }
}

/** Accesos rápidos para probar las guardas por rol sin backend. */
const cuentasDemo = [
  { email: 'admin@kmrestaurante.pe', rol: 'Administrador' },
  { email: 'ana@kmrestaurante.pe', rol: 'Cajero' },
  { email: 'lucia@kmrestaurante.pe', rol: 'Mesero' },
]
</script>

<template>
  <div class="grid h-full lg:grid-cols-[1.05fr_1fr]">
    <!--
      Portada: verde comedor con un halo de latón. Sobria, sin fotografía, con
      el peso puesto en la tipografía —el registro de una carta bien impresa.
    -->
    <div class="relative hidden flex-col justify-between overflow-hidden p-14 lg:flex">
      <div class="absolute inset-0 bg-verde-900" />
      <div
        class="absolute top-[-18rem] right-[-14rem] size-[42rem] rounded-full opacity-30 blur-3xl"
        style="background: radial-gradient(circle, #c9a227 0%, transparent 65%)"
      />
      <div
        class="absolute bottom-[-16rem] left-[-12rem] size-[36rem] rounded-full opacity-40 blur-3xl"
        style="background: radial-gradient(circle, #228764 0%, transparent 70%)"
      />

      <!-- Filigrana del isotipo, a gran escala y muy tenue. -->
      <svg
        class="pointer-events-none absolute right-[-6rem] bottom-[-4rem] size-[32rem] opacity-[0.06]"
        viewBox="0 0 44 44"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="22" cy="19.5" r="10" stroke="#fff" stroke-width="0.5" />
        <circle cx="22" cy="19.5" r="4.4" fill="#fff" />
        <path d="M11 34h22" stroke="#fff" stroke-width="0.5" />
      </svg>

      <div class="relative flex items-center gap-3.5">
        <MarcaMesa :tamano="46" />
        <div>
          <p class="rs-display text-xl leading-none font-semibold text-[#f0efe9]">
            {{ marca.nombre }}
          </p>
          <p class="rs-etiqueta mt-1.5 text-[#c9a227]">{{ marca.descriptor }}</p>
        </div>
      </div>

      <div class="relative">
        <h1 class="rs-display max-w-lg text-[3.4rem] leading-[1.05] font-semibold text-[#f7f5ef]">
          {{ marca.lema }}
        </h1>

        <div class="rs-filete mt-8 max-w-md" role="presentation" />

        <ul class="mt-7 flex max-w-md flex-col gap-3.5">
          <li
            v-for="c in marca.capacidades"
            :key="c"
            class="flex items-start gap-3 text-sm text-[#c8d5ce]"
          >
            <span class="mt-[7px] size-1 shrink-0 rounded-full bg-[#c9a227]" aria-hidden="true" />
            {{ c }}
          </li>
        </ul>
      </div>

      <!-- La pertenencia a la plataforma se mantiene explícita. -->
      <div class="relative flex items-center gap-2.5">
        <KarmaLogo :tamano="20" />
        <p class="text-xs text-[#8fa89c]">{{ marca.plataforma }}</p>
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

        <form class="mt-9 flex flex-col gap-4" @submit.prevent="enviar">
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
            class="rs-tono rs-tono-vino rounded-control border px-3 py-2 text-sm font-medium"
          >
            {{ errorGeneral }}
          </p>

          <KmButton type="submit" tamano="lg" bloque :cargando="auth.cargando">Entrar</KmButton>
        </form>

        <div class="mt-9 rounded-card border border-linea bg-panel-2 p-4">
          <p class="rs-etiqueta mb-2.5 text-tenue">Cuentas de prueba · cualquier contraseña</p>
          <ul class="flex flex-col gap-0.5">
            <li v-for="c in cuentasDemo" :key="c.email">
              <button
                type="button"
                class="w-full rounded-control px-2 py-1.5 text-left text-xs text-tenue transition-colors hover:bg-seleccion hover:text-tinta"
                @click="email = c.email"
              >
                <span class="font-mono">{{ c.email }}</span>
                <span class="opacity-70"> · {{ c.rol }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
