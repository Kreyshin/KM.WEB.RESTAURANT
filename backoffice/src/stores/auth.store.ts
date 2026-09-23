import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Rol, Usuario } from '@/types'
import { authService } from '@/services/auth.service'
import { setToken } from '@/services/http'

const CLAVE_SESION = 'km.restaurante.sesion'

export const useAuthStore = defineStore('auth', () => {
  const usuario = ref<Usuario | null>(null)
  const token = ref<string | null>(null)
  const cargando = ref(false)

  const autenticado = computed(() => !!token.value && !!usuario.value)
  const rol = computed<Rol | null>(() => usuario.value?.rol ?? null)

  /** ¿El usuario actual tiene alguno de estos roles? Sin lista, basta con estar logueado. */
  function puede(roles?: Rol[]) {
    if (!autenticado.value) return false
    if (!roles || roles.length === 0) return true
    return !!rol.value && roles.includes(rol.value)
  }

  /** Rehidrata la sesión guardada al arrancar la app. */
  function restaurar() {
    try {
      const crudo = localStorage.getItem(CLAVE_SESION)
      if (!crudo) return
      const sesion = JSON.parse(crudo)
      usuario.value = sesion.usuario
      token.value = sesion.token
      setToken(sesion.token)
    } catch {
      localStorage.removeItem(CLAVE_SESION)
    }
  }

  async function login(email: string, password: string) {
    cargando.value = true
    try {
      const sesion = await authService.login(email, password)
      usuario.value = sesion.usuario
      token.value = sesion.token
      setToken(sesion.token)
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
      return sesion
    } finally {
      cargando.value = false
    }
  }

  async function logout() {
    await authService.logout()
    usuario.value = null
    token.value = null
    setToken(null)
    localStorage.removeItem(CLAVE_SESION)
  }

  return { usuario, token, cargando, autenticado, rol, puede, restaurar, login, logout }
})
