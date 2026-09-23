import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError } from '@/types'

export interface CuentaDemo {
  email: string
  rol: string
}

/** Accesos rápidos para probar las guardas por rol sin backend. */
export const cuentasDemo: CuentaDemo[] = [
  { email: 'admin@kmrestaurante.pe', rol: 'Administrador' },
  { email: 'ana@kmrestaurante.pe', rol: 'Cajero' },
  { email: 'lucia@kmrestaurante.pe', rol: 'Mesero' },
]

/**
 * Lógica de la pantalla de acceso, compartida por sus variantes visuales.
 *
 * Las variantes cambian la puesta en escena, nunca el comportamiento: validar,
 * autenticar y redirigir ocurre aquí una sola vez.
 */
export function useAcceso() {
  const auth = useAuthStore()
  const ui = useUiStore()
  const router = useRouter()
  const route = useRoute()

  const email = ref(cuentasDemo[0]!.email)
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

  return { auth, email, password, errores, errorGeneral, enviar, cuentasDemo }
}
