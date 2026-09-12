/**
 * Punto único de salida HTTP.
 *
 * Hoy no se usa (los servicios devuelven mocks), pero está listo para cuando
 * exista el API Gateway: basta con que cada servicio cambie su implementación
 * mock por una llamada a `http.get/post/...`.
 */

import type { ApiError } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

let tokenActual: string | null = null

export function setToken(token: string | null) {
  tokenActual = token
}

async function request<T>(metodo: string, ruta: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(tokenActual ? { Authorization: `Bearer ${tokenActual}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({ mensaje: `Error ${res.status}` }))
    throw error
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const http = {
  get: <T>(ruta: string) => request<T>('GET', ruta),
  post: <T>(ruta: string, body?: unknown) => request<T>('POST', ruta, body),
  put: <T>(ruta: string, body?: unknown) => request<T>('PUT', ruta, body),
  patch: <T>(ruta: string, body?: unknown) => request<T>('PATCH', ruta, body),
  delete: <T>(ruta: string) => request<T>('DELETE', ruta),
}
